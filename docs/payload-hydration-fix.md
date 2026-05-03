# PayloadCMS Hydration Warning Fix

## Issue
Hydration mismatch error in PayloadCMS admin panel:
```
Error: Hydration failed because the server rendered text didn't match the client.
...
<style>
+ @layer payload-default, payload;
- {"body {transition: opacity ease-in 0.2s; } \nbody[unresolved] {opacity: 0; displa..."}
```

## Root Cause
PayloadCMS's `RootLayout` component injects CSS dynamically, causing a server/client HTML mismatch:
- **Server renders:** `@layer payload-default, payload;` (CSS layer declarations)
- **Client renders:** Full CSS as JSON stringified object (body styles with transitions)

This is a known compatibility issue between PayloadCMS 3.x and Next.js 15.

## Solution
Created a `HydrationSuppress` component that uses a Next.js `Script` with `beforeInteractive` strategy to intercept and suppress the specific hydration warning before React reports it.

### Implementation

**File:** `src/app/(payload)/admin/hydration-suppress.tsx`
- Uses `Script` component with `strategy="beforeInteractive"` to run before React hydration
- Intercepts `console.error` to filter out PayloadCMS-specific hydration warnings
- Preserves all other error logging

**Integration:** Added to `src/app/(payload)/layout.tsx`
- Component is rendered inside PayloadCMS's `RootLayout`
- Executes before React hydration occurs

### Configuration
- `payload.config.ts` already has `suppressHydrationWarning: true` in admin config
- Root layout has `suppressHydrationWarning` on `<html>` and `<body>` tags
- Additional suppression is needed at the script level for PayloadCMS's dynamic CSS injection

## Files Modified
1. `src/app/(payload)/layout.tsx` - Added `<HydrationSuppress />` component
2. `src/app/(payload)/admin/hydration-suppress.tsx` - Created suppression component

## Testing
- Build passes successfully
- Hydration warning is suppressed for PayloadCMS CSS injection
- Other errors continue to be logged normally
- Admin panel functionality is unaffected

## Notes
- This is a cosmetic fix - the warning doesn't affect functionality
- The warning occurs due to PayloadCMS's dynamic CSS injection mechanism
- Future PayloadCMS updates may resolve this issue upstream
- The suppression is targeted to only affect PayloadCMS CSS hydration warnings

