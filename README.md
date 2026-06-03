# Vestroo - Shuttle Booking Platform

Shuttle booking platform built with **Next.js 15** (App Router), **TypeScript**, **Tailwind CSS**, and **Supabase**.

**Repository:** [github.com/juggernautafrica/vestroo](https://github.com/juggernautafrica/vestroo)

## Contributing

Branches, CI, migrations in PRs, and pointers to setup and code layout: see [CONTRIBUTING.md](CONTRIBUTING.md).

## Security

Report security issues privately — **do not** open public issues for undisclosed vulnerabilities. See [SECURITY.md](SECURITY.md) for scope and how to contact maintainers.

## Documentation

- **Epic 10 public trip request:** integration boundary (client vs ops follow-up) — [docs/trip-request-integration-boundary.md](docs/trip-request-integration-boundary.md).
- **Booking funnel design references** (screenshots / comparison checklist) — [docs/design/booking-funnel/README.md](docs/design/booking-funnel/README.md).

## Getting started

**Full setup (Supabase migrations, CI, env semantics, stub booking):** see [docs/local-development.md](docs/local-development.md).

Quick path:

1. **Node:** 20.x LTS recommended.
2. **Docker** is not required. Development uses a **hosted** Supabase project and the environment variables described in the docs below.
3. `npm install`
4. `cp .env.example .env.local` — fill placeholders (never commit secrets). See [docs/environment-vars.md](docs/environment-vars.md).
5. Apply `supabase/migrations/` to your dev Supabase project (hosted): **`supabase link`** then **`npm run db:push`** or Dashboard — see [docs/local-development.md](docs/local-development.md).
6. `npm run dev` → [http://localhost:3000](http://localhost:3000)

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   └── (app)/             # Dynamic booking app routes
│       └── book/          # Booking wizard
│           └── search/    # Booking search page
├── actions/               # Server Actions
│   ├── calculateQuote.ts  # Quote calculation
│   └── __tests__/         # Unit tests
├── components/            # React components
│   └── ui/                # Shadcn/UI primitives
├── features/              # Feature-based modules
│   └── booking/           # Booking feature
│       ├── components/    # Booking components
│       └── hooks/         # Booking hooks (Zustand store)
└── lib/                   # Shared utilities
    └── maps.ts            # Google Maps API utilities

tests/
└── e2e/                   # Playwright E2E tests
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run db:push` - Apply pending Supabase migrations to the linked **hosted** project (requires [Supabase CLI](https://supabase.com/docs/guides/cli); run `supabase link` first)
- `npm run smoke:rls` - Run **`supabase/smoke_rls.sql`** against **`DATABASE_URL`** (Epic 11 RLS regression gate; no Docker — see [docs/local-development.md](docs/local-development.md))
- `npm test` - Run unit tests (Vitest)
- `npm run test:e2e` - Run E2E tests (Playwright)

## Testing

### Unit Tests
Unit tests are written with Vitest and located in `src/actions/__tests__/`.

```bash
npm test
```

### E2E Tests
E2E tests are written with Playwright and located in `tests/e2e/`.

```bash
npm run test:e2e
```

## Story 1.1 - Booking Search & Quote Interface

This story implements the booking search interface allowing users to:
- Select pickup and drop-off locations (Google Maps autocomplete)
- Select date and time
- Enter passenger count
- Optionally enter flight number (if origin is airport)
- Get instant quotes

See `docs/stories/1.1.story.md` for detailed requirements.

## Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript (Strict mode)
- **Styling:** Tailwind CSS
- **UI Components:** Shadcn/UI
- **State Management:** Zustand
- **Validation:** Zod
- **Testing:** Vitest (unit), Playwright (E2E)
- **Maps:** Google Maps Platform

## License

Private project

