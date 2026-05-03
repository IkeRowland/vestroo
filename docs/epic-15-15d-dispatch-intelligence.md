# Epic 15 — Sub-epic **15D** dispatch intelligence (weights, calibration, flags)

Operational addendum for **Theme D / E — dispatch suggestions**: how scoring works (**Q26**), why suggestions stay advisory (**Q25**), where to change weights, how to read calibration data, and how to **roll back** the feature without a code deploy. For full epic intent see **[`docs/epic-15.md`](epic-15.md)** (Theme **D**, **Q25–Q27**, **§6** risk table, **§7** DoD, **§8** code pointers).

---

## 1. Purpose — advisory suggestions (**Q25** / **US-D1**)

Dispatch **suggestions** on Fulfil are **recommendations only**: the panel may rank up to three vehicles with a score and short rationale. A dispatcher may **ignore** them, pick another vehicle from the dropdown, and still **must** use **Create trip and link booking** — there is **no auto-assign** in Epic 15 (**Q25**, **US-D1** in [`docs/epic-15.md`](epic-15.md)).

That design mitigates the **§6** risk that suggestions could bias ops away from strategic choices (e.g. VIP handling): **free-pick** remains one click away at all times, and calibration data distinguishes paths taken after a human decision (see §4).

---

## 2. Locked weighted formula (**Q26** / **US-D2**)

The overall suggestion **score** is a **weighted sum** of four sub-signals. Each sub-signal is **normalised to 0–100** (clamped) **before** weights are applied; the implementation rounds to an integer **0–100** overall (see **`Suggestion`** in [`src/lib/dispatch-suggestions.ts`](../src/lib/dispatch-suggestions.ts)).

**Formula (locked ratios per epic Q26):**

`0.4 × capacityFit + 0.2 × scheduleGap + 0.2 × chauffeurFamiliarity + 0.2 × costTierAlignment`

| Sub-signal (concept) | Role in plain language | Exported weight constant |
|----------------------|-------------------------|---------------------------|
| **Capacity fit** | How well vehicle capacity matches the booking passenger count / remaining seats | **`WEIGHT_CAPACITY`** = `0.4` |
| **Schedule gap** | Favour vehicles with less recent use in the booking window (spacing / utilisation) | **`WEIGHT_SCHEDULE`** = `0.2` |
| **Chauffeur familiarity** | Proxy for pairing / experience with the run (caller-supplied 0–100) | **`WEIGHT_CHAUFFEUR`** = `0.2` |
| **Cost tier alignment** | Alignment between booking and vehicle cost tier (neutral when unknown) | **`WEIGHT_COST`** = `0.2` |

**Source of truth for the numbers:** [`src/lib/dispatch-suggestions-config.ts`](../src/lib/dispatch-suggestions-config.ts) — only the four **`WEIGHT_*`** exports above; sub-signal computation and thin-data relaxation live in [`src/lib/dispatch-suggestions.ts`](../src/lib/dispatch-suggestions.ts).

---

## 3. Where weights live and how they may change (**Q26**)

- **Location:** [`src/lib/dispatch-suggestions-config.ts`](../src/lib/dispatch-suggestions-config.ts).
- **Process:** Any change to weights is a **Git pull request** with normal **code review** — there is **no** database table, admin UI, or runtime knob for weights (**Q26**). That keeps tuning **auditable** and avoids silent production drift.

---

## 4. Calibration — staff report and audit discrimination

**Staff UI (rolling window, counts, %, rank):** open **`/ops/reports/suggestions`** (implemented in **[`docs/stories/15.30.story.md`](stories/15.30.story.md)**). Use that page for rolling-window aggregates and denominator rules documented there (calibration assign-audit row set).

**Audit discrimination (`15D.3`):** On successful assign, **`ops_audit_log`** records either:

- **`assignment_from_suggestion`** — validated suggestion path (payload includes server-bound **`rank`**, **`score`**, **`vehicle_id`**, plus booking/trip/run/chauffeur ids per **[`docs/stories/15.29.story.md`](stories/15.29.story.md)**), or  
- **`assignment_free_pick`** — no validated suggestion bind for that assign.

