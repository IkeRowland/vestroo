/**
 * Remove generated columns from INSERT statements in a data seed file.
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

/** Split SQL VALUES list on top-level commas. */
function splitSqlValues(valuesPart) {
  const parts = [];
  let current = '';
  let inString = false;
  let escape = false;
  let depth = 0;

  for (let i = 0; i < valuesPart.length; i++) {
    const ch = valuesPart[i];

    if (inString) {
      current += ch;
      if (escape) escape = false;
      else if (ch === '\\') escape = true;
      else if (ch === "'") {
        if (valuesPart[i + 1] === "'") {
          current += "'";
          i++;
        } else inString = false;
      }
      continue;
    }

    if (ch === "'") {
      inString = true;
      current += ch;
      continue;
    }

    if (ch === '(') depth++;
    else if (ch === ')') depth--;

    if (ch === ',' && depth === 0) {
      parts.push(current.trim());
      current = '';
      continue;
    }

    current += ch;
  }

  if (current.trim()) parts.push(current.trim());
  return parts;
}

function stripGeneratedColumns(sql, table, generatedColumns) {
  const pattern = new RegExp(
    `INSERT INTO ${table.replace('.', '\\.')} \\(([^)]+)\\) VALUES \\((.*)\\);`,
    'g'
  );

  return sql.replace(pattern, (match, colsRaw, valsRaw) => {
    const cols = colsRaw.split(',').map((c) => c.trim());
    const vals = splitSqlValues(valsRaw);
    if (cols.length !== vals.length) {
      throw new Error(
        `${table}: column/value count mismatch (${cols.length} vs ${vals.length})`
      );
    }

    const filtered = cols
      .map((col, i) => ({ col, val: vals[i] }))
      .filter(({ col }) => !generatedColumns.has(col));

    const newCols = filtered.map(({ col }) => col).join(', ');
    const newVals = filtered.map(({ val }) => val).join(', ');
    return `INSERT INTO ${table} (${newCols}) VALUES (${newVals});`;
  });
}

let sql = fs.readFileSync(file, 'utf8');

sql = stripGeneratedColumns(sql, 'auth.identities', new Set(['email']));
sql = stripGeneratedColumns(sql, 'auth.users', new Set(['confirmed_at']));
sql = stripGeneratedColumns(sql, 'storage.objects', new Set(['path_tokens']));

if (!sql.includes('Generated columns omitted')) {
  sql = sql.replace(
    '-- Uses session_replication_role=replica to bypass FK/trigger ordering issues.',
    `-- Uses session_replication_role=replica to bypass FK/trigger ordering issues.
-- Generated columns omitted: auth.identities.email, auth.users.confirmed_at, storage.objects.path_tokens`
  );
}

fs.writeFileSync(file, sql, 'utf8');
console.log(`Patched ${file}`);
