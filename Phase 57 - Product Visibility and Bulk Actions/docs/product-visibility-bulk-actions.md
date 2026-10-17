# Phase 57 — Product Visibility & Bulk Operations

## Product management model

One operator-facing switch controls **whether a product is published and orderable**:
- **ظاهر** (Show): active and publicly visible on the B2C or B2B catalog, provided it has valid selling units/pricing for its channel.
- **مخفي** (Hide): unavailable to public website buyers but retained in admin and order history.
- **مؤرشف** (Archived): remains available for historical order references; excluded from normal active-product list.

The database still stores `status`, `availability` and `public_visible` for compatibility with existing checkout and order APIs. **Do not remove those columns**. Phase 57's secured RPC updates all three atomically for Show/Hide.

**Stock** means quantities on hand, reservations, inventory receipts and depletions. This application does not currently implement stock-count inventory. Per-unit "availability" in Product Edit only means whether that size/package is selectable, and must not be presented as inventory tracking.

## Single-item interactions

Each list row and mobile card has a clear, labeled **إظهار/إخفاء** button, a current **ظاهر/مخفي** status, an Edit action, and (admins only) a Delete action. A successful change updates the list and shows feedback; failure explains the reason. The button is disabled while a mutation is running.

## Bulk interactions

Select individual items by checkbox or **تحديد كل المعروض** (at most 50 fetched products). A sticky toolbar appears with:
- إخفاء المنتجات
- إظهار المنتجات
- تغيير قناة البيع إلى B2C أو B2B (Admin/Super Admin)
- حذف/أرشفة المنتجات (Admin/Super Admin only, requires confirmation)

All changes run as a single transaction through the Supabase function `dashboard_bulk_manage_products(uuid[],text,text)`: success for all selected products or rollback. The function locks product records, verifies identities, checks admin role for channel/delete and preserves history-aware delete behavior.

**Channel conversion guard:** If a product is publicly visible, conversion is rejected unless valid selling units exist for the target channel (B2C also requires a base price). A hidden product can be reclassified, but must be configured before publishing. We never copy a wholesale unit price to the consumer storefront or silently reprice an existing order.

**Delete guard:** Existing `dashboard_delete_product` will archive a product with request history; otherwise it may physically delete the product and its related images/units/options. The dialog explicitly warns about irreversible deletion.

## New-product workflow

New products default to **مخفي** until they have been configured and explicitly shown from Product Management. Their channel and per-package availability still live in Product Edit; the overall Show/Hide control is removed from the editor to avoid conflicting ways to change it.

## Deployment — two artifacts are required

1. Back up the original code and database; test on **Supabase staging** first.
2. Run `supabase/migrations/20261017000200_product_visibility_bulk_actions.sql` on staging and test permissions, product readiness and rollback. **No migration is executed by merging GitHub.**
3. Overlay Phase 57 replacement `src/` files into the current ChefMujahed or Figma Make project.
4. Exercise single Show/Hide and multi-select Show/Hide, moving between B2C/B2B, and delete on safe test products. Use an Admin and a Supervisor test user, a B2C product lacking units, and a product with order history.
5. Apply the vetted migration and frontend together in production.

**Do not ship frontend alone:** The new controls call `dashboard_bulk_manage_products`. If the migration is missing, an error will display rather than silently pretending the change succeeded.

## Acceptance QA

- Single Show/Hide responds within one command and remains correct after refresh.
- Filter **الظهور** has one set of states; list no longer duplicates **التوفر/الظهور** columns.
- 375px, 768px and 1440px: checkboxes, quick button, sticky bulk toolbar fit without clipping. Test touch as well as pointer/keyboard.
- Select 3 products, hide; verify all 3 hidden and checkout catalog unaffected for other products.
- Show a complete item; show an incomplete B2C item; the latter must fail without changing any selected product.
- Convert an active B2C item with only B2C units to B2B; the whole batch must fail (or hide first, reclassify and configure units, then show).
- Delete products with/without order history after explicit confirmation; ensure order histories remain intact.
- Newly added products start hidden, and show only after settings are ready.
- No WhatsApp handoff, order discount, or invoice logic changed.
