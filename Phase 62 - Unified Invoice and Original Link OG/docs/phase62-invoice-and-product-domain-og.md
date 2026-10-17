# Phase 62: One Invoice and Original-Domain Social Sharing

## Invoice presentation
Issued invoice discounts now appear as ONE inline customer-facing discount row within the same invoice number, both in the CMS and its existing PDF/print action.

Example: Original JOD 3.000, post-issue approved discount JOD 1.000, **final displayed total JOD 2.000**.

- No extra invoice/adjustment print button or separate colored summary card.
- No staff names, discount explanations or audit timestamps in the customer-facing invoice or PDF.
- Detailed reasons, approving role/actor and dates remain inside Order Details -> Notes & History -> Internal discount audit.
- Post-issue adjustments are read from the secure append-only Phase 61 ledger. Issued invoice snapshots, database totals, tax, invoice number and payment status are NOT altered in-place.
- Already-paid orders may require separate refund/settlement. A revised customer-facing display is NOT legal certification as an amended tax invoice; check any Jordanian credit-note requirements with the accountant.

## Direct product URL social metadata
The original product link at https://chefmujahed.com/product/cm-050 currently serves Figma Make's general social preview image. Client-side meta tags cannot fix bots that read server HTML.

An OPTIONAL Cloudflare Worker implementation is prepared under infra/og-product-routing/cloudflare-worker.mjs. It can:
- Intercept only social bots on /product/:slug and /business/product/:slug.
- Return server-generated product title and current image from the already deployed public product-share edge endpoint.
- Set OG URL to the ACTUAL pasted original chefmujahed.com URL.
- Reject unavailable and hidden items; pass all ordinary human requests and all other paths to the current storefront.

**This Worker is NOT deployed on chefmujahed.com.** The domain currently uses ns13.domaincontrol.com / ns14.domaincontrol.com nameservers and Figma Make hosting; the connected Vercel workspace is not the domain owner. Production interception requires explicit domain-owner approval, access to suitable edge routing/DNS and staged testing that preserves Figma Make custom-domain routing and TLS. Do not alter DNS records/nameservers automatically.

Until this gateway is activated, the product-specific Share button from Phase 61 uses a different public URL whose OG preview is already available. Copying chefmujahed.com/product/cm-050 directly can STILL show the general image. Do not claim otherwise.

## QA
- Production Vite build.
- Cloudflare Worker mock verifies crawler-only routing, product-specific tags, B2B/B2C, invisible products returning 404 and pass-through of human checkout/dashboard traffic.
- PDF fixtures via Chromium:
  - B2C short (8 lines) -> 1 A4 page
  - B2B short (10 lines) -> 1 A4 page
  - B2B with post-issue discount (3.000 - 1.000) -> 1 A4 page, without private notes
  - 42-line invoice -> 3 populated pages without blank trailing pages.
- No live financial transactions or DNS changes have been made.

## Deployment
1. Apply only the Phase 62 src file changes to Figma Make; Publish.
2. On a designated issued test invoice, verify one inline deduction line and the correct PDF. Confirm audit reasons only appear on the internal History tab.
3. If the owner approves original-domain OG routing, arrange Cloudflare (or equivalent edge) zone access, stage, test, then activate gateway explicitly. That activation is a separate infrastructure action, not achieved by pushing a GitHub or Figma Make change.
