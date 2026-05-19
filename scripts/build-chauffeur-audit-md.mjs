/**
 * Reads _chauffeur-audit-raw.tsv (from chauffeur-audit-collect.mjs) and writes
 * docs/ops/chauffeur-to-driver-audit.md (Story 16.5).
 * Run from repo root: node scripts/build-chauffeur-audit-md.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const tsvPath = join(root, '_chauffeur-audit-raw.tsv')
const outPath = join(root, 'docs', 'ops', 'chauffeur-to-driver-audit.md')

const GIT_SHA = 'ede6927437c979d0edf7c9557f0fd6a8844906d3'

const ROLLUP_LAYERS = new Set([
  'Documentation',
  'Migrations',
  'Lib/helpers',
  'Server actions',
  'Tests tests/',
])

function parseTsv(text) {
  const rows = []
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue
    const parts = line.split('\t')
    if (parts.length < 5) continue
    rows.push({
      layer: parts[0],
      path: parts[1],
      line: parts[2],
      current: parts[3],
      context: parts.slice(4).join('\t'),
    })
  }
  return rows
}

function rollup(rows) {
  /** @type {Map<string, {layer:string,path:string,count:number,firstLine:string,current:string,context:string}>} */
  const m = new Map()
  for (const r of rows) {
    if (!ROLLUP_LAYERS.has(r.layer)) continue
    const key = `${r.layer}\t${r.path}`
    const ex = m.get(key)
    if (!ex) {
      m.set(key, {
        layer: r.layer,
        path: r.path,
        count: 1,
        firstLine: r.line,
        current: r.current,
        context: r.context,
      })
    } else {
      ex.count++
    }
  }
  return [...m.values()].sort((a, b) =>
    a.layer.localeCompare(b.layer) || a.path.localeCompare(b.path)
  )
}

function mdEscape(s) {
  return String(s)
    .replace(/\|/g, '\\|')
    .replace(/\r?\n/g, ' ')
    .slice(0, 120)
}

function classifyRow(r, layer) {
  const line = `${r.context}`.toLowerCase()
  const cap = r.path.includes('capstone-reference')
  if (cap || layer.startsWith('Capstone')) {
    return { action: 'keep — capstone reference', exc: 'capstone' }
  }
  if (layer === 'Types' || r.path.startsWith('src/types/')) {
    return { action: 'keep — DB scope deferred to Epic 17', exc: 'Q34' }
  }
  if (
    r.current === 'chauffeur' &&
    (line.includes('chauffeur_id') ||
      line.includes('chauffeur_') ||
      line.includes("role', 'chauffeur'") ||
      line.includes('chauffeur_schedules') ||
      line.includes('chauffeur_assignments') ||
      line.includes('chauffeurs') ||
      line.includes('chauffeurrows') ||
      line.includes('chauffeuroptions') ||
      line.includes('chauffeurcompliance') ||
      line.includes('chauffeurwindow') ||
      line.includes('chauffeurname') ||
      line.includes('chauffeurfull') ||
      line.includes('chauffeurtrip') ||
      line.includes('chauffeurscore') ||
      line.includes('chauffeurfamiliarity') ||
      line.includes('chauffeurassignment'))
  ) {
    return { action: 'keep — DB scope deferred to Epic 17', exc: 'Q34' }
  }
  if (r.current === 'Chauffeur' || r.current === 'Chauffeurs') {
    return { action: 'rename to driver', exc: '' }
  }
  if (layer.startsWith('UI') && r.current === 'chauffeur') {
    return { action: 'mixed — US-L3 triage (likely identifier)', exc: '' }
  }
  if (layer === 'Email templates') {
    return { action: 'rename to driver', exc: '' }
  }
  return { action: 'mixed — US-L3 triage', exc: '' }
}

function detailTable(rows, layer) {
  const sub = rows.filter((r) => r.layer === layer).sort((a, b) => a.path.localeCompare(b.path) || +a.line - +b.line)
  if (sub.length === 0) return `_(${layer}: no matches)_\n\n`
  let md =
    '| File path | Line | Context (5+5 rule) | Current text | Proposed action | Exception |\n'
  md += '|-----------|------|-------------------|----------------|-----------------|-----------|\n'
  for (const r of sub) {
    const { action, exc } = classifyRow(r, layer)
    md += `| \`${r.path}\` | ${r.line} | ${mdEscape(r.context)} | \`${mdEscape(r.current)}\` | ${action} | ${exc} |\n`
  }
  return md + '\n'
}

