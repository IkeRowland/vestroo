#!/usr/bin/env node
/**
 * Apply all JSON payloads in .ai/mcp-batch via stdin protocol:
 * prints APPLY|<name>|<base64(query)> for agent-side MCP (fallback).
 * When SUPABASE_ACCESS_TOKEN is set, POSTs to Management API directly.
 */
import fs from 'node:fs';
import path from 'node:path';

const projectId = 'hovrqiqcfztntrxdqjqj';
const batchDir = path.resolve(import.meta.dirname, 'mcp-batch');
const skip = new Set(
	(process.env.SKIP_NAMES ?? '')
		.split(',')
		.map((s) => s.trim())
		.filter(Boolean),
);

const token = process.env.SUPABASE_ACCESS_TOKEN;
const files = fs.readdirSync(batchDir).filter((f) => f.endsWith('.json')).sort();
const log = [];

for (const file of files) {
	const payload = JSON.parse(fs.readFileSync(path.join(batchDir, file), 'utf8'));
	if (skip.has(payload.name)) {
		log.push({ name: payload.name, status: 'skipped' });
		continue;
	}
	if (token) {
		const res = await fetch(
			`https://api.supabase.com/v1/projects/${projectId}/database/migrations`,
			{
				method: 'POST',
				headers: {
					Authorization: `Bearer ${token}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ name: payload.name, query: payload.query }),
			},
		);
		const text = await res.text();
		log.push({
			name: payload.name,
			status: res.ok ? 'ok' : 'error',
			http: res.status,
			body: text.slice(0, 500),
		});
	} else {
		const b64 = Buffer.from(payload.query, 'utf8').toString('base64');
		console.log(`APPLY|${payload.name}|${b64}`);
	}
}

if (token) {
	console.log(JSON.stringify({ mode: 'api', results: log }, null, 2));
}
