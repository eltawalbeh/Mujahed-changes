# Phase 55 — Dashboard Secondary Actions
One-file usability patch for the two secondary text actions on the Chef Mujahed request detail screen.

## What changed
- **تحويل إلى طلب شخصي:** secondary text action with visible hover, border, pointer, press, and keyboard focus, 44px target. Confirms before reclassifying, disables during saving, and gives contextual success feedback.
- **تعديل الخصومات وعرض الفاتورة:** same understated interaction pattern; selects the Billing tab and scrolls/focuses the selected destination so the action is visibly acknowledged.
- Primary CTA styles and global dashboard link styles remain **unchanged**.

## Deploy
The exact original source patch was created against `eltawalbeh/ChefMujahed` main after Phase 54. Copy `src/pages/dashboard/RequestDetailsPage.tsx` into its equivalent path in the app / Figma Make. It is frontend-only: no migration, no changes to invoices or WhatsApp. Check both actions with pointer hover, keyboard Tab/Enter, and on mobile. Screen-reader focus uses the real target billing tab.

## Status
A successful Vite build proves compilation, not the appearance of hover in a running browser. A live visual check is still recommended.
