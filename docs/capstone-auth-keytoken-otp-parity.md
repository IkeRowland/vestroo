# Capstone Auth, Keytoken, and OTP parity (BE.6.5 / Story 6.5)

**Living artifact** for **[Epic 6](epic-6.md)** **BE.6.5**. Compares vendored **Nest + Mongo** reference modules under **`docs/capstone-reference/backend/src/modules/`** with **Vestroo**: **Supabase Auth**, **cookie/SSR-oriented** Supabase clients, and **ops/field** server gates.

## Scope

This doc is the **horizontal** narrative for **identity, refresh semantics, and OTP**. It does **not** replace **[Capstone reference — stack & integration](capstone-reference-stack-integration.md)** (**FE.5.9**) for axios/JWT-in-browser integration posture, or **[Capstone Nest REST → Vestroo mapping](capstone-nest-rest-to-vestroo-mapping.md)** (**BE.6.3**) for **`@Controller`** → HTTP surface rows. **[Data models](data-models.md)** owns **`public.profiles`** / **`auth.users`** / **`role`**; **[Environment variables](environment-vars.md)** owns **`NEXT_PUBLIC_*`** vs **server-only** secrets.

---

## Auth

### Reference (Nest / Mongo)

- **`auth.controller.ts`** — **`@Controller('auth')`**: **`POST`** routes for **register** variants (customer, admin, manager, driver, generic), **`POST login-customer`** (phone), **`POST login-by-password`** (email/password), **`PUT change-password`** (guarded), **`POST refresh-token`** (delegates to **Keytoken** — **`CLIENT_ID`** + **`REFRESH_TOKEN`** **headers**, see **`keyTokenService.handleRefreshToken`**), **`POST forgot-password`**, **`POST reset-forgot-password`**.
- **`auth.guard.ts`** — **`AuthGuard`**: expects **`Authorization`** + **`CLIENT_ID`** headers; verifies access token with **Keytoken** public key material (**RSA**-backed flow per **Keytoken** module).
- **`role.guard.ts`** — role checks on top of authenticated user (pattern in same folder).
- **Honest gap:** This summary is **path-based**; full **auth.service.ts** login/register side effects are not transcribed here — treat **`auth.service.ts`** as source for Mongo **User** persistence and password flows.

### Vestroo

- **Identity:** **Supabase Auth** (`auth.users`) with **`public.profiles`** (`profiles.id` = `auth.users.id`, **`role`** per **[data-models.md](data-models.md)**).
- **`src/lib/supabase/server.ts`:**
  - **`createUserServerClient()`** — wraps **`createServerClient`** from **`@supabase/ssr`** with **`next/headers`** **`cookies`** get/set — **anon key** + **user session** in cookies. Used in **Server Actions** and **RSC** that must run as the **signed-in user** (RLS applies): e.g. **`opsDispatch.ts`**, **`opsCompliance.ts`**, **`fieldChauffeur.ts`**, **`field-auth.ts`**, **`ops-auth.ts`**, many **`/ops/*`** and **`/field/*`** pages.
  - **`createServerClient()`** — **name in this repo** = **service role** client (`SUPABASE_SERVICE_ROLE_KEY`, no persisted user session). Used for **webhooks**, **guest** booking flows, and other **server-only** elevated reads/writes where **RLS bypass** is intentional and **secrets stay server-only** — see **[environment-vars.md](environment-vars.md)**.
- **`src/lib/supabase/client.ts`** — **`createClientClient()`** uses **`createBrowserClient`** from **`@supabase/ssr`** with **`NEXT_PUBLIC_SUPABASE_*`** (**anon** only — **no** service role in the browser).
- **Ops / field UX:** **`requireOpsStaffPage`** and **`/ops/login`**, **`/ops/unauthorized`** — **[ops-console.md](ops-console.md)**. **`requireChauffeurPage`**, **`/field/login`** — **[field-tools.md](field-tools.md)**; **`getOpsStaffForAction`** / **`getOpsAdminForAction`** in **`src/lib/ops-auth.ts`** gate **mutations**.

---

## Keytoken

### Reference (Mongo `KeyToken`)

- **`keytoken.schema.ts`** — **`KeyTokens`** collection: **`user`**, **`publicKey`**, **`refreshToken`**, **`refreshTokenUsed[]`**, optional **reset** key fields.
- **`keytoken.service.ts`** — **`createKeyToken`**: generates **RSA** key pair, **`tokenProvider.generateTokenPair`**, upserts Mongo doc with **publicKey** + **refreshToken**. **`handleRefreshToken`**: validates refresh, detects **reuse** (possible theft → deletes key row), issues **new** pair, appends used refresh to **`refreshTokenUsed`**. **`createKeyTokenResetPassword`** for reset flow.
- **Consumed by:** **Auth** refresh route and **OTP** success path (token payload stored on OTP record).

