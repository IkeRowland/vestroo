# Chauffeur → Driver grep audit (Theme L / US-L1)

## Sign-off and metadata

| Field | Value |
|-------|-------|
| **Date** | 2026-04-26 |
| **Commit** | `ede6927437c979d0edf7c9557f0fd6a8844906d3` (refresh: `git rev-parse HEAD`) |
| **Sign-off** | **Done (US-L3 complete, 2026-04-26)** — scoped TSX/HTML grep gate clean; residual `chauffeur` substrings remain only outside gate paths (e.g. `src/lib`, `src/actions` module names per Q34/US-L4) |
| **Context rule** | **5 characters before + 5 after** the matched token on the same line (whitespace normalized to single spaces in this table; pipes escaped). |

### Commands used (reproducible)

PowerShell / Node from repository root (Windows; `rg` not required):

```text
node scripts/chauffeur-audit-collect.mjs
node scripts/build-chauffeur-audit-md.mjs
```

Equivalent intent to epic **US-L1** `rg -n "Chauffeur|chauffeur"` per path layer; collector walks the same epic globs (Documentation excludes `docs/capstone-reference/` — covered under **Capstone** rows).

## Product locks (cite in US-L3)

- **Q21** — UI display label **Driver**; DB enum `chauffeur` unchanged until [Epic 17](../epic-17.md).
- **Q25** — **Retired** per **[`docs/epic-16.md`](../../epic-16.md)**; treat like any other row unless legal requests a bespoke label (document separately).

- **US-L3 triage:** apply **rename to driver** where product copy is customer- or staff-facing; keep **DB literals** flagged per **Q34**.
- **Q34** — No DB-level rename in Epic 16; type definitions under src/types and schema-aligned literals → **keep — DB scope deferred to Epic 17** (or **rename to driver** only for pure UI strings in types if any appear later).
- **Q41** (optional) — [US-L2 in Epic 16 Theme L](../epic-16.md) / `role-display.ts` — not implemented in L1.

## Proposed action enums (from epic)

| Enum | Use |
|------|-----|
| **rename to driver** | User-visible copy, emails, docs (non-capstone), non-DB identifiers where safe in Epic 16 |
| **keep — DB scope deferred to Epic 17** | `ProfileRole`, column names, RPC identifiers, generated types |
| **keep — capstone reference** | `src/legacy/capstone-reference/**`, `docs/capstone-reference/**` |
| **keep — historical migration** | `supabase/migrations/**` — immutable |

## US-L3 closure (2026-04-26)

**Story:** [`docs/stories/16.7.story.md`](../stories/16.7.story.md) (**Theme L / US-L3**).

**Epic grep gate (scoped trees):** `Get-ChildItem -Path src/app,src/features,src/components -Recurse -Include *.tsx,*.html -File | Select-String -Pattern 'chauffeur' -SimpleMatch -CaseSensitive:$false` → **no matches** (baseline after merge).

**Out of gate scope (documented):** `src/lib/**`, `src/actions/**` (e.g. `fieldChauffeur.ts`, `resolve-chauffeur-assignment.ts`, DB column literals in `.ts` helpers), `src/types`, migrations, docs — per **Q34** / **US-L4** deferral; identifiers may still contain the substring until Epic 17.

---

## Next: follow-on

**US-L4 / Epic 17** — module and schema renames as separate epics; this audit remains historical SSOT for L1 inventory.

## Future work (Epic 17)

Identifier and module renames deferred from Epic **16** Theme **L** / **US-L4** (see **[Epic 17 — schema rename](../epic-17.md)** for planning). Epic **16** does **not** rename these paths:

- `src/actions/fieldChauffeur.ts`
- `src/lib/chauffeur-trip-transitions.ts`
- `src/lib/resolve-chauffeur-assignment.ts`
- `getChauffeurForAction` (e.g. `src/actions/fieldLocation.ts` and other callers)
- Broader DB/schema-aligned identifiers (`chauffeur_*` columns, RPC names, generated types) per **Q34**

**Story 16.8 (L4 optional filename rename, 2026-04-26):** `src/features/ops/components/ChauffeurRoster.tsx` was **absent** in-repo; **`git mv` → `DriverRoster.tsx` N/A**. Ops roster UI is **inline** in `src/app/(ops)/ops/roster/page.tsx` (no standalone `ChauffeurRoster` / `DriverRoster` component file).

---

## Layer: rollup (Documentation, Migrations, Lib/helpers, Server actions, Tests)

_Rationale (AC2): **one row per file** with **match count**; full line-level hits available by re-running the collector TSV._

