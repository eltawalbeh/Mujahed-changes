# Chef Mujahed — Dashboard Action Design System (Phase 56)

**Scope:** operations dashboard on desktop, iPad/tablet, and touch/mobile. The shared implementation is `src/components/ui/Button.tsx`; breadcrumbs use `src/components/dashboard/DashboardBreadcrumbs.tsx`. Do **not** introduce new one-off button classes for equivalent actions.

## Hierarchy

| Variant | Use | Examples |
|---|---|---|
| `primary` | Single principal action of a form/workflow | Create order, Save units, Approve |
| `secondary` | Navigation, edit, filter/reset, reversable follow-up | Pricing/invoice tab, convert request, clear filters, refresh |
| `subtle` | Lower emphasis background action | Contextual tertiary actions |
| `danger` | Risk of losing work or changing a request irreversibly | Cancel order, Delete unit, Delete product |
| `ghost` | Supporting non-critical action when surrounded by other CTAs | Dismiss a dialog (not destructive) |

`sm` is 40 px, `md` and `icon` are 44 px, `lg` is 48 px. All variants support distinct **rest/hover/focus-visible/active/disabled** states, pointer cursor, and keyboard access. Icon-only controls **must** include `aria-label` and preferably `title`.

## Behavior

- Avoid underlined text + arrow icons as pseudo-buttons. Use `<Button variant="secondary">…</Button>` for actions; links that navigate to a different URL stay semantic `<Link>` elements and should have equivalent hover/focus visuals.
- Use explicit **confirmation and visible success feedback** for reclassifying/canceling/deleting, not just a color change.
- **Cancel request**: `danger` (outlined red), still requires confirmation.
- **Order inbox Refresh**: icon-only `ArrowClockwise`, `aria-label="تحديث الطلبات"`, title tool tip.
- Keep the **payment/invoice shortcut** a secondary control, not the primary workflow CTA.
- Do not rely on pointer hover for touch. Solid visible border at rest, press feedback, and 44px minimum hit targets make action recognizable without hover.
- Do not change B2C WhatsApp handoff or pricing calculations when adjusting presentation.
- RTL: Arabic labels and breadcrumbs start at the logical start (right). Bidi order codes use `<bdi dir="ltr">`.
- Breadcrumbs must be navigational, at least 14px, with `aria-label="مسار التنقل"` and `aria-current="page"` for the last segment.

## Form decisions

**B2B payment terms** records a commercial collection agreement such as **payment on delivery**, **Net 7**, **Net 30**, or **monthly account**. It does not automatically enable credit, change payment status, collect money, or issue invoices.

**Product units:** each unit has an independent price, channel, and availability selector. Unit availability determines whether customers can select that packaging/size; product availability is separate and controls whether the product is shown on its storefront. Use responsive grids with `min-w-0` inputs and visible labels.

## QA checklist

- Mouse: distinguish rest from hover on all secondary and destructive actions.
- Keyboard: reach all actions with Tab, display focus ring, activate with Enter/Space.
- Touch at 375px and 768px: no overflow, actions still visually recognizable and >=44px for primary navigation/editing actions.
- Desktop at 1440px: breadcrumb readability, correct action grouping and alignment in RTL.
- Cancellation requires explicit confirmation and communicates failure/success from server.
- Product units at mobile/tablet/desktop: availability selector stays **inside** the card; numeric price field does not squeeze it out.
- Editing customer: payment terms helper is readable, including on iPad in a scrollable dialog.
- Search/clear filters, refresh icon and product row actions can be activated without relying on mouse hover.
- Run TypeScript validation and Vite build; existing legacy TS issues must be resolved or documented, not silently ignored.
