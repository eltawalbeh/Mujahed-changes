# Phase 66 — WhatsApp Message Templates CMS

**FIX BUNDLE ONLY** — for Figma Make. Do not edit or deploy by pushing into `ChefMujahedNew` directly.

## Requested change
Payment request message now shows:

```
طريقة الدفع: كليك (بنك الاتحاد)
0798265415
```

## New CMS tab
Dashboard → المحتوى → **قوالب رسائل واتساب**. Contains **11 editable messages**: payment request, direct customer chat, five order-state types (with collection/delivery variants), and B2C/B2B handoff. Admin and Super Admin only can edit; dynamic placeholders `{{customerName}}`, `{{reference}}`, `{{totalJod}}`, `{{paymentInstructions}}` are validated. Live preview displays edits. Message delivery remains manual via WhatsApp links; no paid API needed.

## Files for Figma Make (merge by matching relative paths)
- `src/lib/whatsappTemplates.ts`
- `src/lib/whatsapp.ts`
- `src/content/defaultSiteContent.ts`
- `src/pages/dashboard/ContentManagementPage.tsx`
- `src/pages/dashboard/RequestDetailsPage.tsx`
- `src/pages/b2b/B2BSuccessPage.tsx`
- `src/pages/b2c/SubmittedBoundaryPage.tsx`

Copy the files into the Figma Make codebase following their matching relative paths. **If the new Figma Make push contains later changes to the same files, merge selectively rather than overwriting newer work.**

## Supabase
The existing live Chef Mujahed Supabase project already has migration `20261024121927_whatsapp_templates_cms` applied. **Do not reapply it blindly** to the same project. On a new environment, apply `supabase/migrations/20261024121927_whatsapp_templates_cms.sql` once. It seeds templates without overwriting existing edits and only adjusts the CliQ label when the previous value exactly matches `0798265415`.

## Tests
Run `node scripts/qa-whatsapp-templates.cjs` on the merged project. Test payment template with JOD 3 decimal places, a simulated order, content permissions, WhatsApp status drafts, and fresh B2C/B2B handoffs. Confirm messages manually without sending to a real customer.

## Notes
- This bundle corrects the escaped-brace regex defect in the candidate template renderer before delivery.
- Backend changes are **already live in Supabase**; resetting `ChefMujahedNew` Git branch does not roll back Supabase.
- Keep Figma Make + Supabase + GoDaddy. No Vercel.
