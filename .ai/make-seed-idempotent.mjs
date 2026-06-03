/**
 * Make all INSERT statements idempotent, including multi-line booking_quotes rows.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const file =
  process.argv[2] ||
  path.join(
    __dirname,
    '../supabase/seed/20260529120000_naiguikrgzzxhsbanpfm_full_data_export.sql'
  );

const raw = fs.readFileSync(file, 'utf8');
const lines = raw.split('\n');
const out = [];
let buffer = null;

function flushBuffer() {
  if (!buffer) return;
  let stmt = buffer.join('\n').trimEnd();
  if (!stmt.includes('ON CONFLICT')) {
    stmt = stmt.replace(/;\s*$/, ' ON CONFLICT DO NOTHING;');
  }
  out.push(stmt);
  buffer = null;
}

for (const line of lines) {
  if (buffer) {
    buffer.push(line);
    if (/;\s*$/.test(line) && !line.trimStart().startsWith('--')) {
      flushBuffer();
    }
    continue;
  }

  if (line.startsWith('INSERT INTO')) {
    if (line.includes('ON CONFLICT') && /;\s*$/.test(line)) {
      out.push(line);
    } else {
      buffer = [line];
      if (/;\s*$/.test(line) && line.includes('ON CONFLICT')) {
        flushBuffer();
      } else if (/;\s*$/.test(line) && !line.includes('ON CONFLICT')) {
        flushBuffer();
      }
    }
    continue;
  }

  out.push(line);
}

flushBuffer();

let sql = out.join('\n');

if (!sql.includes('Idempotent:')) {
  sql = sql.replace(
    '-- Generated columns omitted:',
    `-- Idempotent: all INSERTs use ON CONFLICT DO NOTHING (safe when migrations pre-seed rows).
-- Generated columns omitted:`
  );
}

fs.writeFileSync(file, sql, 'utf8');

const inserts = sql.split('\n').filter((l) => l.startsWith('INSERT INTO')).length;
const patched = (sql.match(/ON CONFLICT DO NOTHING/g) || []).length;
const missing = sql
  .split('\n')
  .filter((l) => l.startsWith('INSERT INTO') && !l.includes('ON CONFLICT')).length;

console.log(`Patched ${file}`);
console.log(`  single-line inserts: ${inserts}, ON CONFLICT clauses: ${patched}, missing: ${missing}`);

// Multi-line inserts won't start with INSERT on continuation lines; verify no open buffers
const multi = (sql.match(/^INSERT INTO[\s\S]*?;\s*$/gm) || []).filter(
  (s) => !s.includes('ON CONFLICT')
).length;
if (multi > 0) {
  console.error(`  WARNING: ${multi} insert blocks still missing ON CONFLICT`);
  process.exit(1);
}
