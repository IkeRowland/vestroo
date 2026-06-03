/**
 * Export all row data from a Supabase Postgres database as INSERT statements.
 * Usage: node .ai/export-database-data.mjs [DATABASE_URL] [output.sql]
 */
import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const DEFAULT_URL =
  'postgresql://postgres:14ifgKBVZlgGtOuh@db.naiguikrgzzxhsbanpfm.supabase.co:5432/postgres';
const DEFAULT_OUT = path.join(
  root,
  'supabase/seed/20260529120000_naiguikrgzzxhsbanpfm_full_data_export.sql'
);

const DATABASE_URL = process.argv[2] || process.env.SOURCE_DATABASE_URL || DEFAULT_URL;
const OUTPUT_PATH = process.argv[3] || DEFAULT_OUT;

/** System tables managed by Supabase — skip when cloning app data. */
const SKIP_TABLES = new Set([
  'auth.schema_migrations',
  'storage.migrations',
]);

const SCHEMAS = ['auth', 'storage', 'public'];

function escapeIdent(name) {
  return `"${String(name).replace(/"/g, '""')}"`;
}

function escapeLiteral(str) {
  return `'${String(str).replace(/\\/g, '\\\\').replace(/'/g, "''")}'`;
}

function formatPgArray(arr, elementType) {
  if (!arr || arr.length === 0) return `'{}'`;
  const inner = arr
    .map((item) => {
      if (item === null) return 'NULL';
      if (elementType === 'text' || elementType === 'varchar' || elementType === 'uuid') {
        const s = String(item).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
        return `"${s}"`;
      }
      if (typeof item === 'boolean') return item ? 'true' : 'false';
      if (typeof item === 'number') return String(item);
      if (typeof item === 'object') return escapeLiteral(JSON.stringify(item));
      return escapeLiteral(String(item));
    })
    .join(',');
  return `'{${inner}}'`;
}

function baseType(pgType) {
  return pgType.replace(/\[\]$/, '').split('(')[0].trim();
}

function formatValue(value, pgType) {
  if (value === null || value === undefined) return 'NULL';

  const isArray = pgType.endsWith('[]');
  const type = baseType(isArray ? pgType.slice(0, -2) : pgType);

  if (isArray) {
    if (!Array.isArray(value)) return 'NULL';
    return formatPgArray(value, type);
  }

  if (type === 'bool' || type === 'boolean') {
    return value ? 'TRUE' : 'FALSE';
  }

  if (
    type === 'int2' ||
    type === 'int4' ||
    type === 'int8' ||
    type === 'float4' ||
    type === 'float8' ||
    type === 'numeric'
  ) {
    return String(value);
  }

  if (type === 'bytea') {
    if (Buffer.isBuffer(value)) {
      return `'\\x${value.toString('hex')}'`;
    }
    if (typeof value === 'string' && value.startsWith('\\x')) {
      return escapeLiteral(value);
    }
    return `'\\x${Buffer.from(String(value)).toString('hex')}'`;
  }

  if (type === 'json' || type === 'jsonb') {
    const json =
      typeof value === 'string' ? value : JSON.stringify(value);
    return `${escapeLiteral(json)}::${type}`;
  }

  if (type === 'uuid' || type === 'text' || type === 'varchar' || type === 'bpchar') {
    return escapeLiteral(String(value));
  }

  if (type === 'inet' || type === 'cidr' || type === 'macaddr') {
    return escapeLiteral(String(value));
  }

  if (type === 'date') {
    const d = value instanceof Date ? value : new Date(value);
    return escapeLiteral(d.toISOString().slice(0, 10));
  }

  if (
    type.startsWith('timestamp') ||
    type === 'timestamptz' ||
    type === 'time' ||
    type === 'timetz'
  ) {
    const d = value instanceof Date ? value : new Date(value);
    return escapeLiteral(d.toISOString().replace('T', ' ').replace('Z', '+00'));
  }

  if (type === 'interval') {
    return escapeLiteral(String(value));
  }

  if (typeof value === 'object') {
    return `${escapeLiteral(JSON.stringify(value))}::jsonb`;
  }

  return escapeLiteral(String(value));
}

async function getTablesWithData(client) {
  const { rows } = await client.query(`
    SELECT schemaname, relname, n_live_tup::bigint AS row_count
    FROM pg_stat_user_tables
    WHERE schemaname = ANY($1::text[])
      AND n_live_tup > 0
    ORDER BY schemaname, relname
  `, [SCHEMAS]);
  return rows.filter((r) => !SKIP_TABLES.has(`${r.schemaname}.${r.relname}`));
}

async function getColumns(client, schema, table) {
  const { rows } = await client.query(
    `
    SELECT a.attname AS column_name,
           pg_catalog.format_type(a.atttypid, a.atttypmod) AS data_type
    FROM pg_catalog.pg_attribute a
    JOIN pg_catalog.pg_class c ON a.attrelid = c.oid
    JOIN pg_catalog.pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = $1
      AND c.relname = $2
      AND a.attnum > 0
      AND NOT a.attisdropped
    ORDER BY a.attnum
    `,
    [schema, table]
  );
  return rows;
}

async function exportTable(client, schema, table, columns) {
  const colNames = columns.map((c) => c.column_name);
  const selectList = colNames.map((c) => escapeIdent(c)).join(', ');
  const { rows } = await client.query(
    `SELECT ${selectList} FROM ${escapeIdent(schema)}.${escapeIdent(table)}`
  );

  if (rows.length === 0) return [];

  const header = `-- ${schema}.${table} (${rows.length} rows)`;
  const inserts = rows.map((row) => {
    const values = columns
      .map((col) => formatValue(row[col.column_name], col.data_type))
      .join(', ');
    const cols = colNames.map((c) => escapeIdent(c)).join(', ');
    return `INSERT INTO ${escapeIdent(schema)}.${escapeIdent(table)} (${cols}) VALUES (${values});`;
  });

  return [header, ...inserts, ''];
}

async function main() {
  const client = new pg.Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  console.log('Connected. Listing tables with data...');

  const tables = await getTablesWithData(client);
  console.log(`Found ${tables.length} tables with data (excluding system migration tables).`);

  const lines = [
    '-- Vestroo data export (INSERT-only, no DDL)',
    `-- Source: naiguikrgzzxhsbanpfm (${new Date().toISOString()})`,
    '-- Apply AFTER schema migrations on the target database.',
    '--',
    '-- Usage:',
    '--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/seed/20260529120000_naiguikrgzzxhsbanpfm_full_data_export.sql',
    '--',
    '-- Bypasses FK/trigger checks during load to handle circular references',
    '-- (e.g. bookings.current_quote_id, profiles.default_vehicle_id).',
    '',
    'BEGIN;',
    "SET LOCAL session_replication_role = 'replica';",
    '',
  ];

  let totalRows = 0;
  for (const { schemaname, relname, row_count } of tables) {
    console.log(`  Exporting ${schemaname}.${relname} (${row_count} rows)...`);
    const columns = await getColumns(client, schemaname, relname);
    const tableLines = await exportTable(client, schemaname, relname, columns);
    lines.push(...tableLines);
    totalRows += Number(row_count);
  }

  lines.push("SET LOCAL session_replication_role = 'origin';", 'COMMIT;', '');

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, lines.join('\n'), 'utf8');

  await client.end();

  const stat = fs.statSync(OUTPUT_PATH);
  console.log(`\nWrote ${OUTPUT_PATH}`);
  console.log(`  Tables: ${tables.length}, ~${totalRows} rows, ${(stat.size / 1024).toFixed(1)} KB`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
