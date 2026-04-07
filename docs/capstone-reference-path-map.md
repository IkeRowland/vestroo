# External capstone reference → Vestroo repo layout

Third-party reference code (optional porting source) lives under neutral paths — **not** product naming for Vestroo.

| Source (inside `docs/capstone-reference/`) | Copied to | Purpose |
|---------------------------------------------|-----------|---------|
| `backend/src/modules/` | `src/legacy/capstone-reference/backend-modules/` | Nest modules as logic reference only |
| `backend/src/share/` | `src/legacy/capstone-reference/backend-share/` | Shared enums/helpers reference |
| `frontend-driver/` | `src/legacy/capstone-reference/frontend-driver/` | Mobile chauffeur app reference |
| `frontend-customer/src/` (selected) | `src/features/capstone-reference/customer/` | Web client building blocks |
| `frontend-admin/src/app/{_components,services,utils}` | `src/features/capstone-reference/admin/` | Operations UI reference |
| `frontend-manager/src/` | `src/features/capstone-reference/manager/` | Dashboard reference |
| `cline_docs/` | `docs/capstone-domain/` | Technical notes (being reframed for Vestroo where edited) |
| `frontend-customer/public/` | `public/capstone-assets/frontend-customer/` | Static assets from import |

**Product direction:** See [Overview Vestroo-Pty-Ltd.pdf](./Overview%20Vestroo-Pty-Ltd.pdf) and [epic-4.md](./epic-4.md).

**Database (Supabase):** Tables use Vestroo domain language — e.g. `service_points`, `service_routes`, `service_patterns`, `service_runs`, `chauffeur_assignments`, `vehicle_trackings` (see `supabase/migrations/`).

**Build:** `src/legacy/**`, `src/features/capstone-reference/**`, and `docs/capstone-reference/**` are excluded from TypeScript/ESLint until ported into the main app.
