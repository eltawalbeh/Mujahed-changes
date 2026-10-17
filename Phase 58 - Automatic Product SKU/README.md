# Phase 58 — Automatic Product SKU (B2C + B2B)

**Source:** [ChefMujahed PR #7](https://github.com/eltawalbeh/ChefMujahed/pull/7) — merged.

## SKU pattern
- B2C: `CM-B2C-0001`, `CM-B2C-0002`, ...
- B2B: `CM-B2B-0001`, `CM-B2B-0002`, ...
- Every new product is given its code by Supabase, **never by an employee**.
- Existing codes (`CM-001` etc.) remain unchanged; identifiers stay with products even if their channel is later changed.

## Included changes
- Product create **page** and **drawer** show a read-only suggested code that updates when the employee selects B2B/B2C. The definitive number is assigned when saving (atomic PostgreSQL sequence).
- Bulk XLSX products can leave **SKU blank** and have numbers assigned automatically. Units are associated through `رقم صف المنتج` in both Products and Units sheets; no SKU is needed for new units.
- The optional **existing SKU** column in bulk is used only to update a product already in the database. A fabricated or nonexisting SKU is rejected.
- Newly imported products start **hidden**. After import, the list of created products and their actual SKUs is shown.
- The SQL migration changes protected RPCs, creates sequences per channel and reloads schema cache. It does **not** renumber or delete existing products.

## Deployment status
The Supabase migration **has already been installed** on the Chef Mujahed Supabase project `hqvxhhhwzhefydvwlpje` and verified by querying the function signatures and privileges. Do **not** rerun it simply to upload the bundle.

**You only need to copy the 6 matching `src/` replacement files** into Figma Make/app source to expose the new UX and XLSX template. Rebuild/re-publish the frontend.

The SQL is included as the canonical tracked migration and for non-production copies; only apply it in other environments that haven't installed Phase 58.

## Test it
1. From Dashboard → Products → Add, toggle B2C/B2B. SKU is read-only and follows the channel.
2. Save one B2C product and one B2B product and check actual SKUs in product detail and search. They start hidden.
3. Download the new XLSX template, add two products and their Unit rows with matching **رقم صف المنتج** (e.g. 1, 2), and leave SKU empty.
4. Preview: each new row says **تلقائي عند الاستيراد**. Import: generated SKUs are listed in success feedback.
5. Enter an invented SKU for a new bulk product; preview/import must reject it. Provide a real existing SKU to update an old product.
6. Ensure old orders, SKUs, prices, images, WhatsApp, and company data remain unchanged.

## Caveats
- A read-only SKU preview is **not a reservation**. If simultaneous creations happen, the saved identifier can differ from the preview.
- PostgreSQL sequences guarantee uniqueness, **not uninterrupted/gapless** numbering.
- Strict TypeScript audit on the repo still reports pre-existing errors unrelated to SKU; the frontend production build passed.
- A true live logged-in end-to-end test is still needed after frontend publishing.
