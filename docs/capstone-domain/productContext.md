# Product context — Vestroo

## Company

**Vestroo Pty Ltd** is a 100% Black-owned premium transport operator in **Gauteng, South Africa**, delivering shuttle services, corporate transport, VIP transfers, and curated tours for individuals, corporates, and government.

Authoritative brief: [Overview Vestroo-Pty-Ltd.pdf](../Overview%20Vestroo-Pty-Ltd.pdf).

## Digital platform direction

- **Client experience:** Book transfers, corporate shuttles, tours/experiences, and high-touch VIP flows with clear pricing and confirmation.
- **Operations:** Fleet, chauffeurs, scheduled patterns, live vehicle tracking, and manifests aligned to compliance (licences, GPS, vetted drivers).
- **Data model:** Prefer Vestroo domain language in Postgres (`service_points`, `service_routes`, `service_patterns`, `service_runs`, `chauffeur_assignments`, `vehicle_trackings`) — see `supabase/migrations/`.

## Note on `docs/capstone-domain/`

Several files in this folder originated as technical notes for a **third-party reference codebase** (imported for porting). They may still mention legacy module paths; treat them as **engineering reference**, not marketing copy. Product wording should always match the company profile PDF.
