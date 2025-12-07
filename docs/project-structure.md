# Project Structure

```
vestroo-platform/
├── .github/                    # CI/CD (GitHub Actions)
├── src/
│   ├── app/                    # Next.js App Router Root
│   │   ├── (marketing)/        # Route Group: Public, ISR-heavy pages
│   │   │   ├── about/          # About Us page
│   │   │   ├── contact/        # Contact page
│   │   │   └── layout.tsx
│   │   ├── page.tsx            # Homepage (renders Homepage Global)
│   │   ├── (app)/              # Route Group: Dynamic Booking App
│   │   │   ├── book/           # Booking Wizard
│   │   │   ├── profile/        # User Dashboard
│   │   │   └── layout.tsx
│   │   ├── (payload)/          # PayloadCMS Admin Routes
│   │   │   └── admin/
│   │   └── api/                # Next.js API Routes (Webhooks, Cron)
│   ├── collections/            # PayloadCMS Collection Definitions     
│   │   ├── Routes.ts
│   │   ├── Bookings.ts
│   │   └── ...
│   ├── globals/                # PayloadCMS Global Definitions
│   │   ├── Homepage.ts
│   │   ├── AboutUs.ts
│   │   └── Contact.ts
│   ├── components/             # React Components (UI Library)
│   │   ├── ui/                 # Shadcn/Tailwind Atoms
│   │   └── booking/            # Booking-specific widgets
│   ├── lib/                    # Shared Utilities
│   │   └── calculations.ts     # Pricing Logic
│   └── migrations/             # Database Migrations
├── payload.config.ts           # PayloadCMS Main Config
├── .env.example
├── next.config.js
├── package.json
└── tsconfig.json
```

