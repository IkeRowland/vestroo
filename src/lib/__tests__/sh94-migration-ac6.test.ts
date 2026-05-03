import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, it, expect } from 'vitest'

/**
 * AC6: `service_runs` open read removed; party-scoped SELECT + Realtime publication.
 */
describe('SH.9.4 migration SQL (RLS + publication)', () => {
	it('replaces service_runs_read_auth and publishes run + assignment tables', () => {
		const path = resolve(
			process.cwd(),
			'supabase/migrations/20260418150000_sh94_patterned_run_realtime.sql',
		)
		const sql = readFileSync(path, 'utf8')
		expect(sql).toMatch(/drop policy if exists service_runs_read_auth/)
		expect(sql).toMatch(/create policy service_runs_select_party/)
		expect(sql).toMatch(/trips t/)
		expect(sql).toMatch(/booking_trips/)
		expect(sql).toMatch(/alter publication supabase_realtime add table public\.service_runs/)
		expect(sql).toMatch(/alter publication supabase_realtime add table public\.chauffeur_assignments/)
	})
})
