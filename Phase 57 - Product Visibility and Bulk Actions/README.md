# Phase 57 — Quick Show/Hide + Bulk Product Actions

**Source:** [ChefMujahed PR #4](https://github.com/eltawalbeh/ChefMujahed/pull/4), merged into the original repo.

## What you get

- One clearly named **الظهور على الموقع** status (**ظاهر / مخفي**) instead of two confusing **التوفر** and **الظهور** columns.
- **إظهار / إخفاء** quick action available from each product row, including mobile cards, without opening the product editor.
- Checkboxes to select products individually or **all displayed** (up to 50 items per page).
- Sticky bulk toolbar for **Show, Hide, Change B2C/B2B channel, Delete/Archive**.
- One transactional backend action that validates role and selling-unit/channel readiness, and either updates all selected products or none.
- Products default to **hidden when created**, to prevent publishing an unfinished product.
- Overall visibility removed from Product Edit. Per-unit availability (packaging/size orderability) remains in its Units tab.
- Delete confirmation explains permanent deletion versus archival of products tied to historical orders.
- No change to WhatsApp handoff, customer discounts, or invoice workflows.

## REQUIRED rollout order

1. **Back up Supabase and the application.**
2. Apply `supabase/migrations/20261017000200_product_visibility_bulk_actions.sql` to a **staging** Supabase instance and verify its role permissions, transaction rollback, and readiness constraints. The migration is provided in the bundle but **not applied** to the live database.
3. Copy replacement paths under `src/` into the same paths of the Figma Make/app source.
4. Test the single and bulk actions on actual desktop/iPad/mobile plus Admin/Supervisor users.
5. Only after staging QA, apply the migration and deploy the frontend together in Production.

**Important:** Without the migration, the new buttons will report an RPC error. Uploading frontend files alone **does not** enable bulk operations.

## What channel conversion means

A B2C product shown on the website cannot silently switch to B2B if it lacks B2B selling units (or a valid custom B2B unit). A publicly visible B2B product likewise needs a valid price and B2C units before conversion to consumer sale. You can hide the product, change channel, configure the new units in Edit, and show it afterward. We do not copy wholesale prices to B2C, or rewrite historical orders.

## Readiness & legacy data

There are currently 49 product records and no mismatched published/availability status flags. Four B2C products have missing selling units and must be configured before showing as orderable. This bundle **does not create inventory/stock tracking**, which is a different feature from Show/Hide.

## QA and known limitations

- Vite production build passed. Strict TypeScript audit still contains unrelated preexisting errors in the app; see GitHub Actions logs.
- The Supabase migration has **not** been executed or integration-tested against staging/Production here.
- Selection applies only to the 50 items returned by the current list filter, not every matching row across future paginated pages.
- Bulk delete is destructive for products without order history; requires explicit confirmation.
- Check show/hide, multi-selection, B2B/B2C channel changes, archived products, readiness validation, refresh persistence, and touch/keyboard behavior at 375/768/1440px.
- Full technical notes: `docs/product-visibility-bulk-actions.md`.
