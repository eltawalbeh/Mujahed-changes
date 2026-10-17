# Phase 62 - Unified Invoice and Product Sharing

## A. Invoice patch
Replace the 4 frontend files in src/ with the files from this folder (preserve their relative paths):
- src/domain/invoice.ts
- src/domain/invoicePrint.ts
- src/components/dashboard/InvoicePanel.tsx
- src/pages/dashboard/RequestDetailsPage.tsx

A post-issue adjustment appears as a single discount row inside the original invoice and the same PDF export button. The adjustment card, separate print action and confidential reasons are removed from customer view. Audit is retained inside Order Details > History. No SQL/database migrations needed.

Example: JOD 3.000 original, JOD 1.000 discount, JOD 2.000 final.

QA: https://github.com/eltawalbeh/ChefMujahed/actions/runs/39041070675

## B. Original product URL social previews
The optional server-edge source is included at infra/og-product-routing/cloudflare-worker.mjs. It was tested with mock requests but has NOT been connected to chefmujahed.com.

The live domain is currently hosted via Figma Make and external nameservers. Original product URL previews need a host-level response, so the owner must first approve and configure an edge gateway. Do not modify nameservers or live routes before an approved staging test. A Figma Make upload alone does not activate this feature. Until then use Phase 61's share link.

For detailed deployment notes see docs/phase62-invoice-and-product-domain-og.md.
