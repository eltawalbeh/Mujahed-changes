# Phase 60 — Pricing Discounts and Invoice Print Quality

## Why the controls were disabled
1. The production Supabase project had **not installed the Phase 53 discount columns/RPC** despite the Phase 53 frontend being live.
2. Seven of the eight existing orders were already **invoiced**. Issued invoices are intentionally immutable. Only an authorized administrator may adjust pricing **before** payment confirmation/approval and invoice issuance.
3. The product-level input previously used `onBlur` rather than an explicit Save control, making updates hard to discover.
4. The old global `window.print()` used visibility hacks to hide the entire dashboard and could retain its layout height as unwanted blank PDF pages.

## Fixes
- Supabase migration `20261017000600_enable_discount_workflow.sql` installs absent customer/order discount fields, secure `dashboard_set_order_discount`, item discount RPC, and centralized recalculation.
- Existing percentage customer policies are migrated to the new policy fields, **without repricing issued invoices**.
- The existing invoice issuance transition now snapshots discounts and computes final amounts from item discounts, customer entitlement, and per-order adjustment in that order.
- **Important:** We deliberately did **not** install the old Phase 53 automatic-unit trigger, since simple B2C products intentionally have no units.
- `OrderDiscountEditor`: percentage/fixed selection remains visible with hover/focus; prominent explanation when invoice was already issued or the staff member lacks ADMIN/SUPER_ADMIN permissions.
- `ItemDiscountEditor`: typed amount, max-line-total validation, visible Save, success/error feedback. Changes are saved server-side and update request pricing.
- Issued invoices continue to show historical totals without using Phase 53 default-zero values to overwrite old discount totals.

## Invoice QA
- Invoice uses a **separate A4-only print document** opened from the issued invoice panel; no dashboard menus, headers, filters, or hidden pages can be included.
- Clear brand/heading, invoice number and issue date, customer/company, phone/contact when recorded, itemized quantity/unit price/line discount/net, all applicable discount totals, tax only if configured, final amount, and payment status.
- B2B credit account is explicitly **not marked paid**.
- The CSS repeats table headers on subsequent pages and keeps individual line rows and totals from splitting across page breaks.
- An automated Chrome-to-PDF QA workflow checks that an 8-line B2C fixture and 10-line B2B fixture take **one A4 page**, and that a 42-line fixture has valid last-page content (no trailing blank).
- This is a business invoice presentation review, **not legal tax compliance certification**. The business accountant should verify regulatory requirements and any tax metadata.

## Before live B2C/B2B acceptance testing
1. Publish matching Phase 60 frontend replacement files to Figma Make.
2. Use a **new request** (status NEW/CONTACT_REQUIRED/AWAITING_CONFIRMATION; no invoice number issued) under ADMIN/SUPER_ADMIN. Existing issued invoices deliberately remain locked.
3. Try 10% order discount, a fixed 2 JOD order discount, and a per-item discount; verify subtotal, combined discount and final total, and reload persistence.
4. Example: 20.000 JOD line subtotal, 5.000 JOD permanent customer discount, 10% extra order discount → **13.500 JOD** excluding tax (when none is configured).
5. Confirm payment and issue the invoice only **after** checking adjustments. Reopen and ensure invoice values are immutable.
6. Print/save a short B2C invoice (one A4 page), a B2B monthly account invoice, and one with enough items to span pages. Check no blank trailing pages.
7. No live request was modified or invoice reissued during migration verification. Test with explicitly designated QA orders.

## Status / limitations
- Supabase Phase 60 migration was applied on the linked Chef Mujahed project after a rollback-only dry run; database objects/permissions were subsequently verified.
- CI Vite production build passes; the repository retains older unrelated TypeScript errors in other components.
- Browser QA in the actually published Figma Make instance still requires operator acceptance.
