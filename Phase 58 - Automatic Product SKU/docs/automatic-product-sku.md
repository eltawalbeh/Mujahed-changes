# Phase 58 — Automatic Product SKU

## SKU numbering policy
- B2C sequence: `CM-B2C-0001`, `CM-B2C-0002`, ...
- B2B sequence: `CM-B2B-0001`, `CM-B2B-0002`, ...
- Existing SKUs such as `CM-001`, `CM-043`, `CM-45` remain unchanged. No database product rows are renumbered.
- Each new SKU is atomically allocated by PostgreSQL sequences. Unique constraint `products_sku_key` prevents duplicates.
- The read-only preview when opening Product Create is advisory. If two editors create a product simultaneously, the final issued SKU may differ; final identifiers appear in Product Edit / list after saving.
- **Immutable:** SKU is issued on initial product creation and not changed when an existing product is later moved to a different sales channel. Its prefix therefore identifies the registration channel, preserving existing references.

## Single create
- `ProductFields` shows SKU as a readonly preview, updated when B2B or B2C changes.
- Neither the page nor the drawer asks the employee for SKU or sends a manually invented SKU to the backend.
- The guarded `dashboard_create_product` RPC ignores any supplied SKU and assigns one atomically.
- Existing hidden-by-default product creation is preserved.

## Bulk XLSX
- **No SKU column required to create products.** Empty `sku` generates a new code.
- Sheet Products: `رقم صف المنتج` is a local workbook reference (1,2,3...), not a SKU. The file reader uses each row number by default when no explicit reference is present.
- Sheet Units: `رقم صف المنتج` links to the matching Products row, so units and pricing attach correctly even though no SKU exists yet.
- An optional existing SKU identifies **updates only**. A nonempty SKU not matching an existing product is rejected; it can no longer create a new manual product code.
- Bulk new products start hidden. Existing product updates preserve their documented import behavior.
- The result returns `createdProducts` with the actual generated SKUs.
- Legacy XLSX imports that link units using an existing SKU still work.

## Install (backend and frontend must match)
1. Take a database backup; test this migration in staging if available.
2. Apply `supabase/migrations/20261017000300_automatic_product_sku.sql` (creates two sequences, 2 helper functions, replaces create/preview/import RPCs, refreshes PostgREST). It **does not update or delete any existing products**.
3. Deploy matching `src/` files and rebuild Figma Make. Backend may be upgraded first. Do not deploy the new frontend without its RPCs.
4. Verify permissions: only ADMIN/SUPER_ADMIN can create/import/preview. An authenticated ordinary customer must not be able to claim or view these functions.
5. On a test account: B2C single, B2B single, mixed-channel XLSX with two units each, existing SKU update, rejected manual unrecognized SKU, and concurrent submits. Test readonly preview and actual value after saving.
6. Verify no duplicate SKU and that existing `CM-xxx` product IDs/reference links are unaffected.

## Notes
- PostgreSQL sequences can have gaps after failed/rolled-back insertions or aborted imports. SKU is a **unique identifier**, not a gapless invoice number.
- Bulk channel changes do not rename existing SKUs; SKU identifiers are permanent. This protects product references and audit history.
- No changes to WhatsApp, checkout, invoices, discounts, or existing product pricing.
