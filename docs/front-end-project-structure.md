# Front-End Project Structure

## Detailed Frontend Directory Structure

```
src/
├── app/                        # Next.js App Router
│   ├── (marketing)/            # Public Marketing Pages (ISR enabled)
│   │   ├── globals.css         # Global Styles (Tailwind directives)
│   │   ├── layout.tsx          # Marketing Layout (Header/Footer)
│   │   ├── page.tsx            # Homepage (contains <BookingWidgetHero />)
│   │   └── [routeSlug]/        # Dynamic SEO Landing Pages
│   │       └── page.tsx        # e.g., /shuttle-jnb-to-sandton
│   ├── (app)/                  # Dynamic Booking Application
│   │   ├── layout.tsx          # App Layout (Minimal Header, Focus on Task)
│   │   └── book/               # The Booking Wizard Route
│   │       ├── page.tsx        # Redirects to /book/search
│   │       ├── search/         # Step 1: Search Inputs
│   │       ├── quote/          # Step 2: Select Vehicle/Quote
│   │       ├── details/        # Step 3: Passenger Details
│   │       └── payment/        # Step 4: PayFast Integration
│   ├── (payload)/              # PayloadCMS Admin Routes (Managed by Payload)
│   │   └── admin/
│   └── api/                    # API Routes (Webhooks, etc.)
│
├── actions/                    # Next.js Server Actions (The "API Layer")
│   ├── calculateQuote.ts       # Server-side pricing logic
│   ├── createBooking.ts        # Writes to Supabase
│   └── processPayment.ts       # Handles PayFast signature generation
│
├── components/
│   ├── ui/                     # Shadcn Primitives (Button, Input, Select, Card)
│   │   ├── button.tsx
│   │   └── ...
│   ├── layout/                 # Shared Layouts
│   │   ├── Header.tsx
│   │   └── Footer.tsx
│   └── booking/                # Reusable Booking Components
│       ├── RouteSummaryCard.tsx
│       └── VehicleOptionCard.tsx
│
├── features/                   # Feature-based Modules
│   └── booking/
│       ├── hooks/              # e.g., useBookingStore.ts
│       ├── components/         # Complex organisms (e.g., BookingWizardStepper)
│       └── utils/              # Booking-specific helpers
│
├── lib/
│   ├── utils.ts                # Shadcn cn() helper
│   └── maps.ts                 # Google Maps API wrapper
│
└── styles/
    └── fonts.ts                # Next.js Font Optimization config
```