Do **not** treat every assign-related audit line as the same population; the calibration report intentionally filters to this pair. For ad-hoc analysis, an example filter:

```sql
SELECT action,
       created_at,
       payload->>'booking_id' AS booking_id,
       payload->>'vehicle_id' AS vehicle_id
FROM public.ops_audit_log
WHERE action IN ('assignment_from_suggestion', 'assignment_free_pick')
  AND created_at >= (now() AT TIME ZONE 'utc') - interval '30 days'
ORDER BY created_at DESC;
```

(`payload` keys match shipped **`15.29`** / `assignBookingToRun` — survey migrations only if you extend the schema.)

---

## 5. Feature flag and rollback (**§7**)

**Canonical env var (server-only):** **`DISPATCH_SUGGESTIONS_ENABLED`**

- Parsed in [`src/lib/dispatch-suggestions-env.ts`](../src/lib/dispatch-suggestions-env.ts) (truthy: `1`, `true`, `yes`, `on` — case-insensitive after trim; unset/false-like → off).
- Documented in [`.env.example`](../.env.example) (Epic **15D.2** comment block). There is **no** `NEXT_PUBLIC_*` toggle for this flag — the panel is evaluated on the **server** when rendering Fulfil.

**Rollback in production:** Set **`DISPATCH_SUGGESTIONS_ENABLED`** to **off** (unset, `0`, or `false`) in the deployment environment and **redeploy or restart** the Next.js app so the env is picked up. The Fulfil assign flow **continues** as **free-pick only** (suggestions UI hidden); no **code revert** is required for this kill-switch (**[`docs/epic-15.md`](epic-15.md)** §7 — config change).

---

## 6. Testing pointers

- **Unit:** [`src/lib/__tests__/dispatch-suggestions.test.ts`](../src/lib/__tests__/dispatch-suggestions.test.ts) — scoring, ordering, exclusions, thin-data behaviour.
- **E2E (Playwright):** [`tests/e2e/epic15-15d5-dispatch-suggestions-e2e.spec.ts`](../tests/e2e/epic15-15d5-dispatch-suggestions-e2e.spec.ts) — staff Fulfil + suggestions, audit assertions via service role, report smoke; env pattern in **`.env.test.example`** (**[`docs/stories/15.31.story.md`](stories/15.31.story.md)**).

---

## 7. Pilot and feedback (**§7**)

Epic **§7** expects each sub-epic to be validated with **at least 1–2 pilot accounts or trips** before general availability, with short feedback captured in retro / changelog habit ([`docs/epic-15.md`](epic-15.md) §7 **Pilot**). For **15D**, run a bounded pilot on real dispatch traffic: watch **`/ops/reports/suggestions`**, review **`assignment_from_suggestion` vs `assignment_free_pick`** mix, and file follow-up **stories** (not silent weight edits) if the formula needs change. The epic’s recommended sequencing also suggests validating **15A** with pilots first, then parallelising other sub-epics once that signal is good — apply the same discipline when turning **`DISPATCH_SUGGESTIONS_ENABLED`** wide on.

---

## See also

- **[`docs/epic-15.md`](epic-15.md)** — Theme **D** (**US-D1–D3**), **Q25–Q27**, **§6** (weights / bias risks), **§7** (docs, flags, rollback, pilot), **§8** (15D file paths).
- **[`docs/stories/15.27.story.md`](stories/15.27.story.md)** — **`15D.1`** algorithm + config module.
- **[`docs/stories/15.28.story.md`](stories/15.28.story.md)** — **`15D.2`** Fulfil panel + flag wiring.
- **[`docs/stories/15.29.story.md`](stories/15.29.story.md)** — **`15D.3`** audit actions and payload.
- **[`docs/stories/15.30.story.md`](stories/15.30.story.md)** — **`15D.4`** calibration report route.
- **[`docs/stories/15.31.story.md`](stories/15.31.story.md)** — **`15D.5`** E2E suite and env gates.
