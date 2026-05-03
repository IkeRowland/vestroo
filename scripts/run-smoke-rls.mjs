#!/usr/bin/env node
/**
 * Run supabase/smoke_rls.sql against a Postgres database (hosted Supabase or any URL).
 * No Docker required — satisfies Epic 11 / Story 11.1 AC4 verification without local supabase start.
 *
 * Usage:
 *   npm run smoke:rls
 *
 * Env (first non-empty wins):
 *   DATABASE_URL — preferred (see .env.example; use direct :5432 URL if pooler misbehaves)
 *   DIRECT_URL
 *   SUPABASE_DB_URL
 *
 * Loads .env.local then .env then .env.test from repo root (does not override existing process.env).
 *
 * Exit 0 on success; non-zero on connection or SQL failure (matches ON_ERROR_STOP intent).
 */

import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import dns from 'node:dns/promises'
import pg from 'pg'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(__dirname, '..')

function loadDotEnvFiles() {
  for (const name of ['.env.local', '.env', '.env.test']) {
    const p = join(repoRoot, name)
    if (!existsSync(p)) continue
    const text = readFileSync(p, 'utf8')
    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eq = trimmed.indexOf('=')
      if (eq === -1) continue
      const key = trimmed.slice(0, eq).trim()
      if (!key || process.env[key] !== undefined) continue
      let val = trimmed.slice(eq + 1).trim()
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1)
      }
      process.env[key] = val
    }
  }
}

function pickDatabaseUrl() {
  const u =
    process.env.DATABASE_URL ||
    process.env.DIRECT_URL ||
    process.env.SUPABASE_DB_URL ||
    ''
  return typeof u === 'string' ? u.trim() : ''
}

function sslOptionForUrl(url) {
  try {
    const { hostname, searchParams } = new URL(url)
    if (hostname.includes('supabase.co')) {
      return { rejectUnauthorized: false }
    }
    const mode = searchParams.get('sslmode')
    if (mode === 'require' || mode === 'verify-full' || mode === 'verify-ca') {
      return { rejectUnauthorized: mode !== 'require' }
    }
  } catch {
    /* ignore */
  }
  return undefined
}

/**
 * Connect to Postgres; if hostname DNS fails with ENOTFOUND (common when only AAAA
 * exists and Node's resolver returns nothing), retry using the first IPv6 address and
 * TLS SNI (servername) so Supabase certificates still validate.
 */
async function connectPgClient(connectionString) {
  const ssl = sslOptionForUrl(connectionString) || {}
  const client = new pg.Client({ connectionString, ssl })
  try {
    await client.connect()
    return client
  } catch (err) {
    await client.end().catch(() => {})
    const isEnotfound =
      err.code === 'ENOTFOUND' ||
      (err.name === 'AggregateError' &&
        err.errors?.some((e) => e.code === 'ENOTFOUND'))
    if (!isEnotfound) throw err
    let u
    try {
      u = new URL(connectionString)
    } catch {
      throw err
    }
    const host = u.hostname
    let addrs
    try {
      addrs = await dns.resolve6(host)
    } catch {
      throw err
    }
    if (!addrs.length) throw err
    u.hostname = `[${addrs[0]}]`
    const client2 = new pg.Client({
      connectionString: u.toString(),
      ssl: { ...ssl, servername: host },
    })
    await client2.connect()
    return client2
  }
}

async function main() {
  loadDotEnvFiles()
  const url = pickDatabaseUrl()
  if (!url) {
    console.error(
      '[smoke:rls] No database URL. Set DATABASE_URL (or DIRECT_URL / SUPABASE_DB_URL) in .env.local.\n' +
        '  Supabase Dashboard → Project Settings → Database → Connection string (URI), direct connection.\n' +
        '  Alternatively: paste supabase/smoke_rls.sql into the SQL Editor after migrations are applied.',
    )
    process.exit(1)
  }

  const sqlPath = join(repoRoot, 'supabase', 'smoke_rls.sql')
  if (!existsSync(sqlPath)) {
    console.error(`[smoke:rls] Missing file: ${sqlPath}`)
    process.exit(1)
  }

  const sql = readFileSync(sqlPath, 'utf8')

  console.log('[smoke:rls] Connecting and running supabase/smoke_rls.sql …')
  const client = await connectPgClient(url)

  try {
    await client.query(sql)
  } finally {
    await client.end().catch(() => {})
  }

  console.log('[smoke:rls] Finished OK (all statements succeeded).')
}

main().catch((err) => {
  console.error('[smoke:rls] FAILED:', err.message || err)
  if (err.code) console.error('[smoke:rls] code:', err.code)
  process.exit(1)
})
