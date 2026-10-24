# Phase 68 — Manual Request Loader Hotfix

**Target: Figma Make only. Repository: Mujahed-changes. Do not commit to ChefMujahedNew directly.**

## Confirmed issue
The new Phase 67 dialog gathers all product pages in `productsTask`, returning `DashboardProductListItem[]`. But after `Promise.all`, the UI still called `p.items.filter(...)`, treating that array as an object with `items`. This throws `TypeError` after the RPCs complete and triggers the misleading error **«تعذر تحميل بيانات العملاء أو المنتجات. أغلق النافذة وحاول مجددًا.»**. The selected product list stays empty even though the database contains products.

## Fix: one file
Replace **only** the file at `src/components/dashboard/ManualRequestDialog.tsx` with the bundled version, or selectively merge this exact change in Figma Make:

```diff
- void Promise.all([customersTask,productsTask]).then(([c,p])=>{
+ void Promise.all([customersTask,productsTask]).then(([c,allProducts])=>{
    if(cancelled)return
    setCustomers(c.items)
-   setProducts(p.items.filter(item=>item.channel===type||item.channel==='BOTH'))
+   setProducts(allProducts.filter(item=>item.channel===type||item.channel==='BOTH'))
  })
```

Also hides the generic “no matching products” message when a real load error is displayed.

## Supabase / previous migration
The Phase 67 SQL migration was **applied and verified live** to Chef Mujahed Supabase on October 24, 2026, under migration version `20261024132139`, name `manual_request_all_products`. The protected backend now accepts non-archived products for manager-created orders, including unitless single products. **No additional SQL is needed for Phase 68**, and **do not re-run Phase 67 migration** on this database.

## Validation
1. Merge updated component through Figma Make and publish.
2. Run `node scripts/qa-manual-request-loader.cjs` in the merged source (after placing the QA script in the matching `scripts` path).
3. Open Dashboard → Requests → Add Manual Request in a fresh/reloaded session.
4. B2C should show all non-archived B2C/BOTH products, including ones marked hidden; B2B should show B2B/BOTH products. Visibility and recorded availability badges are separate.
5. Test selecting a hidden item and a unitless item without creating a production order unless using an approved test customer.
6. The public catalogue should remain unchanged.

Root cause identified on ChefMujahedNew push `8a1858f70864ea586098e459fb411cd833ccd520`. The original repository was read-only during this work.
