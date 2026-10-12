# Scotch POS — Retail operations demo

An interactive, frontend-only prototype of Scotch's retail management experience for an independent liquor store: inventory, suppliers and purchase orders, analytics with smart ordering, online sales and channel integrations. All data is fictional and lives in your browser — nothing is sent, charged or connected.

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build (all routes compile)
```

## A 2-minute demo script

1. **Overview** → *Needs attention* flags a whiskey running out before a delivery can arrive.
2. Open it → the product page explains the reorder: *"Reorder 24 bottles of Jameson Irish Whiskey. Current stock is 8, average sales are 2 per day, and Northwind Spirits Co.'s lead time is 7 days."*
3. **Create draft PO** → lands on step 2 of the order workflow, prefilled. Add the supplier's other recommended items in one click, continue, **Submit**.
4. On the purchase order, **Receive stock** → record a partial receipt (e.g. 10 of 24), then **Receive remaining**. Stock updates exactly once per receipt; over-receiving is blocked.
5. Back on the product and **Overview**, stock status, low-stock counts and inventory value have moved.
6. **Online sales → Catalog** shows the same product's channel listings; **Sync catalog** previews what will change. Tick *Simulate a failed sync* to see failure and retry.

Other states worth showing: the header **Demo** menu (fail the next request, preview empty states, reset data), the store switcher (Downtown / Riverside), ⌘K global search, and **Smart ordering** (filter, edit quantities, dismiss/restore, create one draft PO per supplier).

## Design system

Built on **KernUI** (Figma › Color & Semantics, Badges & Tags, Icons):

- Tokens live in `src/app/globals.css` as a Tailwind v4 `@theme`: KernUI primitives verbatim, semantic roles with KernUI names (`text-sub`, `bg-surface`, `stroke-soft`, `success-base`…), KernUI radii (8/12/16/24/32) and shadows.
- Per KernUI's "Changing to your brand color" guidance, `primary-*` is remapped from purple to Scotch forest green (`green-950` base).
- Icons are **Iconoir**, KernUI's icon set. Typeface is **Inter**.
- Badges implement KernUI's Fill / Light / Dark / Stroke styles. *Deviation:* Light/Stroke badge labels use the `-dark` tone instead of `-base` so text meets WCAG AA; the dot keeps the vivid hue.
- Chart colors (`--color-series-*`) were validated for color-vision-deficiency separation; every chart has a table view.

## Architecture

```
src/
  app/                    routes (thin server files → feature components)
  features/<area>/        screens and their dialogs (overview, inventory, suppliers,
                          purchase-orders, analytics, online, integrations, settings)
  components/ui/          KernUI component library (button, badge, tag, input, select,
                          dialog/drawer/confirm, menu/popover/tooltip, data-table,
                          filter-menu, tabs, toaster, states, display)
  components/charts/      Recharts primitives (time series, bar list, legend, table twin)
  components/domain/      product thumbnails, status badges
  components/shell/       sidebar, header, ⌘K search, notifications
  lib/
    types.ts              domain model (stable ids, references by id)
    domain.ts             business rules (stock status, margins, PO/order transitions)
    data/                 deterministic seed (100 products, 12 suppliers, 20 POs,
                          30 orders, 3 channels, 10 notifications) + 180-day sales history
    analytics.ts          range resolution, summaries, series, product performance
    recommendations.ts    rule-based smart ordering (explainable math)
    store/app-store.ts    Zustand + Immer store, persisted to localStorage
    simulate.ts           simulated requests: mutations commit only on success
```

Key decisions:

- **One source of truth.** Every KPI, chart, top-seller list and reorder velocity derives from the same seeded sales history plus live inventory state, so switching date ranges moves everything together and stock changes recalculate the dashboard.
- **Failures never partially modify data.** Async actions await a simulated request and only then apply the mutation; the demo's *fail next request* switch exercises every error/retry path.
- **Receipts are idempotent.** Each receive dialog session carries a receipt id; quantities are clamped to what's outstanding.
- **URL as UI state.** Filters, tabs, sort, pagination and date ranges live in the query string, so dashboard deep links, refresh and back navigation restore the view.
- **Accessible primitives.** Dialogs, menus, selects, switches and tooltips use Radix; tables have captions and `aria-sort`; focus is visible throughout.
- Next.js 16's Cache Components/Activity is disabled on purpose (see `next.config.ts`): with all state client-side, hidden-but-mounted routes would keep transient dialogs open.

## Out of scope

No backend, authentication, payments, real email/phone, supplier EDI, barcode hardware, marketplace APIs or machine-learning forecasts. The UI demonstrates these flows with clearly labelled simulations.
