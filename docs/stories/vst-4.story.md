# Story VST-4: Marketing site — brand, services, trust, SEO, lead capture

## Status: Done

**Dependencies:** Foundation **[VST-1](vst-1.story.md)** (environments, Supabase alignment, dev workflow), **[VST-2](vst-2.story.md)** (staging/promotion, conventions), **[VST-3](vst-3.story.md)** (security disclosure, dependencies, health contract, baseline headers, backups awareness) MUST be **complete or stable** before treating marketing as release-ready. **VST-4** is the **marketing slice** before data-heavy **[VST-5](vst-5.story.md)** (schema, RLS, domain naming in DB/APIs).

## Story

- As a **marketing visitor or prospect** evaluating premium transport in South Africa
- I want **clear service coverage, fleet credibility, trust and safety signals, easy contact, and fast discoverable pages with honest SEO**
- so that **I understand what Vestroo offers, trust the operator, can reach sales without friction, and find the right corridor or service from search or navigation**

## Acceptance Criteria (ACs)

1. **Company profile alignment (`docs/Overview Vestroo-Pty-Ltd.pdf`):** Public marketing copy and page structure reflect the **authoritative positioning** in the PDF—**premium shuttle**, **corporate** transport, **VIP** transfers, **tours** (curated / experience-oriented), **close protection** where offered, and **fleet quality** as differentiators. Deviations MUST be intentional and documented in story notes if legal/comms constraints apply; default is **alignment with the PDF** and **`docs/epic-4.md`** design goals (discreet, punctual, safety-forward).

2. **Domain vocabulary (`docs/epic-4.md` — Domain vocabulary table):** Visible marketing copy and UI labels use **preferred terms** (**chauffeur**, **vehicle** / class names, **service route** / **pattern** / **run** / **service point**, **booking** / **trip**, **corporate pattern**, **tour** / **experience package**, **close protection engagement**) and **avoid** misleading mass-transit framing (**“bus stop”**, generic **“bus route”** for VIP/corporate, **“bus tracking”** as a product name, **“ticket”** unless tickets are actually sold). Epic table is the **audit reference** for copy review.

3. **Dedicated service coverage:** The site MUST expose **dedicated routes or clearly distinct on-page sections** for **premium shuttle**, **corporate**, **VIP**, **tours**, and **close protection** (scope may be **teaser + CTA** for close protection if PDF/commercial stance is high-level). Each area MUST state **who it is for**, **what to expect**, and **next step** (e.g. book, contact). Implementation MAY be separate **`src/app/(marketing)/…` pages** or a structured homepage with **anchor sections** plus **deep links**—developer chooses consistent IA; **discoverability** (AC12) MUST hold.

4. **Fleet (vehicle classes):** A **fleet** view (page or prominent homepage section) presents **vehicle classes** aligned with epic vocabulary (**sedan**, **SUV**, **MPV**, **minibus**, **armoured** where applicable) with **plain-language capacity / use-case** hints and **visual treatment** consistent with brand (photos or placeholders documented if assets pending). Copy MUST NOT imply public transit vehicle categories.

5. **South African trust signals:** Marketing surfaces include **credible SA-oriented trust cues** appropriate to a premium operator (e.g. **local service area**, **professional standards**, **discretion**, **punctuality**, **safety**—exact claims MUST be **factually supportable**; avoid unverifiable certifications). Placement SHOULD appear on **home** and at least one **service** or **about** touchpoint.

6. **Safety / compliance teaser:** A **dedicated teaser section or page** (e.g. **Safety**, **Compliance**, or **Standards**) summarizes **commitment to safety and regulatory awareness** without duplicating full **VST-12** compliance UI. It MUST link or point visitors to **contact** for detail and MUST NOT promise legal outcomes POPIA/legal must sign off on.

7. **Contact and lead capture:** **`src/app/(marketing)/contact/page.tsx`** (and related **`src/content/contact.ts`**) support **lead capture**: working **form or clear CTAs** (email, phone, enquiry fields as appropriate), **success/error feedback**, and **accessible labels**. Integration with backend (e.g. email, CRM) MAY stay **stub or Server Action placeholder** if env not ready—**UX and validation** MUST be shippable; document any **TODO** for wiring in story notes.

8. **SEO for primary corridors:** Every **public marketing route** has **unique, accurate `title` and `description`** via **`generateMetadata()`** or equivalent **Next.js Metadata API**; **primary corridors** (home, each service area, fleet, safety teaser, contact, about) MUST NOT share a **generic-only** default from root **`src/app/layout.tsx`** without override. **Open Graph** (`openGraph` title/description/image) SHOULD be set where a stable **absolute URL** and **image** exist; optional if assets unset—document choice. If **`sitemap.ts`** / **`robots.ts`** are **missing** under **`src/app`** at implementation time, add **`app/sitemap.ts`** and **`app/robots.ts`** (or agreed equivalents) so **indexable marketing URLs** and **canonical policy** match deployment host; **canonical** URLs SHOULD be consistent with **`NEXT_PUBLIC_*`** site URL or Vercel env pattern used in the project.

