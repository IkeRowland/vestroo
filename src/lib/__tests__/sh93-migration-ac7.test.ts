import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';

/**
 * AC7: DB-backed contention — migration must lock the run row and reject oversell.
 * Complements `scripts/sh93-concurrency-proof.sql` for live parallel verification.
 */
describe('SH.9.3 migration SQL (AC7 evidence)', () => {
  it('reserves with FOR UPDATE and raises capacity_exceeded', () => {
    const path = resolve(
      process.cwd(),
      'supabase/migrations/20260418140000_sh93_service_run_capacity_holds.sql',
    );
    const sql = readFileSync(path, 'utf8');
    expect(sql).toMatch(/for update/i);
    expect(sql).toMatch(/capacity_exceeded/);
    expect(sql).toMatch(/service_run_reserved_seat_count/);
  });
});
