# Wheelzie reference screenshots

This folder holds **canonical PNG exports** for Epic **17** / **18** visual QA. They are the **Wheelzie** car-rental admin UI references (layout, density, component patterns). Product vocabulary stays **Vestroo** — see [`visual-redesign-references.md`](../visual-redesign-references.md) and **NFR.17.7**.

## Files (rename local copies to match)

| File | Reference screen | Primary patterns for Vestroo |
|------|------------------|------------------------------|
| `01-drivers.png` | Drivers + profile rail | Split list / detail, status pills, table with avatars, bottom promo + logout |
| `02-payments.png` | Payments / invoices | KPI strip (3 cards) + filter row + data table |
| `03-clients.png` | Clients | Table: checkbox, avatar+email, sortable header, **Add** CTA |
| `04-tracking.png` | Tracking | Left list + map + info cards; **On trip** / **Returned** pills |
| `05-calendar.png` | Calendar week | Week grid, Pickup/Return legend, **Schedule detail** right rail |
| `06-bookings.png` | Bookings | **KPI row (4) + sparklines**, **stacked bar** (Done vs cancelled), **then** search/filters + **Add booking** + table |
| `07-units-grid.png` | Units (grid) | 3-up card grid, status pills, spec row, **Select** CTA |
| `08-unit-details.png` | Unit details | Hero + thumbs, spec grid (soft blue tiles), right column charts / features |
| `09-units-list.png` | Units (list) | Horizontal card row, pagination footer |
| `10-dashboard.png` | Dashboard | KPI row, **Earnings** area chart, **Rent status** donut, **Bookings** bar chart, **right rail** (quick check, car types, recent activity) |

## “Current Vestroo” QA baselines (optional)

For before/after comparisons, store **internal** shots next to this folder (not required to be in git):

| Suggested file | Route |
|----------------|--------|
| `current-ops-dashboard.png` | `/ops` |
| `current-ops-bookings.png` | `/ops/bookings` |
| `current-ops-walk-in.png` | `/ops/walk-in` |
| `current-ops-account-bookings.png` | `/ops/...` account queue if applicable |

## How to use in PRs

1. Open the matching **`06-bookings.png`** / **`10-dashboard.png`** side by side with the implementation.
2. Check **layout zones** first (KPI band, chart band, filter row, table — **not** only table cells).
3. Then **tokens** (canvas, active nav background, primary button, pill shapes).

If the repo Copy/Paste from Cursor workspace assets, paths like `assets/c__Users_..._wheelzie-reference-*.png` may exist locally — **normalize** into this folder with the table filenames above so links in docs stay stable.
