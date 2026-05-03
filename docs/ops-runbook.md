# Operations runbook

Purpose: repeatable **operational** procedures for Vesturoo (Supabase, PostgREST, hosting) that are not fully captured in application code. Keep secrets out of this file—use provider dashboards and team-secure storage only.

---

## PostgREST schema cache reload

### When to use

Use this procedure when you see a **"function not found in the schema cache"** (or equivalent PostgREST) error **after** a database migration that **adds or replaces** an **RPC** that clients call via PostgREST (for example `supabase.rpc('…')` in the app). The function exists in PostgreSQL but PostgREST’s in-memory schema cache has not picked it up yet.

Typical symptom: an ops or app page shows a red error referencing the RPC name while the migration is already applied on the linked database.

### How (preferred)

1. Connect to the **same** Postgres database the **Supabase API (PostgREST)** uses for that project (Supabase **SQL Editor** with a role that can run arbitrary SQL, or **`psql`** with a service-role / direct connection as allowed by your org). **Do not** commit connection strings or keys to git.
2. Run:

   ```sql
   NOTIFY pgrst, 'reload schema';
   ```

3. Confirm the statement completes without error. PostgREST subscribers reload the schema from the catalog; no row data is returned for `NOTIFY`.

After reload, retry the failing UI or API path (e.g. **`/ops/bookings/comms-retry`** for `ops_list_booking_quote_comms_retry_candidates_v1`).

### Alternative

If `NOTIFY` is not available or the cache still looks stale, **restart the Supabase API** layer for the project:

- Use the **Supabase Dashboard** project controls where your plan exposes API restart or equivalent, **or**
- Your team’s **hosting** process (e.g. **Vercel** redeploy / cron / documented restart) if you route through a path that recycles the API—follow whatever **VST-2** / promotion runbook your team uses alongside [Staging, preview, and migration promotion](./staging-and-promotion.md).

A full API restart can cause brief unavailability; prefer **`NOTIFY pgrst, 'reload schema';`** when it suffices.

### Related

- After any RPC-affecting migration on a tier, confirm **`supabase migration list`** (CLI against the linked project) or Dashboard migration history matches repo expectations, then reload schema or restart as above.
- Promotion gaps (code shipped, DB migration not applied on that project’s ref) are fixed by applying migrations per [staging-and-promotion.md](./staging-and-promotion.md), **then** running this reload step.

---

## Epic 16 Theme N — legacy quote `/pay` redirect sunset

**Why:** Old customer links pointed at **`/q/[token]/pay`** (PayFast-era). The app now serves a temporary **HTTP 302** from **`src/app/(quote)/q/[token]/pay/route.ts`** to **`/q/[token]/accept`** (EFT acceptance landing) so bookmarks and emails do not 404 during the deprecation window (**Q33**).

**Calendar action:** On or after **2026-07-25**, **remove** **`pay/route.ts`** (delete the **`pay/`** route segment or replace with **404** per product). That ends the legacy redirect; ensure comms/product are aligned before removal.

**Optional traffic check:** Before deletion, use hosting analytics or access logs filtered on path **`/q/*/pay`** (and **`GET`**) to confirm traffic has dropped to an acceptable level; staging smoke **`curl -I`** on **`/q/{token}/pay`** should show **302** and **`Location`** ending in **`/q/{token}/accept`** until the file is removed.