function rollupTable(roll) {
  let md =
    '| Layer | File path | Match count | First line | Context (first hit, 5+5) | Representative token | Proposed action | Exception |\n'
  md +=
    '|-------|-----------|-------------|------------|---------------------------|------------------------|-----------------|-----------|\n'
  for (const r of roll) {
    const isCap = r.path.includes('capstone-reference')
    const isMig = r.layer === 'Migrations'
    const isDoc = r.layer === 'Documentation'
    const isTypes = r.path.startsWith('src/types/')
    const isLib = r.layer === 'Lib/helpers'
    const isAct = r.layer === 'Server actions'
    const isTest = r.layer === 'Tests tests/'
    const action = isCap
      ? 'keep — capstone reference'
      : isMig
        ? 'keep — historical migration'
        : isTypes || r.path.includes('database.types')
          ? 'keep — DB scope deferred to Epic 17'
          : isDoc
            ? 'rename to driver (per-layer default; triage per file in US-L3)'
            : isLib || isAct || isTest
              ? 'mixed — US-L3 triage (identifiers + copy)'
              : 'rename to driver'
    const exc = isCap ? 'capstone' : isMig ? '' : isTypes ? 'Q34' : ''
    md += `| ${r.layer} | \`${r.path}\` | ${r.count} | ${r.firstLine} | ${mdEscape(r.context)} | \`${mdEscape(r.current)}\` | ${action} | ${exc} |\n`
  }
  return md + '\n'
}

const raw = readFileSync(tsvPath, 'utf8')
const rows = parseTsv(raw)
const roll = rollup(rows)

const DETAIL_LAYERS = [
  'UI src/app/(ops)',
  'UI src/features/ops',
  'UI src/features/field',
  'UI src/components',
  'Email templates',
  'Types',
  'Capstone src/legacy/capstone-reference',
  'Capstone docs/capstone-reference',
]

let body = `# Chauffeur → Driver grep audit (Theme L / US-L1)

## Sign-off and metadata

| Field | Value |
|-------|-------|
| **Date** | 2026-04-26 |
| **Commit** | \`${GIT_SHA}\` (refresh: \`git rev-parse HEAD\`) |
| **Sign-off** | **Unreviewed — draft** (PO to confirm before US-L3 execution) |
| **Context rule** | **5 characters before + 5 after** the matched token on the same line (whitespace normalized to single spaces in this table; pipes escaped). |

### Commands used (reproducible)

PowerShell / Node from repository root (Windows; \`rg\` not required):

\`\`\`text
node scripts/chauffeur-audit-collect.mjs
node scripts/build-chauffeur-audit-md.mjs
\`\`\`

Equivalent intent to epic **US-L1** \`rg -n "Chauffeur|chauffeur"\` per path layer; collector walks the same epic globs (Documentation excludes \`docs/capstone-reference/\` — covered under **Capstone** rows).

## Product locks (cite in US-L3)

- **Q21** — UI display label **Driver**; DB enum \`chauffeur\` unchanged until [Epic 17](../epic-17.md).
- **Q25** — **Retired** per **`docs/epic-16.md`**; no specialty carve-out rows expected in this audit pass.
- **Q34** — No DB-level rename in Epic 16; type definitions under src/types and schema-aligned literals → **keep — DB scope deferred to Epic 17** (or **rename to driver** only for pure UI strings in types if any appear later).
- **Q41** (optional) — [US-L2 in Epic 16 Theme L](../epic-16.md) / \`role-display.ts\` — not implemented in L1.

## Proposed action enums (from epic)

| Enum | Use |
|------|-----|
| **rename to driver** | User-visible copy, emails, docs (non-capstone), non-DB identifiers where safe in Epic 16 |
| **keep — DB scope deferred to Epic 17** | \`ProfileRole\`, column names, RPC identifiers, generated types |
| **keep — capstone reference** | \`src/legacy/capstone-reference/**\`, \`docs/capstone-reference/**\` |
| **keep — historical migration** | \`supabase/migrations/**\` — immutable |

## Next: US-L3

**US-L3 (Theme L, subsequent story)** consumes this file as SSOT for the string sweep. No \`docs/stories/16.7.story.md\` exists at audit time — use epic **US-L3** wording in planning.

---

## Layer: rollup (Documentation, Migrations, Lib/helpers, Server actions, Tests)

_Rationale (AC2): **one row per file** with **match count**; full line-level hits available by re-running the collector TSV._

${rollupTable(roll)}

---

`

for (const L of DETAIL_LAYERS) {
  body += `## Layer: ${L}\n\n`
  body += detailTable(rows, L)
}

body += `## Layer: Tests (src/**/__tests__**)\n\n`
body += `_Included under **Lib/helpers** and **Server actions** walks (\`src/lib\`, \`src/actions\`, \`src/features/**/__tests__\`). Re-run collector with an additional walk if a standalone **Tests — src __tests__** table is required._\n\n`

body += `## References\n\n- [Epic 16 — Theme L / US-L1](../epic-16.md)\n- [Epic 17 — schema rename](../epic-17.md)\n- [Epic 5 — FE.5.9](../epic-5.md)\n`

mkdirSync(dirname(outPath), { recursive: true })
writeFileSync(outPath, body, 'utf8')
console.log('Wrote', outPath)
