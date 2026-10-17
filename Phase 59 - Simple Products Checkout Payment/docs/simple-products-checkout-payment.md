# Phase 59 — Simple B2C Products, Checkout, and Payment UX

## Single product rule (requested)
- If a B2C product has **no configured active B2C units** but does have a valid base price, customers may add it to the cart as a **قطعة**. No artificial unit record is created.
- If active B2C units exist, the customer must pick a valid available unit; if there is exactly one available choice, it is preselected and the selector is hidden.
- All product prices are authoritative on the server. `submit_b2c_request` accepts a blank Unit ID only when no B2C units are configured and reuses the product base price, rejecting missing/invalid pricing or attempts to bypass actual units.
- `dashboard_bulk_manage_products` now treats a base-priced simple B2C product as publishable, including B2B-to-B2C channel conversion when the new channel has no configured units. It does not create unit records.
- Products with configured units all marked unavailable remain unavailable, not converted silently to simple products.

## Customer checkout
- B2C `CustomerFulfillmentPage`: visible **العودة إلى السلة** opens the existing cart when navigating home, preserving customer/form draft state.
- Progress labels updated to `Step 2 of 3` and `Step 3 of 3`.
- Product thumbnails are saved with new cart additions; existing cart items can look up the primary product photo on demand. `RequestItemRow` and mobile/desktop Review display product photography with fallback.
- WhatsApp submission handoff is unchanged.

## Staff dashboard
- Orders inbox: remove the decorative ← from row action labels.
- Request Details: WhatsApp customer control is green with recognizable hover/focus/active feedback.
- `PaymentWorkflowPanel` uses selection cards and a visible radio state:
  - **B2C:** paid now (requires payment method: cash, bank transfer, CliQ, mobile wallet) or collect on delivery/pickup.
  - **B2B:** paid now (same method selection) or monthly company account. No misleading Cash-on-delivery option for B2B.
  - Monthly account is not recorded as already paid. The backend rejects retail-style collection payment for B2B to match the workflow.
  - Staff must explicitly press **تأكيد الاختيار واعتماد الطلب** after choosing. API rejects PAID without a method.

## Deployment
1. Backup the database and frontend. The Phase 59 migration at `supabase/migrations/20261017000400_simple_b2c_products_and_payment_choices.sql` is **already applied** to the Chef Mujahed linked Supabase project. It modified protected functions only; no existing products/requests were edited.
2. Deploy the matching Phase 59 frontend replacements into Figma Make, then publish.
3. Do not rerun the live migration for this project. It is included so test/staging copies can reproduce the change.
4. Verify actual cart behavior with a B2C product without units, one with units, and one with units all unavailable. Verify images for **تشيز كيك بلوبري** (one image recorded in Supabase).
5. Verify checkout back navigation, Step 2/3 and Step 3/3, unchanged WhatsApp handoff, green WhatsApp button, and no decorative arrow in the order inbox.
6. Test B2C PAID with each method, B2C pay-on-collection, B2B PAID and monthly account. Check invoice payment status snapshots, and that the B2B option never implies paid until actually collected.

## Verification notes
- GitHub Actions Vite frontend build passed; pre-existing TypeScript debt is tracked separately.
- SQL migration installed and function signatures checked via read-only queries. No live order was submitted or customer payment changed for testing.
- Live-browser end-to-end/visual QA remains necessary after Figma Make publish, particularly on mobile/tablet.
