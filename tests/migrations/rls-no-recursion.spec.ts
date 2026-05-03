import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';

/**
 * Epic 16 / Story 16.1 / US-K1 — `service_runs` × `tickets` RLS recursion fix.
 *
 * Structural assertions over the migration SQL + smoke_rls.sql evidence block.
 * Mirrors the existing repo pattern at `src/lib/__tests__/sh94-migration-ac6.test.ts`
 * — no live database is required; CI gate is structural so the recursion class
 * cannot regress without re-introducing the inline cross-table EXISTS that
 * caused SQLSTATE `42P17` on `/ops/fulfil`.
 *
 * Live behavioural assertions live in `supabase/smoke_rls.sql` section 19
 * (chauffeur SELECT on `public.service_runs` must not raise `42P17`).
 */

const repoRoot: string = process.cwd();

const migrationPath: string = resolve(
	repoRoot,
	'supabase/migrations/20260426170000_ops16_service_runs_tickets_rls_helpers.sql',
);

const followupMigrationPath: string = resolve(
	repoRoot,
	'supabase/migrations/20260426180000_ops16_trips_booking_trips_rls_helpers.sql',
);

const smokeRlsPath: string = resolve(repoRoot, 'supabase/smoke_rls.sql');

const migrationSql: string = readFileSync(migrationPath, 'utf8');
const followupMigrationSql: string = readFileSync(followupMigrationPath, 'utf8');
const smokeSql: string = readFileSync(smokeRlsPath, 'utf8');

