# PayloadCMS Nested HTML/Body Tags Fix

## Issue
Nested `<html>` and `<body>` tags causing hydration errors:
```
In HTML, <html> cannot be a child of <body>.
<body> cannot contain a nested <html>.
You are mounting a new html component when a previous one has not first unmounted.
```

## Root Cause
- **Root Layout** (`src/app/layout.tsx`): Renders `<html>` and `<body>` tags for all routes (required by Next.js 15)
- **PayloadCMS RootLayout** (`src/app/(payload)/layout.tsx`): Also renders its own `<html>` and `<body>` tags
- When accessing `/admin/*` routes, both layouts render HTML structure, causing nesting

## Solution
Modified the root layout to detect PayloadCMS routes and skip rendering `<html>`/`<body>` tags, allowing PayloadCMS's RootLayout to handle them instead.

### Changes Made

1. **Updated Middleware** (`middleware.ts`):
   - Always sets `x-pathname` header for all requests
   - This allows the root layout to detect the current route path

2. **Updated Root Layout** (`src/app/layout.tsx`):
   - Checks `x-pathname` header to detect `/admin/*` routes
   - For PayloadCMS routes: Returns children directly (no html/body wrapper)
   - For other routes: Renders standard html/body structure

### How It Works

```
Request to /admin/login
  ↓
Middleware sets x-pathname: '/admin/login'
  ↓
Root Layout checks pathname
  ↓
Detects /admin route → Returns {children} directly
  ↓
PayloadCMS Layout renders <html><body>...</body></html>
  ↓
No nesting! ✅
```

### Files Modified
1. `middleware.ts` - Set x-pathname header for all routes
2. `src/app/layout.tsx` - Conditionally skip html/body for PayloadCMS routes

### Testing
- Build passes successfully
- PayloadCMS admin routes should not have nested html/body tags
- Regular routes continue to work with standard html/body structure

## Notes
- The detection relies on the middleware setting the `x-pathname` header
- PayloadCMS routes are identified by paths starting with `/admin`
- This is a necessary workaround because both Next.js and PayloadCMS require rendering html/body tags

