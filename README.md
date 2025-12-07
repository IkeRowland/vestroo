# Vestroo - Shuttle Booking Platform

A modern shuttle booking platform built with Next.js 14, TypeScript, and Tailwind CSS.

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Google Maps API key

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env
```

Update `.env` with your actual values:
- `NEXT_PUBLIC_GOOGLE_MAPS_KEY` - Your Google Maps API key
- Other environment variables as needed

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

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

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript (Strict mode)
- **Styling:** Tailwind CSS
- **UI Components:** Shadcn/UI
- **State Management:** Zustand
- **Validation:** Zod
- **Testing:** Vitest (unit), Playwright (E2E)
- **Maps:** Google Maps Platform

## License

Private project