### Vestroo

- **No** 1:1 **`public.*` Keytoken** table — **[capstone-backend-module-matrix.md](capstone-backend-module-matrix.md)** **`KeytokenModule`** row. **Session refresh** is **Supabase-managed** (cookie/session lifecycle via **`@supabase/ssr`**), not **custom RSA refreshToken** rows in app DB.
- **Do not** port **Mongo KeyToken** semantics (**RSA pair per user**, **header-based refresh**) as the **default** for first-party **`/ops`** / **`/field`** without **ADR** — see **Prohibition** below. A future **device session** or **refresh audit** table is **product + ADR** gated.

---

## OTP

### Reference (Nest / Mongo)

- **`otp.controller.ts`** — **`POST otp/verify`**: body **`phone`** + **`code`** → **`otpService.verify`**.
- **`otp.service.ts`** — **`create`**: **`otp-generator`** 5-digit code, **bcrypt** hash, **`keyTokenService.createKeyToken`**, **`OTPRepository.insert`** (stores **hashed** code + **token** payload reference). **`verify`**: loads OTPs by phone, compares **bcrypt**, returns **`{ isValid, token, userId }`** on success (**token** ties back to **Keytoken** pair).
- **Repository / schema:** **`otp.repo.ts`**, **`otp.schema.ts`** in same module.

### Vestroo

- **Dedicated OTP Server Actions / `route.ts`:** **None** today (aligned with **[capstone-nest-rest-to-vestroo-mapping.md](capstone-nest-rest-to-vestroo-mapping.md)** **`OtpModule`** row). Traveller and staff flows use **email/password** or **Supabase session** patterns documented in **ops/field** docs — **not** **`POST otp/verify`** parity.
- **Provider:** **TBD** — no third-party SMS OTP pipeline and no **Supabase phone OTP** product path are documented as **chosen** in this repo at **Story 6.5** delivery. **Supabase** can support **phone** / **magic link** / **OTP** products; selection is **product + engineering**, not assumed here.
- **Rate-limit / abuse:** **TBD** — backlog: choose **provider** (if any), **per-IP / per-phone** throttles (e.g. **Edge**, **Supabase** hooks, or **external** API limits), **attempt counters** / lockouts, **logging** — **separate story** if implemented.

---

## Prohibition: JWT in `localStorage` and browser refresh-token APIs

**Copying** the reference stack’s defaults — **JWT in `localStorage`** (or other **wide** client storage) and **refresh-token-in-browser** flows that mirror **`POST auth/refresh-token`** with **`CLIENT_ID` + `REFRESH_TOKEN` headers** — as **Vestroo’s default** for first-party **App Router** clients (**`/ops`**, **`/field`**, marketing app) is **forbidden** without a **new ADR** under **[docs/adr/](adr/)** (numbered **`000N-*.md`**, **Context** / **Decision** / **Consequences** — follow existing ADR shape, e.g. **[ADR 0001](adr/0001-ops-field-ui-stack-tailwind-radix.md)**).

**Integration-level** rationale and anti-patterns:**[Capstone reference — stack & integration](capstone-reference-stack-integration.md)** (**FE.5.9**).

---

## Related documentation

* **[Capstone reference — stack & integration](capstone-reference-stack-integration.md)** — **FE.5.9**, axios/JWT/Firebase vs Supabase
* **[Capstone Nest REST → Vestroo mapping](capstone-nest-rest-to-vestroo-mapping.md)** — **`auth`**, **`otp`**, **Keytoken** (service-only) rows
* **[Capstone backend module matrix](capstone-backend-module-matrix.md)** — **`AuthModule`**, **`KeytokenModule`**, **`OtpModule`**
* **[Data models](data-models.md)** — **`profiles`**, **`auth.users`**, **`is_staff`**, RLS overview
* **[Environment variables](environment-vars.md)** — **`NEXT_PUBLIC_*`**, service role **server-only**
* **[Ops console](ops-console.md)** — **`requireOpsStaffPage`**, **`/ops/login`**
* **[Field tools](field-tools.md)** — **`requireChauffeurPage`**, **`/field/login`**
* **[Epic 6](epic-6.md)** — **BE.6.5**

### Code pointers (Vestroo)

* **`src/lib/supabase/server.ts`** — **`createUserServerClient`**, **`createServerClient`** (service role in this file’s naming)
* **`src/lib/supabase/client.ts`** — **`createClientClient`**
* **`src/lib/ops-auth.ts`**, **`src/lib/field-auth.ts`**
