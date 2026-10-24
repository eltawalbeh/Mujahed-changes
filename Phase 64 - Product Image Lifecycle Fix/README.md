# Phase 64 — Product Image Lifecycle Fix
Fix bundle for **Chef Mujahed**. Hosting stays **Figma Make + Supabase + GoDaddy**.

## Confirmed defect
The production RPC `dashboard_update_product_basic` inserts an image row on *every* basic save. Its empty image URL only unsets the primary flag. This causes repeated image gallery entries, and “remove image” does not remove records.

## Fix
- SQL: explicitly empty image → hard delete all product_images rows for that product; changed image → delete old rows, insert just one; same image → do not append, deduplicate repeated URLs. Basic saving does not remove distinct existing galleries when image is unchanged.
- Dashboard: image upload and remove are immediately saved through the authenticated RPC; explicit remove-all button; manual URL field still saves with basic details; preserve unrelated unsaved text edits on image operations.
- Edge media endpoint: delete obsolete files from Supabase Storage **only** if URL belongs to that product's dedicated folder and no product_images row references it. Skip shared/external images. Warn on cleanup failure.
- No mass cleanup of historical data. No DNS or hosting changes.

## Files to merge by matching relative path
1. `src/pages/dashboard/ProductEditPage.tsx`
2. `src/components/dashboard/ImageUploadField.tsx`
3. `src/lib/mediaUpload.ts`
4. `supabase/functions/server/index.tsx`
5. `supabase/migrations/20261024000100_product_image_lifecycle_fix.sql`
6. `scripts/qa-image-lifecycle.cjs`

## Deployment order
1. Review current deployed `make-server-146e5e37` Edge Function before deployment: do **not** replace a newer deployed Edge Function with this older repository copy. Merge just the new endpoint into deployed source if necessary.
2. Apply Supabase SQL migration (schema/RPC replacement) using Supabase migration tooling. Applying the migration deletes **no existing images**.
3. Deploy media cleanup endpoint; test authenticated access and attempts to clean a shared URL/other product folder.
4. Merge three Figma Make frontend files, publish.
5. QA a disposable B2C product: upload A → 1 row; save basics repeatedly → 1 row; upload B → 1 row B, old A removed if unreferenced; remove → 0 rows; new upload C → 1 row; test B2B too. Wait >25s for public catalog cache, re-open product. External/shared image URLs must never be deleted from Storage.
6. Review older duplicate image rows individually; no automatic bulk destructive cleanup.

## Known operational limitations
- If a DB save succeeds but Storage cleanup fails, the DB state is correct and the UI warns; an orphan file might remain. Retry targeted cleanup under authorized session.
- If upload completes but saving image to DB fails, it may leave an orphan; cleanup with reviewed orphan reconciliation.
- Site pages sometimes use externally hosted images; these get unlinked but are intentionally not deleted externally.
- Current separate ImageUploadField CMS uses remain unchanged (no onPersist prop).
