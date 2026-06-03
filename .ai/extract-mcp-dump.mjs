import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const input = process.argv[2];
const output =
  process.argv[3] ||
  path.join(
    __dirname,
    '../supabase/seed/20260529120000_naiguikrgzzxhsbanpfm_full_data_export.sql'
  );

const raw = fs.readFileSync(input, 'utf8');

function extractChunkFromMcpFile(text) {
  let payload = text.trim();
  if (payload.startsWith('{')) {
    try {
      const outer = JSON.parse(payload);
      if (typeof outer.result === 'string') {
        payload = outer.result;
      } else if (Array.isArray(outer) && outer[0]?.chunk) {
        return outer[0].chunk;
      }
    } catch {
      // fall through
    }
  }

  const start = payload.indexOf('[{"chunk":');
  if (start < 0) {
    throw new Error('Could not locate [{"chunk": in MCP output');
  }

  // Balanced bracket parse for the JSON array
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < payload.length; i++) {
    const ch = payload[i];
    if (inString) {
      if (escape) escape = false;
      else if (ch === '\\') escape = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === '[') depth++;
    else if (ch === ']') {
      depth--;
      if (depth === 0) {
        const arr = JSON.parse(payload.slice(start, i + 1));
        if (typeof arr[0]?.chunk !== 'string') {
          throw new Error('chunk field missing');
        }
        return arr[0].chunk;
      }
    }
  }

  throw new Error('Could not parse chunk JSON array');
}

const body = extractChunkFromMcpFile(raw);

const header = `-- Vestroo data export (INSERT-only, no DDL)
-- Source project: naiguikrgzzxhsbanpfm (https://naiguikrgzzxhsbanpfm.supabase.co)
-- Generated: ${new Date().toISOString()}
--
-- Apply AFTER all schema migrations on the target database.
-- Does NOT create tables, indexes, RLS policies, or functions.
--
-- Usage:
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/seed/20260529120000_naiguikrgzzxhsbanpfm_full_data_export.sql
--
-- Skipped system tables: auth.schema_migrations, storage.migrations
-- Uses session_replication_role=replica to bypass FK/trigger ordering issues.
--
`;

fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, header + body, 'utf8');

const stat = fs.statSync(output);
const lineCount = fs.readFileSync(output, 'utf8').split('\n').length;
console.log(`Wrote ${output}`);
console.log(`  ${(stat.size / 1024).toFixed(1)} KB, ${lineCount} lines`);
