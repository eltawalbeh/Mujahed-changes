# Phase 61 — Post-invoice Discounts & Product-specific Social Share Images

Source: [ChefMujahed PR #11](https://github.com/eltawalbeh/ChefMujahed/pull/11), merged.

## Feature A — Controlled post-issue discount
Managers (ADMIN) and system managers (SUPER_ADMIN) may register an exceptional order-level or item-level discount **after invoice issuance** using an amount (JOD) or percentage.
- The **reason is required (10+ characters)**.
- The server enforces permissions, issued-invoice status, item ownership, remaining-balance limits and cumulative adjustments inside a locked transaction.
- Audit includes actor, role, time, reference, amount, reason, and balance after. History is append-only.
- **Original issued invoice/total/payment record remains unchanged.** Adjustments appear in a separate summary and printable supporting discount note; B2B/B2C both supported. Paid orders require a separate actual refund/reconciliation (not automatic).
- This is an operational discount note, *not a Jordanian tax-approved credit note*. Ask the accountant before official issuance.

## Feature B — Per-product social media OG photos
The Figma Make site is a JavaScript SPA. Dynamic client-only OG tags are not reliable for WhatsApp/Facebook crawlers. A **read-only public Supabase Edge Function** returns real crawler-readable HTML meta tags (title, description, current primary photo), with a link and human redirect to the product page.

Click **مشاركة المنتج** on B2C or B2B detail pages to share/copy the dedicated link. For example:

`https://hqvxhhhwzhefydvwlpje.supabase.co/functions/v1/product-share?slug=cm-050&channel=B2C`

This resolves **Pumpkin Donut** using its real live image and takes human visitors to `https://chefmujahed.com/product/cm-050`.

Only public, active, available products render OG metadata. Hidden/unlisted products return 404. B2B OG never includes prices.

**Important:** Copying the original Figma Make site product URL manually from the browser address bar is **not guaranteed** to show the product photo in social crawlers. Use the share-link button. For the original domain URL itself to supply server OG, Figma Make hosting would need an additional server-side route/prerender integration.

## What's already deployed
- `supabase/migrations/20261017000700_post_invoice_discount_adjustments.sql` — **applied**, functions and privileges confirmed. No past invoice records rewritten.
- `supabase/functions/product-share/index.ts` — **deployed and ACTIVE**, anonymously accessible for social bots, public-read only.
- Production Vite build, Edge Deno check and real product-share endpoint smoke tests passed: [GitHub Actions](https://github.com/eltawalbeh/ChefMujahed/actions/runs/39038963834).

**Do not run the migration again or redeploy the Edge Function solely for uploading the Figma Make frontend.** Source files are included for reproducibility.

## Upload (9 src replacements)
1. Snapshot Figma Make, then overlay the nine source files in this bundle under `src/` to their existing relative paths.
2. Rebuild and publish the site. GitHub merging does not automatically publish Figma Make.
3. Test an **issued** B2C or B2B invoice with Admin: apply a 5% post-invoice adjustment with a detailed reason, then a fixed JOD item adjustment. Verify original invoice unchanged, new discount summary, actor audit, and printed supplementary note.
4. Test Supervisor: no editing UI and RPC access must be denied.
5. Test a fully paid invoice: show refund/reconciliation warning (no automatic refund).
6. On product pages, click `مشاركة المنتج`. Paste the generated link into WhatsApp or Facebook and check product-specific preview. Social preview caches may require re-scraping.

For detailed limits, see `docs/phase61-postinvoice-adjustments-social-sharing.md`.

The frontend build/metadata smoke tests pass. Full real-browser staff-authorized discount mutation was **not** executed on live orders; use designated test orders for final QA.