| Layer | File path | Match count | First line | Context (first hit, 5+5) | Representative token | Proposed action | Exception |
|-------|-----------|-------------|------------|---------------------------|------------------------|-----------------|-----------|
| Documentation | `docs/adr/0001-ops-field-ui-stack-tailwind-radix.md` | 1 | 9 | `** (chauffeur web) | `chauffeur` | rename to driver (per-layer default; triage per file in US-L3) |  |
| Documentation | `docs/adr/0002-patterned-shuttle-domain-sh9-2.md` | 5 | 20 | ** \\| Chauffeur + ve | `Chauffeur` | rename to driver (per-layer default; triage per file in US-L3) |  |
| Documentation | `docs/adr/0003-service-run-capacity-holds-sh9-3.md` | 3 | 60 | kets_chauffeur_run_ | `chauffeur` | rename to driver (per-layer default; triage per file in US-L3) |  |
| Documentation | `docs/adr/0004-patterned-run-realtime-sh9-4.md` | 10 | 16 | blic.chauffeur_assi | `chauffeur` | rename to driver (per-layer default; triage per file in US-L3) |  |
| Documentation | `docs/adr/0006-rls-cross-table-helpers.md` | 15 | 35 | e_to_chauffeur_via_ | `chauffeur` | rename to driver (per-layer default; triage per file in US-L3) |  |
| Documentation | `docs/capstone-admin-to-ops-mapping.md` | 1 | 34 | ff / chauffeur prof | `chauffeur` | rename to driver (per-layer default; triage per file in US-L3) |  |
| Documentation | `docs/capstone-auth-keytoken-otp-parity.md` | 3 | 24 | fieldChauffeur.ts`* | `Chauffeur` | rename to driver (per-layer default; triage per file in US-L3) |  |
| Documentation | `docs/capstone-backend-module-matrix.md` | 139 | 40 | me \\| Chauffeur **ro | `Chauffeur` | rename to driver (per-layer default; triage per file in US-L3) |  |
| Documentation | `docs/capstone-domain/driverSchedule.md` | 1 | 1 | # Chauffeur sche | `Chauffeur` | rename to driver (per-layer default; triage per file in US-L3) |  |
| Documentation | `docs/capstone-domain/productContext.md` | 2 | 12 | eet, chauffeurs, sc | `chauffeur` | rename to driver (per-layer default; triage per file in US-L3) |  |
| Documentation | `docs/capstone-driver-to-field-mapping.md` | 35 | 3 | quireChauffeurPage` | `Chauffeur` | rename to driver (per-layer default; triage per file in US-L3) |  |
| Documentation | `docs/capstone-manager-to-vestroo-mapping.md` | 13 | 40 | `** (chauffeur list | `chauffeur` | rename to driver (per-layer default; triage per file in US-L3) |  |
| Documentation | `docs/capstone-nest-rest-to-vestroo-mapping.md` | 8 | 23 | quireChauffeurPage` | `Chauffeur` | rename to driver (per-layer default; triage per file in US-L3) |  |
| Documentation | `docs/capstone-reference-path-map.md` | 2 | 9 | bile chauffeur app  | `chauffeur` | keep — capstone reference | capstone |
| Documentation | `docs/capstone-reference-stack-integration.md` | 8 | 22 | *, **chauffeurs**,  | `chauffeur` | keep — capstone reference | capstone |
| Documentation | *(retired doc path removed)* | — | — | — | — | **n/a** |  |
| Documentation | `docs/compliance-and-safety.md` | 8 | 12 | ises chauffeur-visi | `chauffeur` | rename to driver (per-layer default; triage per file in US-L3) |  |
| Documentation | `docs/data-models.md` | 85 | 9 | , **`chauffeur`**,  | `chauffeur` | rename to driver (per-layer default; triage per file in US-L3) |  |
| Documentation | `docs/epic-11.md` | 5 | 21 | ** **Chauffeur → Dr | `Chauffeur` | rename to driver (per-layer default; triage per file in US-L3) |  |
| Documentation | `docs/epic-13.md` | 1 | 125 | ory, chauffeur full | `chauffeur` | rename to driver (per-layer default; triage per file in US-L3) |  |
| Documentation | `docs/epic-15-15d-dispatch-intelligence.md` | 3 | 21 | .2 × chauffeurFamil | `chauffeur` | rename to driver (per-layer default; triage per file in US-L3) |  |
| Documentation | `docs/epic-15.md` | 15 | 18 | , or chauffeur avai | `chauffeur` | rename to driver (per-layer default; triage per file in US-L3) |  |
| Documentation | `docs/epic-16.md` | 95 | 5 |  the Chauffeur → Dr | `Chauffeur` | rename to driver (per-layer default; triage per file in US-L3) |  |
| Documentation | `docs/epic-4.md` | 13 | 13 | gn **chauffeurs**,  | `chauffeur` | rename to driver (per-layer default; triage per file in US-L3) |  |
| Documentation | `docs/epic-5.md` | 9 | 5 | ort, chauffeured an | `chauffeur` | rename to driver (per-layer default; triage per file in US-L3) |  |
| Documentation | `docs/epic-7.md` | 2 | 26 | f vs chauffeur vs c | `chauffeur` | rename to driver (per-layer default; triage per file in US-L3) |  |
| Documentation | `docs/epic-9.md` | 3 | 5 |  and chauffeured tr | `chauffeur` | rename to driver (per-layer default; triage per file in US-L3) |  |
| Documentation | `docs/field-tools.md` | 30 | 1 | ols (chauffeur web) | `chauffeur` | rename to driver (per-layer default; triage per file in US-L3) |  |
| Documentation | `docs/front-end-api-interaction.md` | 22 | 17 | , **`chauffeur_assi | `chauffeur` | rename to driver (per-layer default; triage per file in US-L3) |  |
| Documentation | `docs/fulfil-queue-buckets.md` | 1 | 28 | run, chauffeur, veh | `chauffeur` | rename to driver (per-layer default; triage per file in US-L3) |  |
| Documentation | `docs/index.md` | 2 | 25 | quireChauffeurPage` | `Chauffeur` | rename to driver (per-layer default; triage per file in US-L3) |  |
| Documentation | `docs/integrations-and-payments.md` | 2 | 307 | ent; chauffeur run  | `chauffeur` | rename to driver (per-layer default; triage per file in US-L3) |  |
| Documentation | `docs/local-development.md` | 11 | 103 | , **`chauffeur`**,  | `chauffeur` | rename to driver (per-layer default; triage per file in US-L3) |  |
| Documentation | `docs/ops-console.md` | 9 | 32 | un + chauffeur + ve | `chauffeur` | rename to driver (per-layer default; triage per file in US-L3) |  |
| Documentation | `docs/patterned-run-live-ops-mapping.md` | 11 | 11 | , **`chauffeur_assi | `chauffeur` | rename to driver (per-layer default; triage per file in US-L3) |  |
| Documentation | `docs/project-structure.md` | 1 | 16 |  # Chauffeur fiel | `Chauffeur` | rename to driver (per-layer default; triage per file in US-L3) |  |
| Documentation | `docs/realtime-and-notifications.md` | 23 | 11 | in \\| Chauffeur \\| Cu | `Chauffeur` | rename to driver (per-layer default; triage per file in US-L3) |  |
| Documentation | `docs/staging-and-promotion.md` | 18 | 120 | urly chauffeur hire | `chauffeur` | rename to driver (per-layer default; triage per file in US-L3) |  |
| Documentation | `docs/stories/11.1.story.md` | 6 | 15 | ):** Chauffeur → Dr | `Chauffeur` | rename to driver (per-layer default; triage per file in US-L3) |  |
| Documentation | `docs/stories/11.2.story.md` | 1 | 15 | ):** Chauffeur → Dr | `Chauffeur` | rename to driver (per-layer default; triage per file in US-L3) |  |
| Documentation | `docs/stories/11.3.story.md` | 1 | 15 | ):** Chauffeur → Dr | `Chauffeur` | rename to driver (per-layer default; triage per file in US-L3) |  |
| Documentation | `docs/stories/11.4.story.md` | 1 | 15 | ):** Chauffeur → Dr | `Chauffeur` | rename to driver (per-layer default; triage per file in US-L3) |  |
| Documentation | `docs/stories/11.5.story.md` | 1 | 15 | ):** Chauffeur → Dr | `Chauffeur` | rename to driver (per-layer default; triage per file in US-L3) |  |
| Documentation | `docs/stories/11.6.story.md` | 11 | 13 | ):** Chauffeur → Dr | `Chauffeur` | rename to driver (per-layer default; triage per file in US-L3) |  |
| Documentation | `docs/stories/11.7.story.md` | 1 | 13 | ):** Chauffeur → Dr | `Chauffeur` | rename to driver (per-layer default; triage per file in US-L3) |  |
| Documentation | `docs/stories/12.8.story.md` | 2 | 18 | ings_chauffeur_rls_ | `chauffeur` | rename to driver (per-layer default; triage per file in US-L3) |  |
| Documentation | `docs/stories/13.3.story.md` | 1 | 119 | ks / chauffeur row) | `chauffeur` | rename to driver (per-layer default; triage per file in US-L3) |  |
| Documentation | `docs/stories/13.7.story.md` | 3 | 31 | *, **chauffeur full | `chauffeur` | rename to driver (per-layer default; triage per file in US-L3) |  |
| Documentation | `docs/stories/14.10.story.md` | 1 | 106 | role=chauffeur`**,  | `chauffeur` | rename to driver (per-layer default; triage per file in US-L3) |  |
| Documentation | `docs/stories/15.11.story.md` | 1 | 40 | `**, chauffeur-link | `chauffeur` | rename to driver (per-layer default; triage per file in US-L3) |  |
| Documentation | `docs/stories/15.12.story.md` | 1 | 30 | ate, chauffeur_id,  | `chauffeur` | rename to driver (per-layer default; triage per file in US-L3) |  |
| Documentation | `docs/stories/15.13.story.md` | 13 | 18 | ** — Chauffeur-side | `Chauffeur` | rename to driver (per-layer default; triage per file in US-L3) |  |
| Documentation | `docs/stories/15.14.story.md` | 9 | 19 | ** — chauffeur “liv | `chauffeur` | rename to driver (per-layer default; triage per file in US-L3) |  |
| Documentation | `docs/stories/15.15.story.md` | 6 | 17 | ** — chauffeur **“L | `chauffeur` | rename to driver (per-layer default; triage per file in US-L3) |  |
| Documentation | `docs/stories/15.16.story.md` | 24 | 1 | .16: Chauffeur-side | `Chauffeur` | rename to driver (per-layer default; triage per file in US-L3) |  |
| Documentation | `docs/stories/15.18.story.md` | 3 | 18 | when chauffeur auth | `chauffeur` | rename to driver (per-layer default; triage per file in US-L3) |  |
| Documentation | `docs/stories/15.19.story.md` | 2 | 40 | ). **Chauffeur** /  | `Chauffeur` | rename to driver (per-layer default; triage per file in US-L3) |  |
| Documentation | `docs/stories/15.20.story.md` | 1 | 115 | ; **`chauffeur`** n | `chauffeur` | rename to driver (per-layer default; triage per file in US-L3) |  |
| Documentation | `docs/stories/15.27.story.md` | 4 | 12 |  and chauffeur data | `chauffeur` | rename to driver (per-layer default; triage per file in US-L3) |  |
| Documentation | `docs/stories/15.28.story.md` | 1 | 102 | / **`chauffeurFamil | `chauffeur` | rename to driver (per-layer default; triage per file in US-L3) |  |
| Documentation | `docs/stories/15.29.story.md` | 1 | 111 | d`, `chauffeur_id`, | `chauffeur` | rename to driver (per-layer default; triage per file in US-L3) |  |
| Documentation | `docs/stories/15.31.story.md` | 1 | 112 | d`, `chauffeur_id`, | `chauffeur` | rename to driver (per-layer default; triage per file in US-L3) |  |
| Documentation | `docs/stories/15.32.story.md` | 1 | 44 | .2 × chauffeur fami | `chauffeur` | rename to driver (per-layer default; triage per file in US-L3) |  |
| Documentation | `docs/stories/16.1.story.md` | 48 | 15 | kets_chauffeur_run_ | `chauffeur` | rename to driver (per-layer default; triage per file in US-L3) |  |
| Documentation | `docs/stories/16.3.story.md` | 8 | 13 | _run_chauffeur`** a | `chauffeur` | rename to driver (per-layer default; triage per file in US-L3) |  |
| Documentation | `docs/stories/16.4.story.md` | 2 | 50 | , **`chauffeur_assi | `chauffeur` | rename to driver (per-layer default; triage per file in US-L3) |  |
| Documentation | `docs/stories/16.5.story.md` | 51 | 1 | 6.5: Chauffeur → Dr | `Chauffeur` | rename to driver (per-layer default; triage per file in US-L3) |  |
| Documentation | `docs/stories/5.1.story.md` | 4 | 19 | quireChauffeurPage` | `Chauffeur` | rename to driver (per-layer default; triage per file in US-L3) |  |
| Documentation | `docs/stories/5.10.story.md` | 1 | 15 | quireChauffeurPage` | `Chauffeur` | rename to driver (per-layer default; triage per file in US-L3) |  |
| Documentation | `docs/stories/5.11.story.md` | 14 | 11 | *`** chauffeur **fe | `chauffeur` | rename to driver (per-layer default; triage per file in US-L3) |  |
| Documentation | `docs/stories/5.4.story.md` | 2 | 92 | , **`chauffeur_sche | `chauffeur` | rename to driver (per-layer default; triage per file in US-L3) |  |
| Documentation | `docs/stories/5.5.story.md` | 4 | 17 | from chauffeur shif | `chauffeur` | rename to driver (per-layer default; triage per file in US-L3) |  |
| Documentation | `docs/stories/5.6.story.md` | 25 | 1 | eld (chauffeur) web | `chauffeur` | rename to driver (per-layer default; triage per file in US-L3) |  |
| Documentation | `docs/stories/5.7.story.md` | 7 | 11 | quireChauffeurPage( | `Chauffeur` | rename to driver (per-layer default; triage per file in US-L3) |  |
| Documentation | `docs/stories/5.8.story.md` | 5 | 11 | quireChauffeurPage( | `Chauffeur` | rename to driver (per-layer default; triage per file in US-L3) |  |
| Documentation | `docs/stories/5.9.story.md` | 2 | 13 | quireChauffeurPage` | `Chauffeur` | rename to driver (per-layer default; triage per file in US-L3) |  |
| Documentation | `docs/stories/6.2.story.md` | 1 | 27 | g. **chauffeur** /  | `chauffeur` | rename to driver (per-layer default; triage per file in US-L3) |  |
| Documentation | `docs/stories/6.3.story.md` | 2 | 28 | * if chauffeur path | `chauffeur` | rename to driver (per-layer default; triage per file in US-L3) |  |
| Documentation | `docs/stories/6.5.story.md` | 3 | 19 | quireChauffeurPage` | `Chauffeur` | rename to driver (per-layer default; triage per file in US-L3) |  |
| Documentation | `docs/stories/6.7.story.md` | 3 | 5 | vs **chauffeur**; * | `chauffeur` | rename to driver (per-layer default; triage per file in US-L3) |  |
| Documentation | `docs/stories/7.1.story.md` | 7 | 24 | ff / chauffeur / cu | `chauffeur` | rename to driver (per-layer default; triage per file in US-L3) |  |
| Documentation | `docs/stories/7.2.story.md` | 15 | 9 | ** — chauffeur rout | `chauffeur` | rename to driver (per-layer default; triage per file in US-L3) |  |
| Documentation | `docs/stories/7.3.story.md` | 12 | 5 |  for chauffeur–cust | `chauffeur` | rename to driver (per-layer default; triage per file in US-L3) |  |
| Documentation | `docs/stories/7.4.story.md` | 5 | 11 | ff / chauffeur / cu | `chauffeur` | rename to driver (per-layer default; triage per file in US-L3) |  |
| Documentation | `docs/stories/7.5.story.md` | 23 | 5 | — **`chauffeur_sche | `chauffeur` | rename to driver (per-layer default; triage per file in US-L3) |  |
| Documentation | `docs/stories/7.6.story.md` | 5 | 13 |  ops/chauffeur/cust | `chauffeur` | rename to driver (per-layer default; triage per file in US-L3) |  |
| Documentation | `docs/stories/8.5.story.md` | 1 | 30 | `**, chauffeur **`( | `chauffeur` | rename to driver (per-layer default; triage per file in US-L3) |  |
| Documentation | `docs/stories/9.1.story.md` | 1 | 17 | mand chauffeured**  | `chauffeur` | rename to driver (per-layer default; triage per file in US-L3) |  |
| Documentation | `docs/stories/9.2.story.md` | 4 | 7 | , **`chauffeur_assi | `chauffeur` | rename to driver (per-layer default; triage per file in US-L3) |  |
| Documentation | `docs/stories/9.3.story.md` | 2 | 43 | *, **chauffeur**, * | `chauffeur` | rename to driver (per-layer default; triage per file in US-L3) |  |
| Documentation | `docs/stories/9.4.story.md` | 17 | 7 | , **`chauffeur_assi | `chauffeur` | rename to driver (per-layer default; triage per file in US-L3) |  |
| Documentation | `docs/stories/9.6.story.md` | 1 | 25 | *, **chauffeur**, * | `chauffeur` | rename to driver (per-layer default; triage per file in US-L3) |  |
| Documentation | `docs/stories/vst-11.story.md` | 11 | 5 | y**: chauffeurs and | `chauffeur` | rename to driver (per-layer default; triage per file in US-L3) |  |
| Documentation | `docs/stories/vst-12.story.md` | 14 | 9 | , **`chauffeurs`**, | `chauffeur` | rename to driver (per-layer default; triage per file in US-L3) |  |
| Documentation | `docs/stories/vst-4.story.md` | 2 | 17 | * (**chauffeur**, * | `chauffeur` | rename to driver (per-layer default; triage per file in US-L3) |  |
| Documentation | `docs/stories/vst-5.story.md` | 24 | 15 | *, **chauffeurs**,  | `chauffeur` | rename to driver (per-layer default; triage per file in US-L3) |  |
| Documentation | `docs/stories/vst-6.story.md` | 5 | 19 | *, **chauffeur**, * | `chauffeur` | rename to driver (per-layer default; triage per file in US-L3) |  |
| Documentation | `docs/stories/vst-7.story.md` | 31 | 5 | , **`chauffeur`**,  | `chauffeur` | rename to driver (per-layer default; triage per file in US-L3) |  |
| Documentation | `docs/stories/vst-8.story.md` | 59 | 5 | S**: chauffeurs are | `chauffeur` | rename to driver (per-layer default; triage per file in US-L3) |  |
| Documentation | `docs/stories/vst-9.story.md` | 16 | 9 | so **chauffeurs** u | `chauffeur` | rename to driver (per-layer default; triage per file in US-L3) |  |
| Lib/helpers | `src/lib/__tests__/chauffeur-trip-transitions.test.ts` | 12 | 4 | ssertChauffeurTripT | `Chauffeur` | mixed — US-L3 triage (identifiers + copy) |  |
| Lib/helpers | `src/lib/__tests__/dispatch-suggestions.test.ts` | 5 | 49 |  chauffeurFamil | `chauffeur` | mixed — US-L3 triage (identifiers + copy) |  |
| Lib/helpers | `src/lib/__tests__/operational-notifications.test.ts` | 11 | 5 | buildChauffeurTripS | `Chauffeur` | mixed — US-L3 triage (identifiers + copy) |  |
| Lib/helpers | `src/lib/__tests__/ops-assign-booking-audit-path.test.ts` | 4 | 9 | onst chauffeurId =  | `chauffeur` | mixed — US-L3 triage (identifiers + copy) |  |
| Lib/helpers | `src/lib/__tests__/ops-time-windows.test.ts` | 8 | 4 |  findChauffeurWindo | `Chauffeur` | mixed — US-L3 triage (identifiers + copy) |  |
| Lib/helpers | `src/lib/__tests__/realtime-channels.test.ts` | 8 | 5 |  chauffeurAssig | `chauffeur` | mixed — US-L3 triage (identifiers + copy) |  |
| Lib/helpers | `src/lib/__tests__/sh94-migration-ac6.test.ts` | 1 | 20 | lic\.chauffeur_assi | `chauffeur` | mixed — US-L3 triage (identifiers + copy) |  |
| Lib/helpers | `src/lib/account-trip-confirmation-email-data.ts` | 10 | 46 |  chauffeur_id?: | `chauffeur` | mixed — US-L3 triage (identifiers + copy) |  |
| Lib/helpers | `src/lib/booking-quote-trip-confirmation-email.ts` | 1 | 14 | ate, chauffeur_id,  | `chauffeur` | mixed — US-L3 triage (identifiers + copy) |  |
| Lib/helpers | `src/lib/chauffeur-trip-transitions.ts` | 5 | 4 |  * Chauffeur fiel | `Chauffeur` | mixed — US-L3 triage (identifiers + copy) |  |
| Lib/helpers | `src/lib/comms/preview-seed.ts` | 2 | 19 |  chauffeur_name | `chauffeur` | mixed — US-L3 triage (identifiers + copy) |  |
| Lib/helpers | `src/lib/comms/recipient-resolve.ts` | 2 | 60 | === 'chauffeur') { | `chauffeur` | mixed — US-L3 triage (identifiers + copy) |  |
| Lib/helpers | `src/lib/dispatch-suggestions-config.ts` | 2 | 3 | gap, chauffeur fami | `chauffeur` | mixed — US-L3 triage (identifiers + copy) |  |
| Lib/helpers | `src/lib/dispatch-suggestions.ts` | 15 | 58 |  chauffeurFamil | `chauffeur` | mixed — US-L3 triage (identifiers + copy) |  |
| Lib/helpers | `src/lib/email/__tests__/account-trip-confirmation.test.ts` | 3 | 19 |  chauffeurFullN | `chauffeur` | mixed — US-L3 triage (identifiers + copy) |  |
| Lib/helpers | `src/lib/email/templates/account-member-invite.ts` | 1 | 60 | troo Chauffeur Serv | `Chauffeur` | mixed — US-L3 triage (identifiers + copy) |  |
| Lib/helpers | `src/lib/email/templates/account-trip-confirmation.ts` | 5 | 19 |  chauffeurFullN | `chauffeur` | mixed — US-L3 triage (identifiers + copy) |  |
| Lib/helpers | `src/lib/email/templates/walk-in-quote.ts` | 1 | 117 | troo Chauffeur Serv | `Chauffeur` | mixed — US-L3 triage (identifiers + copy) |  |
| Lib/helpers | `src/lib/field-auth.ts` | 14 | 6 | type ChauffeurSessi | `Chauffeur` | mixed — US-L3 triage (identifiers + copy) |  |
| Lib/helpers | `src/lib/field-en-route-rider-sms.ts` | 1 | 3 |  the chauffeur Serv | `chauffeur` | mixed — US-L3 triage (identifiers + copy) |  |
| Lib/helpers | `src/lib/fulfil-queue-buckets.ts` | 1 | 112 | run, chauffeur, and | `chauffeur` | mixed — US-L3 triage (identifiers + copy) |  |
| Lib/helpers | `src/lib/operational-notifications.ts` | 6 | 25 |  chauffeurId: s | `chauffeur` | mixed — US-L3 triage (identifiers + copy) |  |
| Lib/helpers | `src/lib/ops-assign-booking-audit-path.ts` | 5 | 23 |  chauffeur_id:  | `chauffeur` | mixed — US-L3 triage (identifiers + copy) |  |
| Lib/helpers | `src/lib/ops-compliance-schemas.ts` | 4 | 20 | onst chauffeurCompl | `chauffeur` | mixed — US-L3 triage (identifiers + copy) |  |
| Lib/helpers | `src/lib/ops-time-windows.ts` | 7 | 50 | type ChauffeurTripL | `Chauffeur` | mixed — US-L3 triage (identifiers + copy) |  |
| Lib/helpers | `src/lib/pricing-env.ts` | 1 | 2 | mium chauffeured de | `chauffeur` | mixed — US-L3 triage (identifiers + copy) |  |
| Lib/helpers | `src/lib/resolve-chauffeur-assignment.ts` | 7 | 4 |  chauffeur_id:  | `chauffeur` | mixed — US-L3 triage (identifiers + copy) |  |
| Lib/helpers | `src/lib/supabase/realtime.ts` | 26 | 7 |  chauffeur_assi | `chauffeur` | mixed — US-L3 triage (identifiers + copy) |  |
| Lib/helpers | `src/lib/vehicle-tracking-throttle.ts` | 1 | 2 |  per chauffeur assi | `chauffeur` | mixed — US-L3 triage (identifiers + copy) |  |
| Migrations | `supabase/migrations/20260402133631_vestroo_rename_tables_and_columns.sql` | 4 | 17 | d to chauffeur_assi | `chauffeur` | keep — historical migration |  |
| Migrations | `supabase/migrations/20260402133646_vestroo_rls_policies_vestroo_domain.sql` | 2 | 28 | licy chauffeur_assi | `chauffeur` | keep — historical migration |  |
| Migrations | `supabase/migrations/20260402133703_vestroo_rls_policies_tracking_drivers.sql` | 14 | 5 | blic.chauffeur_assi | `chauffeur` | keep — historical migration |  |
| Migrations | `supabase/migrations/20260406103000_vestroo_profile_roles_chauffeur_columns_rls.sql` | 79 | 1 | mer, chauffeur, dis | `chauffeur` | keep — historical migration |  |
| Migrations | `supabase/migrations/20260406121000_vst6_seed_corporate_and_experience_patterns.sql` | 2 | 58 | ids, chauffeur_ids, | `chauffeur` | keep — historical migration |  |
| Migrations | `supabase/migrations/20260408120000_vst8_chauffeur_booking_rls_ops_audit_actor_role.sql` | 19 | 1 | T-8: Chauffeurs may | `Chauffeur` | keep — historical migration |  |
| Migrations | `supabase/migrations/20260409120000_vst9_realtime_notifications.sql` | 4 | 1 | ing, chauffeur→cust | `chauffeur` | keep — historical migration |  |
| Migrations | `supabase/migrations/20260410120000_vst10_experience_packages.sql` | 1 | 85 | vate chauffeured da | `chauffeur` | keep — historical migration |  |
| Migrations | `supabase/migrations/20260412120000_vst12_compliance_incidents_documents_retention.sql` | 26 | 1 | icle/chauffeur comp | `chauffeur` | keep — historical migration |  |
| Migrations | `supabase/migrations/20260417120000_sh92_service_run_manifest_entries.sql` | 4 | 42 | -- Chauffeur: rea | `Chauffeur` | keep — historical migration |  |
| Migrations | `supabase/migrations/20260418140000_sh93_service_run_capacity_holds.sql` | 4 | 457 | RLS: chauffeur may  | `chauffeur` | keep — historical migration |  |
| Migrations | `supabase/migrations/20260418150000_sh94_patterned_run_realtime.sql` | 4 | 8 | -- Chauffeurs / c | `Chauffeur` | keep — historical migration |  |
| Migrations | `supabase/migrations/20260418210000_e1_rls_bookings_booking_trips_recursion_fix.sql` | 12 | 3 | lect_chauffeur_link | `chauffeur` | keep — historical migration |  |
| Migrations | `supabase/migrations/20260419220000_reapply_e1_bookings_chauffeur_rls_recursion_fix.sql` | 12 | 1 | 1 E1 chauffeur visi | `chauffeur` | keep — historical migration |  |
| Migrations | `supabase/migrations/20260420140000_epic12_story128_bookings_insert_account_member_q3_rls.sql` | 1 | 7 | oles_chauffeur_colu | `chauffeur` | keep — historical migration |  |
| Migrations | `supabase/migrations/20260421120000_epic14_story144_quote_reject_audit_actor_v1.sql` | 2 | 14 | n', 'chauffeur', 'c | `chauffeur` | keep — historical migration |  |
| Migrations | `supabase/migrations/20260424220000_epic15_15a5_account_members_admin_rls_and_portal_audit.sql` | 2 | 66 | n', 'chauffeur', 'c | `chauffeur` | keep — historical migration |  |
| Migrations | `supabase/migrations/20260426104021_epic15_15c1_comms_templates_and_dispatch_rules.sql` | 2 | 107 |  'chauffeur', | `chauffeur` | keep — historical migration |  |
| Migrations | `supabase/migrations/20260426170000_ops16_service_runs_tickets_rls_helpers.sql` | 21 | 9 | OR — chauffeur on l | `chauffeur` | keep — historical migration |  |
| Migrations | `supabase/migrations/20260426180000_ops16_trips_booking_trips_rls_helpers.sql` | 26 | 12 | vst8_chauffeur_book | `chauffeur` | keep — historical migration |  |
| Server actions | `src/actions/__tests__/bookingQuoteOps.test.ts` | 2 | 551 | me: 'Chauffeur' },  | `Chauffeur` | mixed — US-L3 triage (identifiers + copy) |  |
| Server actions | `src/actions/__tests__/opsDispatchAssignAudit.test.ts` | 8 | 47 | onst chauffeurId =  | `chauffeur` | mixed — US-L3 triage (identifiers + copy) |  |
| Server actions | `src/actions/calculateHourlyQuote.ts` | 2 | 30 | ated chauffeur hire | `chauffeur` | mixed — US-L3 triage (identifiers + copy) |  |
| Server actions | `src/actions/fieldChauffeur.ts` | 24 | 2 | -11: Chauffeur/fiel | `Chauffeur` | mixed — US-L3 triage (identifiers + copy) |  |
| Server actions | `src/actions/fieldLocation.ts` | 13 | 5 | { getChauffeurForAc | `Chauffeur` | mixed — US-L3 triage (identifiers + copy) |  |
| Server actions | `src/actions/opsCompliance.ts` | 29 | 10 | reateChauffeurCompl | `Chauffeur` | mixed — US-L3 triage (identifiers + copy) |  |
| Server actions | `src/actions/opsDispatch.ts` | 59 | 26 |  findChauffeurWindo | `Chauffeur` | mixed — US-L3 triage (identifiers + copy) |  |
| Tests tests/ | `tests/e2e/epic15-15b8-rider-tracking-privacy.spec.ts` | 2 | 69 | tle="Chauffeur appr | `Chauffeur` | mixed — US-L3 triage (identifiers + copy) |  |
| Tests tests/ | `tests/e2e/epic15-15d5-dispatch-suggestions-e2e.spec.ts` | 1 | 187 | load.chauffeur_id). | `chauffeur` | mixed — US-L3 triage (identifiers + copy) |  |
| Tests tests/ | `tests/migrations/rls-no-recursion.spec.ts` | 24 | 15 |  * (chauffeur SELE | `chauffeur` | mixed — US-L3 triage (identifiers + copy) |  |



---

## Layer: UI src/app/(ops)

| File path | Line | Context (5+5 rule) | Current text | Proposed action | Exception |
|-----------|------|-------------------|----------------|-----------------|-----------|
| `src/app/(ops)/ops/board/page.tsx` | 23 | _id, chauffeur_id,  | `chauffeur` | keep — DB scope deferred to Epic 17 | Q34 |
| `src/app/(ops)/ops/compliance/page.tsx` | 35 | leet/chauffeur comp | `chauffeur` | mixed — US-L3 triage (likely identifier) |  |
| `src/app/(ops)/ops/compliance/page.tsx` | 112 | ring.chauffeurRows. | `chauffeur` | keep — DB scope deferred to Epic 17 | Q34 |
| `src/app/(ops)/ops/compliance/page.tsx` | 157 | ted">Chauffeurs</h3 | `Chauffeur` | rename to driver |  |
| `src/app/(ops)/ops/compliance/page.tsx` | 158 | ring.chauffeurRows. | `chauffeur` | keep — DB scope deferred to Epic 17 | Q34 |
| `src/app/(ops)/ops/compliance/page.tsx` | 163 | ion="Chauffeur comp | `Chauffeur` | rename to driver |  |
| `src/app/(ops)/ops/compliance/page.tsx` | 180 | ring.chauffeurRows. | `chauffeur` | keep — DB scope deferred to Epic 17 | Q34 |
| `src/app/(ops)/ops/compliance/page.tsx` | 185 | ng(r.chauffeur_id)} | `chauffeur` | keep — DB scope deferred to Epic 17 | Q34 |
| `src/app/(ops)/ops/fulfil/page.tsx` | 52 |  let chauffeurOptio | `chauffeur` | mixed — US-L3 triage (likely identifier) |  |
| `src/app/(ops)/ops/fulfil/page.tsx` | 60 |  chauffeursRes, | `chauffeur` | keep — DB scope deferred to Epic 17 | Q34 |
| `src/app/(ops)/ops/fulfil/page.tsx` | 81 | e', 'chauffeur') | `chauffeur` | mixed — US-L3 triage (likely identifier) |  |
| `src/app/(ops)/ops/fulfil/page.tsx` | 113 |  chauffeurOptio | `chauffeur` | mixed — US-L3 triage (likely identifier) |  |
| `src/app/(ops)/ops/fulfil/page.tsx` | 114 |  (chauffeursRes. | `chauffeur` | keep — DB scope deferred to Epic 17 | Q34 |
| `src/app/(ops)/ops/fulfil/page.tsx` | 224 |  chauffeurs={ch | `chauffeur` | keep — DB scope deferred to Epic 17 | Q34 |
| `src/app/(ops)/ops/fulfil/page.tsx` | 224 | urs={chauffeurOptio | `chauffeur` | mixed — US-L3 triage (likely identifier) |  |
| `src/app/(ops)/ops/roster/page.tsx` | 9 | ata: chauffeurs, er | `chauffeur` | keep — DB scope deferred to Epic 17 | Q34 |
| `src/app/(ops)/ops/roster/page.tsx` | 12 | e', 'chauffeur') | `chauffeur` | mixed — US-L3 triage (likely identifier) |  |
| `src/app/(ops)/ops/roster/page.tsx` | 18 | rom('chauffeur_sche | `chauffeur` | keep — DB scope deferred to Epic 17 | Q34 |
| `src/app/(ops)/ops/roster/page.tsx` | 19 | 'id, chauffeur_id,  | `chauffeur` | keep — DB scope deferred to Epic 17 | Q34 |
| `src/app/(ops)/ops/roster/page.tsx` | 27 | und">Chauffeur rost | `Chauffeur` | rename to driver |  |
| `src/app/(ops)/ops/roster/page.tsx` | 33 | hedByChauffeur = ne | `Chauffeur` | rename to driver |  |
| `src/app/(ops)/ops/roster/page.tsx` | 35 |  = s.chauffeur_id a | `chauffeur` | keep — DB scope deferred to Epic 17 | Q34 |
| `src/app/(ops)/ops/roster/page.tsx` | 36 | hedByChauffeur.has( | `Chauffeur` | rename to driver |  |
| `src/app/(ops)/ops/roster/page.tsx` | 36 | hedByChauffeur.set( | `Chauffeur` | rename to driver |  |
| `src/app/(ops)/ops/roster/page.tsx` | 37 | hedByChauffeur.get( | `Chauffeur` | rename to driver |  |
| `src/app/(ops)/ops/roster/page.tsx` | 42 | und">Chauffeur rost | `Chauffeur` | rename to driver |  |
| `src/app/(ops)/ops/roster/page.tsx` | 45 | le = chauffeur</cod | `chauffeur` | mixed — US-L3 triage (likely identifier) |  |
| `src/app/(ops)/ops/roster/page.tsx` | 49 |  chauffeur_sche | `chauffeur` | keep — DB scope deferred to Epic 17 | Q34 |
| `src/app/(ops)/ops/roster/page.tsx` | 61 |  {(chauffeurs ??  | `chauffeur` | keep — DB scope deferred to Epic 17 | Q34 |
| `src/app/(ops)/ops/roster/page.tsx` | 63 | hedByChauffeur.get( | `Chauffeur` | rename to driver |  |
| `src/app/(ops)/ops/roster/page.tsx` | 111 |  {(chauffeurs ??  | `chauffeur` | keep — DB scope deferred to Epic 17 | Q34 |
| `src/app/(ops)/ops/roster/page.tsx` | 112 | ">No chauffeur prof | `chauffeur` | mixed — US-L3 triage (likely identifier) |  |
| `src/app/(ops)/ops/trips/page.tsx` | 18 | _id, chauffeur_id,  | `chauffeur` | keep — DB scope deferred to Epic 17 | Q34 |
| `src/app/(ops)/ops/trips/page.tsx` | 48 | onst chauffeurIds = | `chauffeur` | mixed — US-L3 triage (likely identifier) |  |
| `src/app/(ops)/ops/trips/page.tsx` | 48 | => t.chauffeur_id a | `chauffeur` | keep — DB scope deferred to Epic 17 | Q34 |
| `src/app/(ops)/ops/trips/page.tsx` | 50 | onst chauffeurNameB | `chauffeur` | keep — DB scope deferred to Epic 17 | Q34 |
| `src/app/(ops)/ops/trips/page.tsx` | 51 |  if (chauffeurIds.l | `chauffeur` | mixed — US-L3 triage (likely identifier) |  |
| `src/app/(ops)/ops/trips/page.tsx` | 55 | id', chauffeurIds) | `chauffeur` | mixed — US-L3 triage (likely identifier) |  |
| `src/app/(ops)/ops/trips/page.tsx` | 57 |  chauffeurNameB | `chauffeur` | keep — DB scope deferred to Epic 17 | Q34 |
| `src/app/(ops)/ops/trips/page.tsx` | 69 | /90">chauffeur_assi | `chauffeur` | keep — DB scope deferred to Epic 17 | Q34 |
| `src/app/(ops)/ops/trips/page.tsx` | 69 | same chauffeur | `chauffeur` | mixed — US-L3 triage (likely identifier) |  |
| `src/app/(ops)/ops/trips/page.tsx` | 109 |  {chauffeurNameB | `chauffeur` | keep — DB scope deferred to Epic 17 | Q34 |
| `src/app/(ops)/ops/trips/page.tsx` | 109 | et(t.chauffeur_id a | `chauffeur` | keep — DB scope deferred to Epic 17 | Q34 |
| `src/app/(ops)/ops/trips/page.tsx` | 110 | ng(t.chauffeur_id). | `chauffeur` | keep — DB scope deferred to Epic 17 | Q34 |
| `src/app/(ops)/ops/vehicles/page.tsx` | 96 | ter">Chauffeur rost | `Chauffeur` | rename to driver |  |

## Layer: UI src/features/ops

| File path | Line | Context (5+5 rule) | Current text | Proposed action | Exception |
|-----------|------|-------------------|----------------|-----------------|-----------|
| `src/features/ops/components/AssignBookingPanel.tsx` | 67 |  chauffeurId: s | `chauffeur` | mixed — US-L3 triage (likely identifier) |  |
| `src/features/ops/components/AssignBookingPanel.tsx` | 78 |  chauffeurs, | `chauffeur` | keep — DB scope deferred to Epic 17 | Q34 |
| `src/features/ops/components/AssignBookingPanel.tsx` | 87 |  chauffeurs: As | `chauffeur` | keep — DB scope deferred to Epic 17 | Q34 |
| `src/features/ops/components/AssignBookingPanel.tsx` | 115 |  chauffeurId: c | `chauffeur` | mixed — US-L3 triage (likely identifier) |  |
| `src/features/ops/components/AssignBookingPanel.tsx` | 115 | rId: chauffeurs[0]? | `chauffeur` | keep — DB scope deferred to Epic 17 | Q34 |
| `src/features/ops/components/AssignBookingPanel.tsx` | 121 | Id, wChauffeurId, w | `Chauffeur` | rename to driver |  |
| `src/features/ops/components/AssignBookingPanel.tsx` | 124 |  'chauffeurId', | `chauffeur` | mixed — US-L3 triage (likely identifier) |  |
| `src/features/ops/components/AssignBookingPanel.tsx` | 136 |  chauffeurId: c | `chauffeur` | mixed — US-L3 triage (likely identifier) |  |
| `src/features/ops/components/AssignBookingPanel.tsx` | 136 | rId: chauffeurs[0]? | `chauffeur` | keep — DB scope deferred to Epic 17 | Q34 |
| `src/features/ops/components/AssignBookingPanel.tsx` | 139 | uns, chauffeurs, ve | `chauffeur` | keep — DB scope deferred to Epic 17 | Q34 |
| `src/features/ops/components/AssignBookingPanel.tsx` | 164 |  chauffeurId: v | `chauffeur` | mixed — US-L3 triage (likely identifier) |  |
| `src/features/ops/components/AssignBookingPanel.tsx` | 164 | lues.chauffeurId, | `chauffeur` | mixed — US-L3 triage (likely identifier) |  |
| `src/features/ops/components/AssignBookingPanel.tsx` | 293 |  and chauffeur sche | `chauffeur` | mixed — US-L3 triage (likely identifier) |  |
| `src/features/ops/components/AssignBookingPanel.tsx` | 298 |  if (chauffeurs.len | `chauffeur` | keep — DB scope deferred to Epic 17 | Q34 |
| `src/features/ops/components/AssignBookingPanel.tsx` | 301 | t or chauffeur data | `chauffeur` | mixed — US-L3 triage (likely identifier) |  |
| `src/features/ops/components/AssignBookingPanel.tsx` | 302 | tive chauffeur prof | `chauffeur` | mixed — US-L3 triage (likely identifier) |  |
| `src/features/ops/components/AssignBookingPanel.tsx` | 325 |  chauffeurId={w | `chauffeur` | mixed — US-L3 triage (likely identifier) |  |
| `src/features/ops/components/AssignBookingPanel.tsx` | 325 | Id={wChauffeurId} | `Chauffeur` | rename to driver |  |
| `src/features/ops/components/AssignBookingPanel.tsx` | 429 | ame="chauffeurId" | `chauffeur` | mixed — US-L3 triage (likely identifier) |  |
| `src/features/ops/components/AssignBookingPanel.tsx` | 430 | se a chauffeur' }} | `chauffeur` | mixed — US-L3 triage (likely identifier) |  |
| `src/features/ops/components/AssignBookingPanel.tsx` | 433 | ted">Chauffeur</For | `Chauffeur` | rename to driver |  |
| `src/features/ops/components/AssignBookingPanel.tsx` | 436 |  {chauffeurs.map | `chauffeur` | keep — DB scope deferred to Epic 17 | Q34 |
| `src/features/ops/components/CreditLimitOverrideDialog.tsx` | 27 |  chauffeurId, | `chauffeur` | mixed — US-L3 triage (likely identifier) |  |
| `src/features/ops/components/CreditLimitOverrideDialog.tsx` | 36 |  chauffeurId: s | `chauffeur` | mixed — US-L3 triage (likely identifier) |  |
| `src/features/ops/components/CreditLimitOverrideDialog.tsx` | 75 |  chauffeurId, | `chauffeur` | mixed — US-L3 triage (likely identifier) |  |
| `src/features/ops/ops-list-state-copy.ts` | 12 |  and chauffeur from | `chauffeur` | mixed — US-L3 triage (likely identifier) |  |
| `src/features/ops/ops-list-state-copy.ts` | 22 | e or chauffeur comp | `chauffeur` | mixed — US-L3 triage (likely identifier) |  |
| `src/features/ops/ops-nav-config.ts` | 51 | *, **chauffeur rost | `chauffeur` | mixed — US-L3 triage (likely identifier) |  |

## Layer: UI src/features/field

| File path | Line | Context (5+5 rule) | Current text | Proposed action | Exception |
|-----------|------|-------------------|----------------|-----------------|-----------|
| `src/features/field/components/FieldLiveTrackingOnIndicator.tsx` | 7 | only chauffeur awar | `chauffeur` | mixed — US-L3 triage (likely identifier) |  |
| `src/features/field/components/FieldLocationPublisher.tsx` | 5 | blishChauffeurLocat | `Chauffeur` | rename to driver |  |
| `src/features/field/components/FieldLocationPublisher.tsx` | 46 | blishChauffeurLocat | `Chauffeur` | rename to driver |  |
| `src/features/field/components/FieldTripDetailActions.tsx` | 6 | nfirmChauffeurAssig | `Chauffeur` | rename to driver |  |
| `src/features/field/components/FieldTripDetailActions.tsx` | 7 |  logChauffeurConta | `Chauffeur` | rename to driver |  |
| `src/features/field/components/FieldTripDetailActions.tsx` | 8 | pdateChauffeurTripS | `Chauffeur` | rename to driver |  |
| `src/features/field/components/FieldTripDetailActions.tsx` | 9 | fieldChauffeur' | `Chauffeur` | rename to driver |  |
| `src/features/field/components/FieldTripDetailActions.tsx` | 94 | nfirmChauffeurAssig | `Chauffeur` | rename to driver |  |
| `src/features/field/components/FieldTripDetailActions.tsx` | 107 | pdateChauffeurTripS | `Chauffeur` | rename to driver |  |
| `src/features/field/components/FieldTripDetailActions.tsx` | 128 | t logChauffeurConta | `Chauffeur` | rename to driver |  |
| `src/features/field/lib/field-live-tracking-indicator.ts` | 2 | 5B.6 chauffeur fiel | `chauffeur` | mixed — US-L3 triage (likely identifier) |  |
| `src/features/field/lib/load-customer-account-live-rider-tracking.server.ts` | 6 | y:** Chauffeur JWTs | `Chauffeur` | rename to driver |  |
| `src/features/field/lib/load-customer-account-live-rider-tracking.server.ts` | 8 | quireChauffeurPage` | `Chauffeur` | rename to driver |  |
| `src/features/field/lib/load-customer-account-live-rider-tracking.server.ts` | 8 | rip `chauffeur_id`  | `chauffeur` | keep — DB scope deferred to Epic 17 | Q34 |
| `src/features/field/lib/load-customer-account-live-rider-tracking.server.ts` | 10 |  the chauffeur | `chauffeur` | mixed — US-L3 triage (likely identifier) |  |

## Layer: UI src/components

_(UI src/components: no matches)_

## Layer: Email templates

| File path | Line | Context (5+5 rule) | Current text | Proposed action | Exception |
|-----------|------|-------------------|----------------|-----------------|-----------|
| `src/lib/email/templates/account-member-invite.ts` | 60 | troo Chauffeur Serv | `Chauffeur` | rename to driver |  |
| `src/lib/email/templates/account-trip-confirmation.ts` | 19 |  chauffeurFullN | `chauffeur` | keep — DB scope deferred to Epic 17 | Q34 |
| `src/lib/email/templates/account-trip-confirmation.ts` | 108 | 555">Chauffeur</td> | `Chauffeur` | rename to driver |  |
| `src/lib/email/templates/account-trip-confirmation.ts` | 108 | rops.chauffeurFullN | `chauffeur` | keep — DB scope deferred to Epic 17 | Q34 |
| `src/lib/email/templates/account-trip-confirmation.ts` | 124 | troo Chauffeur Serv | `Chauffeur` | rename to driver |  |
| `src/lib/email/templates/account-trip-confirmation.ts` | 140 |  chauffeurFullN | `chauffeur` | keep — DB scope deferred to Epic 17 | Q34 |
| `src/lib/email/templates/walk-in-quote.ts` | 117 | troo Chauffeur Serv | `Chauffeur` | rename to driver |  |

## Layer: Types

| File path | Line | Context (5+5 rule) | Current text | Proposed action | Exception |
|-----------|------|-------------------|----------------|-----------------|-----------|
| `src/types/comms.ts` | 36 |  'chauffeur', | `chauffeur` | keep — DB scope deferred to Epic 17 | Q34 |
| `src/types/database.types.ts` | 5 | ' \\| 'chauffeur' \\| ' | `chauffeur` | keep — DB scope deferred to Epic 17 | Q34 |
| `src/types/database.types.ts` | 9 |  'chauffeur', | `chauffeur` | keep — DB scope deferred to Epic 17 | Q34 |
| `src/types/database.types.ts` | 52 |  \\| 'chauffeur' | `chauffeur` | keep — DB scope deferred to Epic 17 | Q34 |
| `src/types/database.types.ts` | 363 | blic.chauffeur_comp | `chauffeur` | keep — DB scope deferred to Epic 17 | Q34 |
| `src/types/database.types.ts` | 364 | type ChauffeurCompl | `Chauffeur` | keep — DB scope deferred to Epic 17 | Q34 |

## Layer: Capstone src/legacy/capstone-reference

| File path | Line | Context (5+5 rule) | Current text | Proposed action | Exception |
|-----------|------|-------------------|----------------|-----------------|-----------|
| `src/legacy/capstone-reference/frontend-driver/app.config.js` | 6 | troo-chauffeur", | `chauffeur` | keep — capstone reference | capstone |
| `src/legacy/capstone-reference/frontend-driver/app.config.js` | 24 | troo.chauffeur", | `chauffeur` | keep — capstone reference | capstone |
| `src/legacy/capstone-reference/frontend-driver/app.config.js` | 40 | troo-chauffeur", | `chauffeur` | keep — capstone reference | capstone |
| `src/legacy/capstone-reference/frontend-driver/public/.well-known/assetlinks.json` | 6 | troo.chauffeur", | `chauffeur` | keep — capstone reference | capstone |
| `src/legacy/capstone-reference/README.md` | 9 | tive chauffeur app  | `chauffeur` | keep — capstone reference | capstone |

## Layer: Capstone docs/capstone-reference

| File path | Line | Context (5+5 rule) | Current text | Proposed action | Exception |
|-----------|------|-------------------|----------------|-----------------|-----------|
| `docs/capstone-reference/frontend-driver/app.config.js` | 24 | troo.chauffeur", | `chauffeur` | keep — capstone reference | capstone |
| `docs/capstone-reference/frontend-driver/public/.well-known/assetlinks.json` | 6 | troo.chauffeur", | `chauffeur` | keep — capstone reference | capstone |

## Layer: Tests (src/**/__tests__**)

_Included under **Lib/helpers** and **Server actions** walks (`src/lib`, `src/actions`, `src/features/**/__tests__`). Re-run collector with an additional walk if a standalone **Tests — src __tests__** table is required._

## References

- [Epic 16 — Theme L / US-L1](../epic-16.md)
- [Epic 17 — schema rename](../epic-17.md)
- [Epic 5 — FE.5.9](../epic-5.md)
