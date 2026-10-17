# Phase 61 — Audited post-invoice discounts & product-specific social previews

## A. Post-invoice discount adjustments
Issued invoices remain **immutable** for audit, accounting and customer traceability. Admin/Super Admin can nevertheless record a **separate linked, append-only discount adjustment** after issuance.

- In Order Details → **التسعير والفاتورة**, when an invoice is issued, authorised administrators see the familiar order-level percentage/JOD selector and optional product-level discount boxes.
- Every adjustment requires a nonempty amount and **reason of 10–1000 characters**. A new action saves the adjustment. No existing issued line, price, tax, invoice number, original total or payment status is rewritten.
- The server checks role via `dashboard_assert_role(ARRAY['SUPER_ADMIN','ADMIN'])`, invoice issuance, reason, precise amount, previous adjustments, item ownership, and max remaining value under a row lock. Invalid operations are rejected transactionally.
- Each adjustment stores actor ID/role, employee name (read from dashboard_users), time, reason, invoice reference, original total, individual amount, and balance after.
- Records are **append-only** (a database trigger rejects editing/deleting), tables have RLS with no direct client privileges. The request activity log also records each adjustment.
- Both B2C and B2B are supported. Paid orders show **reconciliation/refund needed** rather than falsely claiming an automatic refund. Original issued invoices still print unchanged. A standalone supplementary discount statement prints the adjustments and reconciled balance.
- Operators should consult their accountant about official Jordan tax credit notes; this is an internal adjustment statement, not a tax-authorised credit note.

### Supabase
Migration: `supabase/migrations/20261017000700_post_invoice_discount_adjustments.sql`.
**Applied to Chef Mujahed Supabase**, after a transaction rollback-only dry run. Functions and restricted privileges verified. **Do not reapply** on that environment solely to deploy frontend.

RPCs: `dashboard_get_invoice_adjustments(uuid)`, `dashboard_add_invoice_discount_adjustment(uuid,text,numeric,text,uuid)`.

### Acceptance checklist
1. Under Admin or Super Admin, open an already issued B2C/B2B invoice; see the fixed/percent controls and mandatory reason.
2. Add 5% adjustment; verify invoice's original total is unchanged, new balance is reduced, request history displays actor/time/reason and supplementary statement can print.
3. Add a second adjustment to a single item, verify cumulative cap prevents discount greater than remaining amount.
4. Try blank reason / under 10 characters / amounts exceeding remaining total; all must fail. A Supervisor may view but cannot add adjustments (enforced by backend, not only UI).
5. On an already paid invoice, verify no automatic refund/payment status mutation occurs; show separate financial settlement warning.
6. Normal *pre-invoice* discounts and issued invoice original A4 print must still behave exactly as Phase 60.

## B. Product social sharing (B2C & B2B)
**Why a share endpoint?** The storefront runs as a client-rendered Figma Make SPA; many WhatsApp, Facebook, Telegram and X preview bots don't execute JavaScript. Client-side OG updates alone cannot guarantee a correct shared image for the original `/product/:slug` URL.

Implemented public, read-only Supabase Edge Function `product-share` with `verify_jwt=false` (necessary for unauthenticated social bots). This does **not** expose management details: it queries only **active, available and publicly visible** product names/descriptions and primary public image, for the chosen channel. Missing or hidden products return HTTP 404.

Example product **Pumpkin Donut** (slug `cm-050`):
`https://hqvxhhhwzhefydvwlpje.supabase.co/functions/v1/product-share?slug=cm-050&channel=B2C`

That URL returns server-rendered OG/Twitter title, description and the product's primary HTTPS image. A human visitor is redirected to the matching canonical storefront page `/product/cm-050` (or `/business/product/:slug` for B2B). The share button uses native share on supported phones or copies the share URL on desktop. The browser's dynamic SEO metadata is also enhanced.

**Important limitation:** If someone copies the original `https://chefmujahed.com/product/cm-050` from the address bar *instead of using the Share button/link*, the server-hosted Figma Make SPA can still show the generic fallback picture in a social scraper. To guarantee per-product images on the original custom-domain URLs, the hosting provider must expose server-level route rewriting/prerendering for each product URL; that is a separate hosting integration, not achievable with React head tags alone.

### Edge status & test
- Function deployed on linked Chef Mujahed Supabase project.
- GitHub Actions checks Deno syntax, product `cm-050` returns real OG image metadata and valid redirect, nonexistent product returns 404.
- Check actual Facebook Sharing Debugger and WhatsApp chat once the frontend is published. Social platforms cache previews and may need a debugger rescrape.
- Share pictures are the images already uploaded for each product, **not AI-generated substitutes**.

## Rollout
1. Phase 61 Supabase migration and Edge Function are already deployed on the linked environment; do not run them again.
2. Overlay Phase 61 `src/` files into the Figma Make app, publish the latest build.
3. Test both invoice adjustment paths with approved test orders and share a visible product from the new button.
4. Keep a database snapshot, inspect printed supporting adjustment documents, and do not represent an internal adjustment note as a tax-credit invoice until the accountant approves.
