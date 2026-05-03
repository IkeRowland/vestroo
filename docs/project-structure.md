# Project structure

High-level map of this repository (Next.js App Router + Supabase). **Where to place new application code** is spelled out in [Repository conventions](repo-conventions.md). **Local run, scripts, and env** are in [Local development](local-development.md).

```
vestroo/
├── .github/
│   └── pull_request_template.md   # optional PR checklist
├── docs/                   # Product and engineering documentation
├── public/                 # Static assets served as-is
├── src/
│   ├── app/                # App Router: layouts, pages, route groups
│   │   ├── (app)/          # Authenticated / booking flows
│   │   ├── (marketing)/    # Public marketing pages (home, about, contact, services, fleet, safety)
│   │   ├── (ops)/          # Dispatcher/admin console → /ops/*
│   │   ├── (field)/        # Chauffeur field app → /field/*
│   │   └── api/            # Route Handlers (e.g. health, webhooks)
│   ├── actions/            # Server Actions (+ __tests__/)
│   ├── components/         # Shared UI, layout, design-system pieces
│   ├── content/            # Typed or static content modules (e.g. marketing copy)
│   ├── features/           # Feature-owned UI and hooks (e.g. booking/)
│   ├── lib/                # Shared utilities, Supabase helpers (+ __tests__/)
│   ├── services/           # Cross-cutting services (e.g. email) (+ __tests__/)
│   └── types/              # Ambient / shared TS types where needed
├── supabase/
│   └── migrations/         # Ordered SQL migrations (source of truth for schema)
├── tests/
│   └── e2e/                # Playwright specs
├── CONTRIBUTING.md
├── SECURITY.md
├── middleware.ts           # Next.js middleware (edge)
├── next.config.ts
├── package.json
├── tailwind.config.ts
├── tsconfig.json
├── vitest.config.ts
├── eslint.config.mjs
└── .env.example            # Placeholder names only (see environment-vars.md)
```

## Notes

- **No CMS app tree in-repo:** content and configuration live under `src/content/`, `src/app/`, and `supabase/migrations/` as appropriate—not a separate `collections/` or CMS admin route group.
- **Database schema** is evolved only through **`supabase/migrations/`**; do not add a parallel `src/migrations/` for production schema.
- **Reference / legacy** samples may appear under `src/legacy/` or `docs/capstone-reference/`; they are not part of the primary app surface—see [epic-4.md](epic-4.md).

## Related docs

- [Repository conventions](repo-conventions.md) — Actions, features, components, lib, services, tests
- [Local development](local-development.md) — install, env, migrations, health check, CI
