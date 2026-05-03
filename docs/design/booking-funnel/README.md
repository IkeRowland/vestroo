# Booking funnel — product design references (Epic 10 / FE.10.6)

**Normative location for screenshots and mockups** used to align the public **trip request** funnel (`/book/trip-request`) with product UI. Implementation details: [`docs/stories/10.5.story.md`](../stories/10.5.story.md), epic [`docs/epic-10.md`](../epic-10.md).

## Files and naming

See **[INDEX.md](./INDEX.md)** for the canonical list of filenames and one-line purpose per asset.

Placeholders (minimal 1×1 PNGs) are checked in so the folder structure and names stay stable; **replace** them with product-approved **screenshots or exports** when design delivers final assets. Prefer **HTTPS** URLs only in any linked Figma or handoff docs (**NFR.3.1**).

## How to compare implementation to references (AC3)

1. **Viewports:** Spot-check at least **360px** (narrow mobile), **768px** (tablet), and **1280px** (desktop). Use device toolbar or responsive mode; physical device optional for touch targets.
2. **Method:** Side-by-side — reference image (this folder or Figma) next to `/book/trip-request` at the same viewport. Use a short checklist per slide: step chrome, title hierarchy, field grouping, primary actions (Next / Back / Submit), spacing rhythm.
3. **Precedence:** Functional requirements from **FE.10.1–FE.10.5** ([`docs/stories/10.1.story.md`](../stories/10.1.story.md)–[`10.4.story.md`](../stories/10.4.story.md)) **take precedence** over pixel-perfect mock parity. **FE.10.6** alignment is **SHOULD**-level per epic — adjust mock expectations when **accessibility**, **performance** (e.g. CLS), or **no-price** constraints require it.
4. **Figma:** If product links a Figma file, pin the link in the PR or here under “External references” (optional; checked-in copies in this folder remain the repo source of truth unless product waives in writing).

## Trade-offs

Document in the PR when deviating from references: e.g. stronger focus rings for WCAG, reserved image dimensions for CLS, or copy that reinforces **no instant pricing** on Slide 2.

## External references

_Add Figma or marketing links here when product provides them; do not remove checked-in assets solely in favour of external-only links without product waiver (story 10.5 AC1)._
