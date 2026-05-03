/**
 * One-off helper for docs/ops/chauffeur-to-driver-audit.md (Story 16.5).
 * Writes UTF-8 `_chauffeur-audit-raw.tsv` (layer, path, line, match, context).
 * Run: node scripts/chauffeur-audit-collect.mjs
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const root = join(__dirname, '..')
const re = /Chauffeur|chauffeur/g
const outLines = []

const layers = [
  { name: 'UI src/app/(ops)', dir: join(root, 'src', 'app', '(ops)') },
  { name: 'UI src/features/ops', dir: join(root, 'src', 'features', 'ops') },
  { name: 'UI src/features/field', dir: join(root, 'src', 'features', 'field') },
  { name: 'UI src/components', dir: join(root, 'src', 'components') },
  { name: 'Email templates', dir: join(root, 'src', 'lib', 'email', 'templates') },
  { name: 'Server actions', dir: join(root, 'src', 'actions') },
  { name: 'Lib/helpers', dir: join(root, 'src', 'lib') },
  { name: 'Types', dir: join(root, 'src', 'types') },
  { name: 'Tests tests/', dir: join(root, 'tests') },
  { name: 'Documentation', dir: join(root, 'docs'), skipSubdir: 'capstone-reference' },
  { name: 'Migrations', dir: join(root, 'supabase', 'migrations') },
  { name: 'Capstone src/legacy/capstone-reference', dir: join(root, 'src', 'legacy', 'capstone-reference') },
  { name: 'Capstone docs/capstone-reference', dir: join(root, 'docs', 'capstone-reference') },
]

function walk(dir, acc = [], skipSubdir) {
  let st
  try {
    st = statSync(dir)
  } catch {
    return acc
  }
  if (!st.isDirectory()) return acc
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === '.next') continue
    if (skipSubdir && name === skipSubdir) continue
    const p = join(dir, name)
    const s = statSync(p)
    if (s.isDirectory()) walk(p, acc, skipSubdir)
    else if (/\.(ts|tsx|js|jsx|md|sql|json|mjs|cjs)$/i.test(name)) acc.push(p)
  }
  return acc
}

function ctx(line, col, len) {
  const start = Math.max(0, col - 1 - 5)
  const end = Math.min(line.length, col - 1 + len + 5)
  return line.slice(start, end).replace(/\s+/g, ' ').replace(/\|/g, '\\|')
}

for (const { name, dir, skipSubdir } of layers) {
  const files = walk(dir, [], skipSubdir)
  for (const abs of files) {
    const rel = relative(root, abs).replace(/\\/g, '/')
    if (rel.includes('chauffeur-audit-collect')) continue
    if (rel === 'docs/ops/chauffeur-to-driver-audit.md') continue
    if (rel.endsWith('_chauffeur-audit-raw.tsv')) continue
    const text = readFileSync(abs, 'utf8')
    const lines = text.split(/\r?\n/)
    lines.forEach((line, i) => {
      let m
      const r = new RegExp(re.source, re.flags)
      while ((m = r.exec(line)) !== null) {
        const col = m.index + 1
        const current = m[0]
        outLines.push(
          `${name}\t${rel}\t${i + 1}\t${current}\t${ctx(line, col, current.length)}`
        )
      }
    })
  }
}

writeFileSync(join(root, '_chauffeur-audit-raw.tsv'), outLines.join('\n') + '\n', 'utf8')
console.error(`[chauffeur-audit-collect] wrote ${outLines.length} rows to _chauffeur-audit-raw.tsv`)
