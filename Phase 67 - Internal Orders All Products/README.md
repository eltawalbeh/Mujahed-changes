# Phase 67 — Internal Orders: All Non-Archived Products

**Fix bundle only — use Figma Make to merge/publish. DO NOT write or sync changes into ChefMujahedNew via GitHub.**

## Goal
A manager who creates a manual request can select **all non-archived products** for the appropriate B2C/B2B channel, regardless of whether each product is publicly listed or hidden. Public visibility and recorded availability are distinct concepts; choosing a hidden/unavailable product in an internal request **must not publish it** on the website.

## Changes
1. `src/components/dashboard/ManualRequestDialog.tsx`: remove `status: 'ACTIVE'` filter, page through all products (100/page), and preserve channel matching. Show distinct badges:
   - **ظاهر على الموقع** / **مخفي من الموقع**: derived from exactly the public catalog predicate `public_visible && status==='ACTIVE' && availability==='AVAILABLE'`.
   - **حالة التوفر المسجّلة**: display recorded `availability` separately. Availability is *not* a guarantee of actual stock. Show the kitchen-verification reminder.
2. `supabase/migrations/20261024140000_manual_request_all_products.sql`: changes ONLY `dashboard_create_manual_request(jsonb)` to allow **non-ARCHIVED** products regardless of the public visibility or availability flags. Keeps Admin/Super Admin authorization and correct channel type. Explicit unit IDs must still be valid and channel-compatible. Products with no active unit can be requested as single items (`unit_id = null`, `unit_label_snapshot = 'قطعة'`).
3. `scripts/qa-manual-request-all-products.cjs`: static regression checks.

## Database context — observed Oct 24, 2026
- 52 non-archived products: 10 publicly listed, 42 hidden. They were previously blocked by the `status='ACTIVE'` picker filter *and* server-side `dashboard_create_manual_request` validation.
- Some products have no active selling-unit rows; the old database function rejected those as well. This bundle handles them as single-item products.

## Installation steps
1. First **apply the SQL migration to Chef Mujahed Supabase** using the project's regular migration process. No database changes were made when assembling this bundle.
2. Merge `src/components/dashboard/ManualRequestDialog.tsx` into Figma Make at that exact path, carefully merging if there are later Figma Make changes. Publish from **Figma Make only**.
3. Run `node scripts/qa-manual-request-all-products.cjs` after merging; execute the usual build.
4. As Admin, open Dashboard → Requests → Add Manual Request. Confirm that hidden and public products appear with separate badges and are selectable. Try both B2C/B2B with their respective channel products, including a product with no unit; verify the order is saved and public visibility did not change.
5. Confirm archived products remain absent, unauthorized users cannot create internal orders, and the public product catalogue is unchanged.

**Important:** Product visibility/availability flags were historically coupled by the existing Show/Hide action. Therefore, a stored `UNAVAILABLE` flag is merely a recorded system value, **not proof** that the kitchen cannot fulfill an internally created request. Staff should confirm stock and prep feasibility before approving the order.

No Vercel or other hosting changes; hosting remains Figma Make + Supabase + GoDaddy.
