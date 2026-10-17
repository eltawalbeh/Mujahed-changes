# Phase 60 — Pricing Discounts + Professional Invoice QA

**Source:** [ChefMujahed PR #10](https://github.com/eltawalbeh/ChefMujahed/pull/10) · merged.

## Delivered (5 frontend replacement files)
- `src/pages/dashboard/RequestDetailsPage.tsx`: pricing lock reasons, separate per-item Save controls and consistent status feedback.
- `src/components/dashboard/OrderDiscountEditor.tsx`: accessible percentage/fixed amount selector with hover, focus, validation and explanations for locked invoices.
- `src/components/dashboard/ItemDiscountEditor.tsx`: new dedicated row-based item discount input with **حفظ الخصم**, strict 3-decimal and line amount validation, and feedback.
- `src/components/dashboard/InvoicePanel.tsx`: professional invoice preview and print action.
- `src/domain/invoicePrint.ts`: dedicated standalone A4 print document; no dashboard, global print visibility hacks, or unwanted dashboard page breaks.

## What was actually broken
The UI had been deployed before the missing Phase 53 financial backend; production lacked `dashboard_set_order_discount`, customer/order discount columns, and central calculation. Also **7 existing requests already had issued invoices**, which must remain financially immutable. The frontend now says clearly **why** an already issued invoice cannot be discounted.

The scoped Phase 60 migration installs the missing financial RPCs and snapshot calculations without reintroducing the unwanted automatic-unit trigger from Phase 53.

## Supabase status
`supabase/migrations/20261017000600_enable_discount_workflow.sql` was tested inside a **rolled-back SQL transaction** and then **applied successfully** to the linked Chef Mujahed Supabase database.
- Verified `dashboard_set_order_discount`, `dashboard_update_item_discount`, and recalculation RPC availability.
- Only authenticated, role-authorized administrators may edit discounts. Issued invoices remain uneditable.
- Existing issued invoices and their totals were not repriced.
- **Do not reapply the SQL** merely to upload Figma Make frontend. It is included as source/staging documentation.

## Print / PDF QA results
The **actual HTML invoice formatter** was compiled and printed in headless Chromium:
- B2C, 8 line items → **1 A4 page**
- B2B, 10 line items → **1 A4 page**
- Long sample, 42 line items → **3 populated A4 pages**, no blank trailing page

The QA is automated in `scripts/qa-invoice-print.cjs` and the GitHub Actions workflow. Layout includes branding, invoice reference, issued date, company/person, method and state of payment, quantities, unit prices, line discounts, customer/order discounts, and final JOD amount. Company account is labeled unpaid.

This is **not accounting/tax-law certification**. An accountant should confirm any required Jordanian tax invoice metadata before regulatory use.

## Deploy and acceptance test
1. Back up your Figma Make frontend, then copy the **contents of `src/`** into identical paths. Build and publish.
2. Log in as ADMIN/SUPER_ADMIN. Start with a **new, unissued** order (NEW / CONTACT_REQUIRED / AWAITING_CONFIRMATION). Don't test modifying previously issued invoices; those are intentionally locked.
3. Set a line-item discount; press **حفظ الخصم**, verify success and new totals after refreshing the order.
4. Set an order discount by percentage, then a fixed JOD amount; verify net totals and reset to NONE.
5. Confirm order and payment after pricing is correct, then ensure the invoice is frozen and accurately shows discounts.
6. Open **طباعة / حفظ PDF**, review the standalone A4 document in Chrome and Save as PDF. Verify B2C and B2B company account amounts and payment status.
7. The full live checkout/payment interaction remains to be validated with designated test customers.

Vite production build passed. The whole app still has some unrelated pre-existing TypeScript errors in other components.
