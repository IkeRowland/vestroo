#!/usr/bin/env node
/**
 * Theme O / US-O2 — flag cross-table `from public.<table>` patterns inside
 * `create policy` USING / WITH CHECK clauses (inline EXISTS risk vs ADR 0006).
 *
 * Only the **terminal** definition of each `(public.<table>, <policy>)` across
 * lexicographically sorted `supabase/migrations/*.sql` is linted, so superseded
 * historical bodies (e.g. pre–K1 `service_runs_select_party`) are ignored.
 *
 * Usage:
 *   npm run lint:rls
 *   RLS_LINT_STRICT=1 npm run lint:rls   # exit 1 on violations
 *   RLS_LINT_STRICT=0 npm run lint:rls   # warn only, exit 0 (default)
 *
 * Escape hatch (reviewed in PR): line immediately above `create policy`:
 *   -- rls-lint-ok: <non-empty reason>
 *
 * @see docs/adr/0006-rls-cross-table-helpers.md
 */

import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const repoRoot = join(__dirname, '..')
const migrationsDir = join(repoRoot, 'supabase', 'migrations')

const ADR_PATH = 'docs/adr/0006-rls-cross-table-helpers.md'

const strict =
  process.env.RLS_LINT_STRICT === '1' ||
  process.env.RLS_LINT_STRICT === 'true' ||
  process.env.RLS_LINT_STRICT === 'yes'

function stripLineComments(sql) {
  return sql.replace(/--[^\n]*/g, '')
}