const countMatches = (haystack: string, pattern: RegExp): number => {
	const flags: string = pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`;
	const globalPattern: RegExp = new RegExp(pattern.source, flags);
	const matches: RegExpMatchArray | null = haystack.match(globalPattern);
	return matches ? matches.length : 0;
};

describe('Epic 16 K1 — service_runs × tickets RLS helpers migration (AC2 / AC5)', () => {
	it('drops the recursive policy pair (idempotent guards)', () => {
		expect(migrationSql).toMatch(
			/drop policy if exists service_runs_select_party on public\.service_runs/i,
		);
		expect(migrationSql).toMatch(
			/drop policy if exists tickets_chauffeur_run_select on public\.tickets/i,
		);
	});

	it('creates SECURITY DEFINER STABLE helpers with hardened search_path', () => {
		expect(migrationSql).toMatch(
			/create or replace function public\.service_run_is_visible_to_party\s*\(\s*p_service_run_id\s+uuid\s*\)/i,
		);
		expect(migrationSql).toMatch(
			/create or replace function public\.ticket_is_visible_to_run_chauffeur\s*\(\s*p_ticket_id\s+uuid\s*\)/i,
		);
		expect(migrationSql).toMatch(/security definer/i);
		expect(migrationSql).toMatch(/\bstable\b/i);
		expect(migrationSql).toMatch(/set search_path = public/i);
	});

	it('preserves the original 5-clause OR semantics from SH.9.4', () => {
		expect(migrationSql).toMatch(/public\.trips/i);
		expect(migrationSql).toMatch(/public\.booking_trips/i);
		expect(migrationSql).toMatch(/public\.bookings/i);
		expect(migrationSql).toMatch(/public\.tickets/i);
		expect(migrationSql).toMatch(/public\.service_runs/i);
		expect(migrationSql).toMatch(/chauffeur_id\s*=\s*auth\.uid\(\)/i);
		expect(migrationSql).toMatch(/customer_id\s*=\s*auth\.uid\(\)/i);
		expect(migrationSql).toMatch(/passenger_id\s*=\s*auth\.uid\(\)/i);
		expect(migrationSql).toMatch(
			/ticket_inventory_state\s+in\s*\(\s*'legacy'\s*,\s*'hold'\s*,\s*'confirmed'\s*\)/i,
		);
	});

	it('revokes default execute and grants execute to authenticated + service_role', () => {
		expect(migrationSql).toMatch(
			/revoke all on function public\.service_run_is_visible_to_party\(uuid\) from public/i,
		);
		expect(migrationSql).toMatch(
			/grant execute on function public\.service_run_is_visible_to_party\(uuid\) to authenticated/i,
		);
		expect(migrationSql).toMatch(
			/grant execute on function public\.service_run_is_visible_to_party\(uuid\) to service_role/i,
		);
		expect(migrationSql).toMatch(
			/revoke all on function public\.ticket_is_visible_to_run_chauffeur\(uuid\) from public/i,
		);
		expect(migrationSql).toMatch(
			/grant execute on function public\.ticket_is_visible_to_run_chauffeur\(uuid\) to authenticated/i,
		);
		expect(migrationSql).toMatch(
			/grant execute on function public\.ticket_is_visible_to_run_chauffeur\(uuid\) to service_role/i,
		);
	});

	it('recreates both policies via the helpers (no inline cross-table EXISTS)', () => {
		expect(migrationSql).toMatch(
			/create policy service_runs_select_party on public\.service_runs/i,
		);
		expect(migrationSql).toMatch(
			/using\s*\(\s*public\.service_run_is_visible_to_party\s*\(\s*id\s*\)\s*\)/i,
		);
		expect(migrationSql).toMatch(
			/create policy tickets_chauffeur_run_select on public\.tickets/i,
		);
		expect(migrationSql).toMatch(
			/using\s*\(\s*public\.ticket_is_visible_to_run_chauffeur\s*\(\s*id\s*\)\s*\)/i,
		);
		expect(migrationSql).toMatch(/for select to authenticated/i);
	});

	it('cites the cross-table-helpers ADR path in helper comments (Theme O / O1)', () => {
		expect(migrationSql).toMatch(/comment on function public\.service_run_is_visible_to_party/i);
		expect(migrationSql).toMatch(
			/comment on function public\.ticket_is_visible_to_run_chauffeur/i,
		);
		expect(migrationSql).toMatch(
			/docs\/adr\/0006-rls-cross-table-helpers\.md/,
		);
	});

	it('no inline EXISTS over public.tickets remains in the recreated service_runs policy', () => {
		const policyMatch: RegExpMatchArray | null = migrationSql.match(
			/create policy service_runs_select_party on public\.service_runs[\s\S]*?;/i,
		);
		expect(policyMatch).not.toBeNull();
		const policyBlock: string = policyMatch ? policyMatch[0] : '';
		expect(/exists\s*\(/i.test(policyBlock)).toBe(false);
		expect(/from\s+public\.tickets/i.test(policyBlock)).toBe(false);
	});

	it('no inline EXISTS over public.service_runs remains in the recreated tickets policy', () => {
		const policyMatch: RegExpMatchArray | null = migrationSql.match(
			/create policy tickets_chauffeur_run_select on public\.tickets[\s\S]*?;/i,
		);
		expect(policyMatch).not.toBeNull();
		const policyBlock: string = policyMatch ? policyMatch[0] : '';
		expect(/exists\s*\(/i.test(policyBlock)).toBe(false);
		expect(/from\s+public\.service_runs/i.test(policyBlock)).toBe(false);
	});
});

describe('Epic 16 K1 — smoke_rls.sql chauffeur service_runs assertion (AC1 / AC3 evidence)', () => {
	it('exercises select count(*) from public.service_runs and asserts no SQLSTATE 42P17', () => {
		expect(smokeSql).toMatch(/select\s+count\(\*\)\s+(?:into\s+\w+\s+)?from\s+public\.service_runs/i);
		expect(smokeSql).toMatch(/42P17/);
	});

	it('uses a chauffeur fixture with JWT + authenticated role (mirrors sections 12 / 14 / 15 / 17)', () => {
		expect(smokeSql).toMatch(/role\s*=\s*'chauffeur'/i);
		expect(smokeSql).toMatch(/set local role authenticated/i);
		expect(smokeSql).toMatch(/request\.jwt\.claim\.sub/);
	});

	it('cites the K1 helpers and the new migration filename for actionable failures', () => {
		expect(smokeSql).toMatch(/service_run_is_visible_to_party/);
		expect(smokeSql).toMatch(/ticket_is_visible_to_run_chauffeur/);
		expect(smokeSql).toMatch(
			/20260426170000_ops16_service_runs_tickets_rls_helpers\.sql/,
		);
	});
});

describe('trips × booking_trips RLS helpers (K1 follow-up — 20260426180000)', () => {
	it('migration file exists and declares the three SECURITY DEFINER STABLE helpers', () => {
		expect(followupMigrationSql.length).toBeGreaterThan(0);
		expect(followupMigrationSql).toMatch(
			/create or replace function public\.booking_trip_is_visible_to_chauffeur\s*\(\s*p_trip_id uuid\s*\)/,
		);
		expect(followupMigrationSql).toMatch(
			/create or replace function public\.trip_is_visible_to_account_member\s*\(\s*p_trip_id uuid\s*\)/,
		);
		expect(followupMigrationSql).toMatch(
			/create or replace function public\.booking_trip_is_visible_to_account_member\s*\(\s*p_booking_id uuid\s*\)/,
		);
		expect(countMatches(followupMigrationSql, /security definer/i)).toBeGreaterThanOrEqual(3);
		expect(countMatches(followupMigrationSql, /\bstable\b/i)).toBeGreaterThanOrEqual(3);
		expect(countMatches(followupMigrationSql, /set search_path\s*=\s*public/i)).toBeGreaterThanOrEqual(3);
	});

	it('revokes default execute and grants execute to authenticated + service_role for all three helpers', () => {
		expect(followupMigrationSql).toMatch(
			/revoke all on function public\.booking_trip_is_visible_to_chauffeur/i,
		);
		expect(followupMigrationSql).toMatch(
			/grant execute on function public\.booking_trip_is_visible_to_chauffeur\(uuid\) to authenticated/i,
		);
		expect(followupMigrationSql).toMatch(
			/grant execute on function public\.booking_trip_is_visible_to_chauffeur\(uuid\) to service_role/i,
		);
		expect(followupMigrationSql).toMatch(
			/revoke all on function public\.trip_is_visible_to_account_member/i,
		);
		expect(followupMigrationSql).toMatch(
			/grant execute on function public\.trip_is_visible_to_account_member\(uuid\) to authenticated/i,
		);
		expect(followupMigrationSql).toMatch(
			/grant execute on function public\.trip_is_visible_to_account_member\(uuid\) to service_role/i,
		);
		expect(followupMigrationSql).toMatch(
			/revoke all on function public\.booking_trip_is_visible_to_account_member/i,
		);
		expect(followupMigrationSql).toMatch(
			/grant execute on function public\.booking_trip_is_visible_to_account_member\(uuid\) to authenticated/i,
		);
		expect(followupMigrationSql).toMatch(
			/grant execute on function public\.booking_trip_is_visible_to_account_member\(uuid\) to service_role/i,
		);
	});

	it('drops the recursive (and defence-in-depth) policies idempotently', () => {
		expect(followupMigrationSql).toMatch(
			/drop policy if exists booking_trips_select_chauffeur on public\.booking_trips/i,
		);
		expect(followupMigrationSql).toMatch(
			/drop policy if exists trips_select_account_member on public\.trips/i,
		);
		expect(followupMigrationSql).toMatch(
			/drop policy if exists booking_trips_select_account_member on public\.booking_trips/i,
		);
	});

	it('recreates the three policies via the helpers (no inline cross-table EXISTS)', () => {
		expect(followupMigrationSql).toMatch(
			/using \(public\.booking_trip_is_visible_to_chauffeur\(trip_id\)\)/,
		);
		expect(followupMigrationSql).toMatch(
			/using \(public\.trip_is_visible_to_account_member\(id\)\)/,
		);
		expect(followupMigrationSql).toMatch(
			/using \(public\.booking_trip_is_visible_to_account_member\(booking_id\)\)/,
		);
		expect(followupMigrationSql).toMatch(/for select to authenticated/i);
	});

	it('cites the cross-table-helpers ADR path (Theme O / O1) in helper comments', () => {
		expect(followupMigrationSql).toMatch(
			/docs\/adr\/0006-rls-cross-table-helpers\.md/,
		);
	});

	it('does not contain inline EXISTS over public.trips inside any using clause that was meant to be replaced', () => {
		// Each recreated policy must use the helper, not an inline cross-table
		// `EXISTS (select 1 from public.trips ...)` — that pattern is exactly what
		// caused the recursion class. Carve out the three policy `using (...)`
		// blocks and assert the inline form is absent. The migration may still
		// mention `public.trips` inside helper bodies (which is intentional and
		// safe under SECURITY DEFINER); the negative assertion targets the
		// `create policy ... using (...)` clauses only.
		const policyBlocks: RegExpMatchArray | null = followupMigrationSql.match(
			/create policy [^;]+? using \([^;]*?\);/gi,
		);
		expect(policyBlocks).not.toBeNull();
		const blocks: ReadonlyArray<string> = policyBlocks ?? [];
		expect(blocks.length).toBeGreaterThanOrEqual(3);
		for (const block of blocks) {
			expect(/exists\s*\(\s*select\s+1\s+from\s+public\.trips/i.test(block)).toBe(false);
			expect(/exists\s*\(\s*select\s+1\s+from\s+public\.booking_trips/i.test(block)).toBe(false);
			expect(/exists\s*\(\s*select\s+1\s+from\s+public\.bookings/i.test(block)).toBe(false);
		}
	});
});

describe('Epic 16 K1 follow-up — smoke_rls.sql section 20 (trips × booking_trips evidence)', () => {
	it('exercises both count(*) reads on trips and booking_trips under authenticated', () => {
		expect(smokeSql).toMatch(/select\s+count\(\*\)\s+(?:into\s+\w+\s+)?from\s+public\.trips/i);
		expect(smokeSql).toMatch(/select\s+count\(\*\)\s+(?:into\s+\w+\s+)?from\s+public\.booking_trips/i);
	});

	it('asserts no SQLSTATE 42P17 (>= 2 occurrences across sections 19 + 20)', () => {
		expect(countMatches(smokeSql, /42P17/)).toBeGreaterThanOrEqual(2);
	});

	it('marks the new section 20 block and cites the follow-up migration filename', () => {
		expect(smokeSql).toMatch(/section 20|epic16.*trips.*recursion|trips × booking_trips recursion guard/i);
		expect(smokeSql).toMatch(
			/20260426180000_ops16_trips_booking_trips_rls_helpers\.sql/,
		);
	});

	it('uses chauffeur + account-member fixtures with JWT + authenticated role', () => {
		expect(smokeSql).toMatch(/role\s*=\s*'chauffeur'/i);
		expect(smokeSql).toMatch(/customer_account_members/);
		expect(smokeSql).toMatch(/set local role authenticated/i);
		expect(smokeSql).toMatch(/request\.jwt\.claim\.sub/);
	});

	it('cites all three K1 follow-up helpers in actionable failure messages', () => {
		expect(smokeSql).toMatch(/booking_trip_is_visible_to_chauffeur/);
		expect(smokeSql).toMatch(/trip_is_visible_to_account_member/);
		expect(smokeSql).toMatch(/booking_trip_is_visible_to_account_member/);
	});
});
