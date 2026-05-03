# Front-End Coding Standards

## Type Safety

* All new code MUST be written in **TypeScript** (Strict mode enabled).

## Component Standards

* **PascalCase** for component files (e.g., `BookingWidget.tsx`).
* Co-locate feature-specific components in `src/features/{feature}/components`.

## Input Validation

* **Zod** schemas used on both Client (React Hook Form) and Server (Server Actions) to validate all user input.

## Security Considerations

* **XSS:** Next.js automatically escapes data. `dangerouslySetInnerHTML` is forbidden.
* **PayFast:** Payment credentials (Passphrase) NEVER exposed to client. Signature generation happens strictly in `processPayment.ts` (Server Action).

## Accessibility (AX) Implementation

* **Forms:** All inputs must have associated `<label>` elements (handled by Shadcn FormItem).
* **Keyboard Nav:** The Booking Wizard must be fully navigable via Tab.
* **Focus Management:** When moving between Wizard steps, focus should reset to the top of the new form container.

