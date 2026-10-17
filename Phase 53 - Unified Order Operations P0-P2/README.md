# Phase 53 — Unified Order Operations (P0–P2)

**Target:** Chef Mujahed B2C/B2B dashboard and catalog.  
**Source baseline:** `eltawalbeh/ChefMujahed` (`main` as of 2026-10-17).  
**Format:** one release bundle of path-for-path replacement files under `src/`, plus a separate, unapplied Supabase migration.

## Deliverables

### P0 — financial and order operations
- Customer default discount **NONE / percentage / fixed JOD** supported for B2C and B2B, including edit forms.
- Server-side order-level discount **NONE / percentage / fixed JOD** before invoice issuance.
- Discount order: **line-item discounts → customer entitlement → per-order adjustment**. Percentage order discounts apply to the *remaining* amount.
- Total discounts and final JOD amounts rounded to **three decimal places** by Postgres.
- Customer policy captured into each request on approval, so old invoices are not repriced when policy changes.
- Existing item-level discounts preserved and independently editable until invoice issuance.
- Backend prevents changes after issuance; only ADMIN/SUPER_ADMIN may change pricing.
- New Order Details UI separates primary work, pricing/invoice, and activity.
- WhatsApp handoff after website order submission is **not modified**.

### P1 — profiles, product editor, CMS
- Customer/company contact records with address, billing address, company tax ID, B2C business name, payment terms, notes, and discounts.
- Product edit panel uses full content width; removed redundant sidebar summary and relocated internal notes.
- Bottom-fixed CMS save controls with unsaved/saving/saved/failure feedback, safe reset, and protection from losing local drafts on save failure.
- Product admin validates B2C base prices; a database trigger supplies a default orderable B2C unit if none exists, and the customer UI hides the unit selector when only one choice exists.
- B2B unit selector does not display price. **This is UI masking, not a guarantee of column-level API secrecy.** Separate public pricing access will require an API/RLS redesign.

### P2 — order inbox
- Task-oriented inbox with status tabs, compact cards, customer-type and source filters, search, pagination and periodic refresh.
- Accurate status wording for **collection** versus **delivery**.
- Kitchen can advance production to READY; administration handles customer collection or dispatch. The kitchen production RPC intentionally does not perform delivery completion.

## Installation

1. Back up the Supabase project and current application files, and use a **staging** environment.
2. Apply `supabase/migrations/20261017000100_unified_order_discounts.sql` to staging. Verify permissions, function signatures, totals, and invoice immutability.
3. Copy the **contents of** `src/` into the corresponding `src/` paths of ChefMujahed, preserving all other app files.
4. Build the app and run the QA scenarios below with two role-appropriate test users and sample B2C/B2B requests.
5. Promote migration and frontend together after acceptance. Do **not** deploy the frontend before the migration: it calls `dashboard_set_order_discount` and uses new customer/profile fields.

## QA / acceptance cases

- B2C returning customer, 20 JOD order, 5 JOD permanent discount, then 10% extra order discount → **13.500 JOD before tax**.
- B2B permanent 10% + extra 2 JOD fixed; verify the two discounts have separate invoice lines.
- No customer entitlement: no automatic discount; creating or editing a policy applies to **future unissued orders**.
- Changing customer discount does not mutate a previously issued invoice, its original total, or its discount snapshot.
- Non-admin pricing mutation is rejected server-side.
- Invalid discount (negative, percentage over 100), fixed discount above remaining amount, and edits on issued invoices are rejected.
- Linking a customer from the request displays the correct entitlement before invoice issuance; phone match must be reviewed if ambiguous.
- B2B product unit options show **no price** in the UI.
- B2C product with base price but without manually configured units receives a default B2C unit and can be added to cart. Products with multiple units still show a selector.
- READY + COLLECTION → COMPLETED via dashboard; READY + DELIVERY → OUT_FOR_DELIVERY → COMPLETED. Kitchen stops at READY.
- CMS edits: scroll to the end, save from bottom bar, confirm visible feedback; simulate save error and verify edits are retained; test mobile and English layout.
- Product editor uses one main column with product metadata in header, not a duplicate sidebar.
- Inbox: new orders, all statuses, pagination, mobile view, source filter, customer type, auto refresh.

## Non-goals / release cautions
- No changes to mandatory WhatsApp automatic redirect or actual message sending.
- No production database migration or live customer record changes from this GitHub release.
- Tax compliance/invoicing treatment must be confirmed with the business accountant before live financial release.
- Product prices in the B2B public API have not yet been isolated at the database privilege level.
- No automatic confirmation of WhatsApp transmission; redirect alone cannot verify that a message was sent.
- This repository contains **replacement patches**, not a separately runnable application. The accompanying GitHub Actions workflow overlays them on the current source app to run a compatibility build.
