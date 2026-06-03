/**
 * Build a data-only SQL seed file from Supabase MCP execute_sql JSON exports.
 * Reads table dumps from .ai/data-export/*.json (written by export via MCP).
 * Also supports live export when DATABASE_URL resolves.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

export function escapeIdent(name) {
  return `"${String(name).replace(/"/g, '""')}"`;
}

export function escapeLiteral(str) {
  return `'${String(str).replace(/\\/g, '\\\\').replace(/'/g, "''")}'`;
}

function baseType(pgType) {
  return pgType.replace(/\[\]$/, '').split('(')[0].trim();
}

export function formatValue(value, pgType) {
  if (value === null || value === undefined) return 'NULL';

  const isArray = pgType.endsWith('[]');
  const type = baseType(isArray ? pgType.slice(0, -2) : pgType);

  if (isArray) {
    if (!Array.isArray(value)) return `'{}'`;
    if (value.length === 0) return `'{}'`;
    const inner = value
      .map((item) => {
        if (item === null) return 'NULL';
        if (type === 'text' || type === 'varchar' || type === 'uuid' || type.includes('timestamp') || type === 'date') {
          const s = String(item).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
          return `"${s}"`;
        }
        if (type === 'boolean') return item ? 'true' : 'false';
        if (typeof item === 'number') return String(item);
        if (typeof item === 'object') {
          const s = JSON.stringify(item).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
          return `"${s}"`;
        }
        return `"${String(item).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
      })
      .join(',');
    return `'{${inner}}'`;
  }

  if (type === 'bool' || type === 'boolean') return value ? 'TRUE' : 'FALSE';
  if (['int2', 'int4', 'int8', 'float4', 'float8', 'numeric', 'oid'].includes(type)) {
    return String(value);
  }
  if (type === 'bytea') {
    if (typeof value === 'string' && value.startsWith('\\x')) return escapeLiteral(value);
    return `'\\x${Buffer.from(String(value)).toString('hex')}'`;
  }
  if (type === 'json' || type === 'jsonb') {
    const json = typeof value === 'string' ? value : JSON.stringify(value);
    return `${escapeLiteral(json)}::${type}`;
  }
  if (type.startsWith('timestamp') || type === 'timestamptz' || type === 'date') {
    return escapeLiteral(String(value));
  }
  if (typeof value === 'object') {
    return `${escapeLiteral(JSON.stringify(value))}::jsonb`;
  }
  return escapeLiteral(String(value));
}

export function buildInsertStatements(schema, table, columns, rows) {
  if (!rows.length) return [];
  const colNames = columns.map((c) => c.column_name);
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

export function buildSeedFile(sections) {
  return [
    '-- Vestroo data export (INSERT-only, no DDL)',
    '-- Source project: naiguikrgzzxhsbanpfm (https://naiguikrgzzxhsbanpfm.supabase.co)',
    `-- Generated: ${new Date().toISOString()}`,
    '--',
    '-- Apply AFTER all schema migrations on the target database.',
    '-- Does NOT create tables, indexes, RLS policies, or functions.',
    '--',
    '-- Usage:',
    '--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/seed/20260529120000_naiguikrgzzxhsbanpfm_full_data_export.sql',
    '--',
    '-- Skipped system tables: auth.schema_migrations, storage.migrations',
    '-- Uses session_replication_role=replica to bypass FK/trigger ordering issues.',
    '',
    'BEGIN;',
    "SET LOCAL session_replication_role = 'replica';",
    '',
    ...sections,
    "SET LOCAL session_replication_role = 'origin';",
    'COMMIT;',
    '',
  ].join('\n');
}

/** Table export order: parents before children where possible. */
export const EXPORT_TABLES = [
  { schema: 'auth', table: 'users' },
  { schema: 'auth', table: 'identities' },
  { schema: 'auth', table: 'sessions' },
  { schema: 'auth', table: 'refresh_tokens' },
  { schema: 'auth', table: 'mfa_amr_claims' },
  { schema: 'auth', table: 'flow_state' },
  { schema: 'storage', table: 'buckets' },
  { schema: 'storage', table: 'objects' },
  { schema: 'public', table: 'vehicle_categories' },
  { schema: 'public', table: 'referrers' },
  { schema: 'public', table: 'customer_accounts' },
  { schema: 'public', table: 'vehicles' },
  { schema: 'public', table: 'profiles' },
  { schema: 'public', table: 'service_routes' },
  { schema: 'public', table: 'service_patterns' },
  { schema: 'public', table: 'experience_packages' },
  { schema: 'public', table: 'ops_settings' },
  { schema: 'public', table: 'comms_templates' },
  { schema: 'public', table: 'comms_dispatch_rules' },
  { schema: 'public', table: 'customer_account_members' },
  { schema: 'public', table: 'service_runs' },
  { schema: 'public', table: 'chauffeur_schedules' },
  { schema: 'public', table: 'bookings' },
  { schema: 'public', table: 'trips' },
  { schema: 'public', table: 'chauffeur_assignments' },
  { schema: 'public', table: 'booking_trips' },
  { schema: 'public', table: 'booking_quotes' },
  { schema: 'public', table: 'notifications' },
  { schema: 'public', table: 'ops_audit_log' },
];

const exportDir = path.join(__dirname, 'data-export');
const outFile = path.join(
  root,
  'supabase/seed/20260529120000_naiguikrgzzxhsbanpfm_full_data_export.sql'
);

function mainFromJsonDumps() {
  const sections = [];
  for (const { schema, table } of EXPORT_TABLES) {
    const file = path.join(exportDir, `${schema}.${table}.json`);
    if (!fs.existsSync(file)) {
      console.warn(`Missing ${file}, skipping`);
      continue;
    }
    const { columns, rows } = JSON.parse(fs.readFileSync(file, 'utf8'));
    sections.push(...buildInsertStatements(schema, table, columns, rows));
  }
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, buildSeedFile(sections), 'utf8');
  console.log(`Wrote ${outFile}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  mainFromJsonDumps();
}
