# Phase 59 — Simple B2C Products, Checkout Images & Payment UX

Original source: [ChefMujahed PR #9](https://github.com/eltawalbeh/ChefMujahed/pull/9), merged.

## Included: 8 replacement frontend files
- **B2C single products:** If a product has a base price and no selling units, it adds to cart as a single `قطعة` without requiring admin configuration or a phantom unit. Existing multi-unit products still require their configured unit.
- **Checkout images:** Product thumbnails in the cart/fulfillment and mobile+desktop review pages, including fallback for previously stored cart items. Blueberry cheesecake has a primary image in Supabase.
- **Checkout navigation:** `Step 2 of 3` and `Step 3 of 3` labels, a visible **العودة إلى السلة** action, preserving the customer draft.
- **Dashboard order list:** Remove decorative detail arrow.
- **Customer WhatsApp:** Green, hoverable, keyboard-focusable customer contact action.
- **Payment decision:** B2C: paid now / collect at handoff. B2B: paid now / monthly company account. When choosing PAID, select actual payment method (cash/bank/CliQ/wallet), otherwise the approval button remains disabled. Explicit selected state, press/hover/focus feedback, and confirm action. A monthly B2B account is not shown as already paid.

## Backend already installed
The included `supabase/migrations/20261017000400_simple_b2c_products_and_payment_choices.sql` **has been applied successfully to the linked Chef Mujahed Supabase environment**. It replaces the protected request submission, bulk-product publication and payment RPCs. Existing products and orders were not modified during installation.

**Do not rerun this migration on the same live environment when uploading the Figma Make bundle.** It is included for staging copies and source history.

## Deployment
1. Snapshot your Figma Make/current frontend.
2. Copy the **contents** of `src/` from this Phase 59 bundle into the matching source paths. No SQL change is needed on the already-updated linked Supabase.
3. Build and publish. Verify on 375px mobile, 768px tablet and 1440px desktop.
4. Test a single product with base price and **no units**, a product with configured units, and all unavailable units. Only the first two cases should be orderable.
5. Check checkout images, back-to-cart state preservation, English step labels, and existing WhatsApp handoff after submitting a **test** order.
6. Test B2C and B2B payment selection and confirm the resulting payment status/invoice. Never mark unpaid credit as PAID.

## Verification / limitations
- Vite production build passed. Strict TypeScript audit still reports pre-existing errors elsewhere.
- Live RPC definitions were checked after migration. **No real checkout/payment transaction has been performed** as part of verification.
- Actual UI/browser and integration tests are still needed after Figma Make publication.

Technical QA notes: `docs/simple-products-checkout-payment.md`.