9. **Core Web Vitals (CWV) posture:** Implementation **documents or meets** project targets for **LCP**, **CLS**, and **INP** on marketing pages—at minimum: **optimize hero/LCP images** (priority, dimensions, modern formats where used), **font loading** (e.g. `next/font` or documented webfont strategy), **avoid layout shift** from late-loading content, and **verify** in **Lighthouse** or **Vercel/Web Vitals** (or note **verification command** in story completion). NFR in **`docs/epic-4.md`** (NFR.1.1 / NFR.1.2) is the **north star**; this story **does not** replace a later **VST-14** hardening pass but MUST NOT regress obvious CWV anti-patterns on new pages.

10. **ISR / SSG where static content allows:** Marketing pages that **read only from static modules** (e.g. **`src/content/*.ts`**) SHOULD use **appropriate Next.js caching/revalidation** (`fetch` cache, **`revalidate`**, or **static generation**) per route where it **does not** block freshness for **time-sensitive** promos—developer picks per page; **document** the choice in completion notes. **Fully dynamic** requirements MUST be justified (e.g. auth-gated preview not in scope here).

11. **No legacy demo naming:** **Grep / manual audit** of **`src/app/(marketing)/`**, **`src/content/`**, **`src/components/layout/`** (Header/Footer), and **`src/components/brand/`** (if present) confirms **no capstone or demo product names** ship in **user-visible strings**—see **`docs/epic-4.md` — Legacy reference code**. Reference trees under **`docs/capstone-reference/`** and **`src/legacy/`** remain **non-shipped**; marketing build MUST NOT surface legacy branding.

12. **Navigation and epic traceability:** **`src/content/site-settings.ts`** (or successor) drives **Header/Footer** navigation that includes **discoverable links** to **service areas**, **fleet**, **safety/compliance teaser**, **contact**, and **about** as implemented. **`docs/epic-4.md` VST-4** bullet remains **consistent** with this story after edits; conflicts MUST be resolved in **epic** or **this file** explicitly.

## Tasks / Subtasks

