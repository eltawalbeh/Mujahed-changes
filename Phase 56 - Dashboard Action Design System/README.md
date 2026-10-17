# Phase 56 — Dashboard Action Design System + Responsive UX

Source: [ChefMujahed PR #3](https://github.com/eltawalbeh/ChefMujahed/pull/3) merged to the original app. Contains **10 replacement TS/TSX files**, one design-system specification, and this README.

## Implemented

1. **Shared Button component** (`primary`, `secondary`, `subtle`, `danger`, `ghost`, `icon`). Consistent hover, focus, pressed, disabled states; 40–48px touch targets depending on button size.
2. **Order details:** Cancel Order now looks like a red, outlined destructive action. Pricing/invoice and convert-to-personal are real secondary buttons (no underlined, upward arrow pseudo-CTA). Request number uses isolated LTR rendering.
3. **Orders inbox:** a labeled refresh **icon-only** button, visible filter/clear buttons and discoverable status chips.
4. **Product Units Editor:** inputs are inside the unit card on desktop/tablet/mobile, with shorter price field and responsive grid. Availability is a dropdown labeled **توفر هذه الوحدة**, distinct from the product's overall availability. Prevents the overflowing control shown in QA screenshots.
5. **Product list:** same shared action variants for create, edit, view, delete and clear filters; keyboard focus on actions.
6. **B2B Customer Profile:** "شروط الدفع" now has examples and explanation. No automatic credit/accounting logic is claimed or added.
7. **Breadcrumbs:** reusable, readable Arabic breadcrumbs on request, customer and product detail pages; navigable and keyboard-accessible.
8. **Customers:** better tab states, clickable profile cards, standardized accessible X close button.
9. **Legacy code:** corrected a pre-existing malformed prop type in ProductDetailsDrawer so TypeScript can report further existing errors.

## Deploy
1. Snapshot your current Figma Make project.
2. Copy only the **contents** of this bundle's `src/` folder to the same relative paths in the app. Do not move the outer Phase 56 folder into `src/`.
3. No SQL migration is required for this UI update. Existing Phase 53 pricing/database requirements remain separate; no WhatsApp change.
4. Run QA at **375px mobile**, **768px tablet**, **1440px desktop**. Test mouse, touch, Tab/Enter keyboard, and the destructive-action confirmation.
5. Review `docs/dashboard-action-system.md` before implementing future dashboard actions; do not add ad hoc button styles for equivalent actions.

## Build and audit
- The original app's **Vite production build passed** in GitHub Actions.
- A strict TypeScript run still surfaces **pre-existing type errors** in unrelated files (DashboardChrome etc.). The audit is non-blocking but visible in the action log. Do not report it as a clean typecheck.
- Build success doesn't prove real browser visual QA; inspect the product unit form on actual tablet/mobile devices.
