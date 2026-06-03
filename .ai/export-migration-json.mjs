#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const projectRoot = path.resolve(import.meta.dirname, '..');
const migrationsDir = path.join(projectRoot, 'supabase', 'migrations');
const outDir = path.join(projectRoot, '.ai', 'mcp-batch');
fs.mkdirSync(outDir, { recursive: true });

const applied = new Set(process.argv.slice(2));
const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort();

let n = 0;
for (const file of files) {
	const name = file.replace(/^\d+_/, '').replace(/\.sql$/, '');
	if (applied.has(name)) continue;
	const query = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
	const payload = { project_id: 'hovrqiqcfztntrxdqjqj', name, query };
	fs.writeFileSync(path.join(outDir, `${name}.json`), JSON.stringify(payload), 'utf8');
	n++;
}
console.log(`Exported ${n} payloads to ${outDir}`);
