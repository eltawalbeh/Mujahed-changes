# Phase 66 — WhatsApp message templates inside CMS

## Goal
Operational editors can manage all 11 WhatsApp message drafts from **Dashboard → المحتوى → قوالب رسائل واتساب**, with a preview before saving. Sending remains manual in WhatsApp; this change does **not** introduce the paid WhatsApp Business API or automatic messaging.

## Templates
- Payment request (including CliQ instructions)
- Open customer chat
- Approved / preparing
- Ready for collection / ready for delivery
- Out for delivery
- Completed collection / completed delivery
- B2C and B2B new-request WhatsApp handoff headers

## Dynamic variables
- `{{customerName}}` from the saved order's customer snapshot
- `{{reference}}` from the saved order reference
- `{{totalJod}}` formatted to exactly three decimals, using English digits
- `{{paymentInstructions}}` from published CMS **Contact → Payment instructions**

Required placeholders are validated before the CMS can save. Invalid saved templates will be ignored by the runtime in favor of the known-good hardcoded default.

## CliQ instruction
The live `contact.paymentInstructions` field has been updated to:
```
كليك (بنك الاتحاد)
0798265415
```
The payment template uses `طريقة الدفع: {{paymentInstructions}}`, yielding the requested line `طريقة الدفع: كليك (بنك الاتحاد)` and the account number on the next line.

## Database
Migration `supabase/migrations/20261024121927_whatsapp_templates_cms.sql` was applied to Chef Mujahed Supabase. It creates one published CMS page keyed `whatsapp-templates` with 11 defaults, reusing existing administrator-only `dashboard_update_site_page_localized` authorization. It conditionally adjusts contact instructions, and deliberately does not touch orders, payment records, or products. Templates contain no customer data; personal values are injected only at handoff time.

## Implementation
- `src/lib/whatsappTemplates.ts`: defaults, labels, required variables, preview and safe runtime rendering
- `src/content/defaultSiteContent.ts`: page key and defaults
- `src/pages/dashboard/ContentManagementPage.tsx`: new CMS tab, editors, required-token validation and preview
- `src/lib/whatsapp.ts`: central runtime message rendering
- `src/pages/dashboard/RequestDetailsPage.tsx`: manager payment, customer chat and order status drafts
- `src/pages/b2c/SubmittedBoundaryPage.tsx` and `src/pages/b2b/B2BSuccessPage.tsx`: fetch current published templates before opening WhatsApp
- `scripts/qa-whatsapp-templates.cjs`: local static checks

## Deployment and QA
1. Sync these source files from `ChefMujahedNew` into the canonical **Figma Make** project and publish **through Figma Make only**. No Vercel deployment.
2. Run `node scripts/qa-whatsapp-templates.cjs`, and run the normal production build using the repository's package manager.
3. Verify an Admin or Super Admin can edit, preview and save template text. Confirm supervisor role cannot save changes.
4. Open an unpaid example order and verify the payment message, exact CliQ label/number and three-decimal JOD total.
5. Verify order status updates for delivery and collection and B2C/B2B submitted handoff; inspect messages in WhatsApp without sending test messages to real customers.
6. Change one safe phrase in CMS, save, open a **fresh session** and confirm the new phrase appears. Restore the approved phrase when finished.

**Note:** Database seed is live, but GitHub commits alone do not publish the updated dashboard to Figma Make. Deployment and end-to-end WhatsApp testing require Figma Make sync/publish.
