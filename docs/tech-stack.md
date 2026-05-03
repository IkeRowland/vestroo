# Technology Stack

## Definitive Tech Stack Selections

| Category | Technology | Version | Description |
| :---- | :---- | :---- | :---- |
| **Language** | TypeScript | 5.x | Strict mode enabled. |
| **Framework** | Next.js | 14.x | App Router, Server Actions. |
| **CMS** | PayloadCMS | 3.0 (Beta/Stable) | Next.js Native version. |
| **Database** | Supabase (PostgreSQL) | Latest | Managed Postgres + Auth. |
| **Styling** | Tailwind CSS | 3.x | Utility-first styling. |
| **UI Library** | Shadcn/UI (Radix) | Latest | Accessible component primitives. |
| **Testing** | Playwright | Latest | E2E Testing. |
| **Testing** | Vitest | Latest | Unit Testing (Pricing Logic). |
| **Hosting** | Vercel | N/A | Serverless deployment. |

## Local development (database)

The app talks to **hosted** Supabase projects (dev / staging / production). This repository does **not** run a local Supabase stack with **Docker**. Apply `supabase/migrations/` with the **Supabase CLI** (**`supabase link`**, **`supabase db push`** or **`npm run db:push`**) as described in [local-development.md](local-development.md).

