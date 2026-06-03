#!/usr/bin/env node
/**
 * Prints one line per migration payload for agent MCP apply_migration.
 * Usage: node mcp-apply-batch.mjs <applied_name> ...
 */
import fs from 'node:fs';
import path from 'node:path';

const batchDir = path.resolve(import.meta.dirname, 'mcp-batch');
const applied = new Set(process.argv.slice(2));
const files = fs.readdirSync(batchDir).filter((f) => f.endsWith('.json')).sort();

for (const file of files) {
	const payload = JSON.parse(fs.readFileSync(path.join(batchDir, file), 'utf8'));
	if (applied.has(payload.name)) continue;
	process.stdout.write(JSON.stringify(payload) + '\n');
}