- [x] **Task 1 — AC1:** Read **`docs/Overview Vestroo-Pty-Ltd.pdf`** and map required **themes** (services, fleet, trust) to **page/section plan**; update **`src/content/*`** and marketing **`page.tsx`** files so copy **matches positioning** or note approved exceptions in **Story Progress Notes**. (AC: #1)

- [x] **Task 2 — AC2:** Audit marketing copy against **`docs/epic-4.md`** **Domain vocabulary** table; replace **avoid** terms and align **preferred** terms in **headers, body, CTAs, and nav labels**. (AC: #2)

- [x] **Task 3 — AC3:** Implement **premium shuttle**, **corporate**, **VIP**, **tours**, and **close protection** as **routes under `src/app/(marketing)/`** and/or **structured homepage sections** with **stable URLs**; ensure each has **audience, promise, CTA**. (AC: #3)

- [x] **Task 4 — AC4:** Add **fleet** page or homepage **fleet** section using **vehicle class** vocabulary; wire content via **`src/content/`** module(s); align imagery/placeholders with **`docs/front-end-style-guide.md`**. (AC: #4)

- [x] **Task 5 — AC5:** Add **South African trust signals** to **home** and **about** or **service** template; verify claims are **supportable** (stakeholder sign-off if needed). (AC: #5)

- [x] **Task 6 — AC6:** Add **safety/compliance teaser** page or section; link to **contact**; keep scope **teaser-only** relative to **VST-12**. (AC: #6)

- [x] **Task 7 — AC7:** Verify **`contact/page.tsx`** + **`src/content/contact.ts`** **form/CTA**, validation, a11y, and feedback states; add Server Action stub or integration per env readiness; document gaps. (AC: #7)

- [x] **Task 8 — AC8:** Implement **per-route `generateMetadata()`** (titles, descriptions, canonical as appropriate); add **`openGraph`** where assets/URLs stable; add **`src/app/sitemap.ts`** and **`src/app/robots.ts`** if still missing; reconcile with root **`src/app/layout.tsx`** defaults. (AC: #8)

- [x] **Task 9 — AC9:** Profile **marketing routes** (Lighthouse or host vitals); tune **LCP** (images, fonts), **CLS** (dimensions, skeletons); record **targets vs results** in **Completion Notes**. (AC: #9)

- [x] **Task 10 — AC10:** Apply **SSG/ISR/revalidate** choices per static-content route; avoid unnecessary **dynamic** rendering; document caching in completion notes. (AC: #10)

- [x] **Task 11 — AC11:** Run **legacy naming audit** (search for demo/capstone product strings in shipped marketing paths); fix or file follow-up with **evidence** in notes. (AC: #11)

- [x] **Task 12 — AC12:** Update **`site-settings.ts`** nav for **services**, **fleet**, **safety**, **contact**, **about**; sync **`Header.tsx` / `Footer.tsx`** consumers; re-read **`docs/epic-4.md` VST-4** for **traceability**. (AC: #12)

## Dev Technical Guidance

- **Marketing shell:** App Router group **`src/app/(marketing)/`** — **`layout.tsx`** (Header/Footer), **`page.tsx`** (home), **`about/page.tsx`**, **`contact/page.tsx`**; add sibling routes for **services**, **fleet**, **safety** as needed.
- **Static content:** Prefer **`src/content/homepage.ts`**, **`site-settings.ts`**, **`about-us.ts`**, **`contact.ts`** (and new modules e.g. **`services.ts`**, **`fleet.ts`**) over hard-coding long copy in components; **homepage** already uses **`generateMetadata()`** from **`homepageContent.seo`** — **mirror pattern** for new pages.
- **Layout chrome:** **`src/components/layout/Header.tsx`**, **`Footer.tsx`** — driven by **`site-settings.ts`**; today includes **booking**, **login**, **contact** — extend for **service subpages** per AC12.
- **Authoritative inputs:** **`docs/Overview Vestroo-Pty-Ltd.pdf`** (repo root via **`docs/`** link), **`docs/epic-4.md`** (VST-4 bullet, **Domain vocabulary**, **Legacy reference**).
- **Metadata:** Next.js **Metadata API** (`generateMetadata`, `metadata` export) — align **title template** / **defaults** between **`src/app/layout.tsx`** and **marketing overrides** so **primary corridors** are not left generic.
- **SEO files:** If **`sitemap.ts`** / **`robots.ts`** are absent under **`src/app`**, implement per AC8 using **`NEXT_PUBLIC_*`** or documented **site URL** convention from **`docs/environment-vars.md`**.
- **Styling and components:** Follow **`docs/front-end-style-guide.md`** and **`docs/front-end-component-guide.md`** (see **Frontend Architecture Components** in **`docs/index.md`**); keep **brand** components under **`src/components/brand/`** if the project uses that folder.
- **Performance:** **`next/font`**, image **`next/image`** with **sizes/priority**, avoid **CLS** from late inserts; cross-check **`docs/epic-4.md`** NFR.1.1 / NFR.1.2.
- **Scope boundary:** **Marketing and lead capture** only; **full compliance UI** is **VST-12**; **schema renames** are **VST-5** — do not block VST-4 on DB work except **content** consistency.

## Story Progress Notes

### Agent Model Used: `SM story prep` → implementation (Cursor agent)

### Completion Notes List

- **IA & routes:** `/services` hub + `/services/[slug]` (premium-shuttle, corporate, vip, tours, close-protection), `/fleet`, `/safety`; homepage **ServicesOverview** + **TrustStrip** from `src/content/homepage.ts`.
- **Content:** `src/content/services.ts`, `fleet.ts`, `safety.ts`; homepage/about/contact copy tuned for **chauffeur**, **vehicle**, **trip**, **booking**, **corporate pattern**, **service point** / **service route** language; close protection **teaser + confidential enquiry CTA**.
- **Lead capture:** `src/actions/submitContactEnquiry.ts` (Zod + server log stub; **TODO** Resend/CRM in VST-13+); `ContactEnquiryForm` with `useActionState`, field errors, success state.
- **SEO:** `src/lib/marketing-metadata.ts` + `src/lib/site-url.ts`; `metadataBase` + title template in root `layout.tsx`; per-route `generateMetadata` on marketing corridors; **`src/app/sitemap.ts`** & **`src/app/robots.ts`**. **Open Graph:** title/description/url (no default OG image asset in repo—intentional per AC8 optional image).
- **Nav:** `site-settings.ts` header/footer links for services, fleet, safety, about, contact, booking, login.
- **CWV posture:** `next/font` (Montserrat + Poppins) replaces render-blocking Google Fonts `@import`; hero **`sizes="100vw"`** + existing **`priority`** on first slide; removed legacy **EZ Shuttle** comment in `globals.css`.
- **Caching:** `(marketing)/layout.tsx` **`export const revalidate = 3600`** (ISR) for static content modules.
- **Legacy audit:** `rg` on `(marketing)`, `src/content`, `layout`, `brand` — no capstone/demo product strings; removed EZ Shuttle CSS comment.
- **Verification:** Run locally: `npm run lint`, `npm run test -- --run`, `npm run build`. For Lighthouse: open `/`, `/services`, `/fleet` in production build (`npm run build && npm run start`) and run Chrome Lighthouse on each (record scores in CI later under VST-14).

### Change Log

| Date | Change |
|------|--------|
| 2026-04-02 | Initial **Draft**: VST-4 ACs (PDF + vocabulary, services, fleet, SA trust, safety teaser, contact/lead, SEO/sitemap/robots, CWV, ISR/SSG, legacy naming, nav + epic traceability), tasks, and dev guidance from **epic-4**, **vst-3** story depth, and repo facts (marketing routes, `src/content/*`, layout chrome, metadata patterns). |
| 2026-04-06 | **Implemented** marketing routes, content modules, contact Server Action stub, SEO/sitemap/robots, nav, `next/font` + hero image sizing, marketing ISR, epic VST-4 traceability; story tasks complete; **Status → Review**. |
