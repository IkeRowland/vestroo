#!/usr/bin/env node
/**
 * Reads pending migration SQL from supabase/migrations and prints
 * one JSON object per line: {"name":"...","query":"..."}
 * (stdout for agent MCP apply_migration loop)
 */
import fs from 'node:fs';
import path from 'node:path';

const projectRoot = path.resolve(import.meta.dirname, '..');
const migrationsDir = path.join(projectRoot, 'supabase', 'migrations');

const remoteApplied = new Set(process.argv.slice(2));
if (remoteApplied.size === 0) {
	console.error('Usage: node apply-pending-migrations.mjs <applied_name> ...');
	process.exit(1);
}

const files = fs
	.readdirSync(migrationsDir)
	.filter((f) => f.endsWith('.sql'))
	.sort();

for (const file of files) {
	const name = file.replace(/^\d+_/, '').replace(/\.sql$/, '');
	if (remoteApplied.has(name)) continue;
	const query = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
	process.stdout.write(JSON.stringify({ name, query }) + '\n');
}