function stripBlockComments(sql) {
  return sql.replace(/\/\*[\s\S]*?\*\//g, ' ')
}

function findStatementEnd(sql, start) {
  let depth = 0
  let i = start
  let inSingle = false
  let inDouble = false
  while (i < sql.length) {
    const c = sql[i]
    const next = sql[i + 1]

    if (inSingle) {
      if (c === "'" && next === "'") {
        i += 2
        continue
      }
      if (c === "'") inSingle = false
      i++
      continue
    }
    if (inDouble) {
      if (c === '"' && next === '"') {
        i += 2
        continue
      }
      if (c === '"') inDouble = false
      i++
      continue
    }

    if (c === "'") {
      inSingle = true
      i++
      continue
    }
    if (c === '"') {
      inDouble = true
      i++
      continue
    }

    if (c === '(') depth++
    else if (c === ')') depth = Math.max(0, depth - 1)
    else if (c === ';' && depth === 0) return i

    i++
  }
  return sql.length
}

function extractBalanced(sql, openParenIndex) {
  let depth = 0
  let i = openParenIndex
  while (i < sql.length) {
    const c = sql[i]
    if (c === '(') depth++
    else if (c === ')') {
      depth--
      if (depth === 0) return sql.slice(openParenIndex + 1, i)
    }
    i++
  }
  return null
}

function policyKey(table, policy) {
  return `${table.toLowerCase()}\0${policy.toLowerCase()}`
}

/**
 * @returns {{ type: 'drop'|'create', pos: number, policyName: string, tableName: string, end?: number }[]}
 */
function findPolicyEvents(sql) {
  const events = []
  const lower = sql.toLowerCase()

  const dropRe = /drop\s+policy\s+(?:if\s+exists\s+)?(\w+)\s+on\s+public\.(\w+)/gi
  let dm
  while ((dm = dropRe.exec(sql)) !== null) {
    events.push({
      type: 'drop',
      pos: dm.index,
      policyName: dm[1],
      tableName: dm[2],
    })
  }

  let pos = 0
  while (pos < sql.length) {
    const idx = lower.indexOf('create policy', pos)
    if (idx === -1) break
    const prev = idx > 0 ? sql[idx - 1] : ' '
    if (/[a-z0-9_]/i.test(prev)) {
      pos = idx + 13
      continue
    }
    const stmtEnd = findStatementEnd(sql, idx)
    const chunk = sql.slice(idx, stmtEnd + 1)
    const m = chunk.match(
      /^create\s+policy\s+([a-zA-Z0-9_]+)\s+on\s+public\.([a-zA-Z0-9_]+)/i
    )
    if (!m) {
      pos = stmtEnd + 1
      continue
    }
    events.push({
      type: 'create',
      pos: idx,
      policyName: m[1],
      tableName: m[2],
      end: stmtEnd + 1,
    })
    pos = stmtEnd + 1
  }

  events.sort((a, b) => a.pos - b.pos)
  return events
}

function previousNonEmptyLine(lines, line) {
  for (let L = line - 2; L >= 0; L--) {
    const t = lines[L].trim()
    if (t.length > 0) return t
  }
  return ''
}

function findViolationsInClause(clause, policyTable) {
  const violations = []
  if (!clause) return violations
  const cleaned = stripBlockComments(stripLineComments(clause))
  const re = /\bfrom\s+public\.([a-zA-Z0-9_]+)\b/gi
  let m
  while ((m = re.exec(cleaned)) !== null) {
    const refTable = m[1].toLowerCase()
    if (refTable === policyTable.toLowerCase()) continue
    const after = cleaned.slice(m.index + m[0].length)
    const trimmedAfter = after.trimStart()
    if (trimmedAfter.startsWith('(')) continue

    const fragStart = Math.max(0, m.index - 40)
    const fragEnd = Math.min(cleaned.length, m.index + m[0].length + 40)
    const fragment = cleaned.slice(fragStart, fragEnd).replace(/\s+/g, ' ').trim()
    violations.push({ refTable, fragment })
  }
  return violations
}

function extractUsingWithCheck(policySql) {
  const lower = policySql.toLowerCase()
  const out = { using: null, withCheck: null }

  const usingIdx = lower.indexOf(' using ')
  if (usingIdx !== -1) {
    const p = policySql.indexOf('(', usingIdx)
    if (p !== -1) out.using = extractBalanced(policySql, p)
  }

  const wcIdx = lower.indexOf(' with check ')
  if (wcIdx !== -1) {
    const p = policySql.indexOf('(', wcIdx)
    if (p !== -1) out.withCheck = extractBalanced(policySql, p)
  }

  return out
}

/**
 * Apply migration files in name order; return Map key -> terminal policy record.
 */
function buildTerminalPolicies(sortedFiles) {
  /** @type {Map<string, { relPath: string, abs: string, start: number, end: number, startLine: number, policyName: string, tableName: string, sql: string }>} */
  const map = new Map()

  for (const file of sortedFiles) {
    const abs = join(migrationsDir, file)
    const sql = readFileSync(abs, 'utf8')
    const relPath = relative(repoRoot, abs).replace(/\\/g, '/')
    const events = findPolicyEvents(sql)

    for (const ev of events) {
      const key = policyKey(ev.tableName, ev.policyName)
      if (ev.type === 'drop') {
        map.delete(key)
      } else {
        const startLine = sql.slice(0, ev.pos).split(/\r?\n/).length
        map.set(key, {
          relPath,
          abs,
          start: ev.pos,
          end: ev.end,
          startLine,
          policyName: ev.policyName,
          tableName: ev.tableName,
          sql: sql.slice(ev.pos, ev.end),
          fileSql: sql,
          lines: sql.split(/\r?\n/),
        })
      }
    }
  }
  return map
}

function main() {
  let files = []
  try {
    files = readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort()
  } catch (e) {
    console.error('[lint:rls] cannot read migrations dir:', migrationsDir, e)
    process.exit(2)
  }

  const terminal = buildTerminalPolicies(files)
  const findings = []

  for (const pol of terminal.values()) {
    const prev = previousNonEmptyLine(pol.lines, pol.startLine)
    if (/^--\s*rls-lint-ok:\s*\S/i.test(prev)) continue

    const { using: usingClause, withCheck: wcClause } = extractUsingWithCheck(pol.sql)

    for (const clause of [usingClause, wcClause]) {
      if (!clause) continue
      const vs = findViolationsInClause(clause, pol.tableName)
      for (const v of vs) {
        findings.push({
          file: pol.relPath,
          line: pol.startLine,
          policy: pol.policyName,
          table: pol.tableName,
          refTable: v.refTable,
          fragment: v.fragment,
        })
      }
    }
  }

  const msg =
    'Cross-table RLS check via inline EXISTS — see ADR 0006. Use a SECURITY DEFINER helper instead.'

  for (const f of findings) {
    const line = `${f.file}:${f.line} policy=${f.policy} on public.${f.table} → from public.${f.refTable}`
    const detail = `${msg}\n  Fragment: …${f.fragment}…\n  ADR: ${ADR_PATH}`
    if (strict) {
      console.error(`[lint:rls] ERROR ${line}\n  ${detail}`)
    } else {
      console.warn(`[lint:rls] WARN ${line}\n  ${detail}`)
    }
  }

  if (findings.length > 0) {
    const summary = `[lint:rls] ${findings.length} finding(s) on terminal policy definitions. RLS_LINT_STRICT=${strict ? '1' : '0'} (${strict ? 'enforcing' : 'advisory'}).`
    if (strict) console.error(summary)
    else console.warn(summary)
    if (strict) process.exit(1)
  } else {
    console.log(
      '[lint:rls] OK — no cross-table `from public.*` in terminal policy USING/WITH CHECK bodies.'
    )
  }
}

main()
