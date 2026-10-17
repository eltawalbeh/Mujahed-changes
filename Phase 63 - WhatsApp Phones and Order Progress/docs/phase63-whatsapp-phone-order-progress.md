# Phase 63 — WhatsApp phone UX + staff status messages + manager order progress

## Business requirements
- Consistent WhatsApp URL format anywhere in app: https://wa.me/INTERNATIONAL_DIGITS?text=URL_ENCODED_TEXT
- Jordan default for local numbers; allow explicit international numbers and other country codes.
- Approved order -> button to review/send confirmation on WhatsApp. Ready, preparing, out for delivery, completed -> contextual WhatsApp message.
- Admin and Super Admin may update physical order stage on the main dashboard even without the kitchen display.

## Phone implementation
- src/lib/phone.ts handles Jordan 077/078/079 prefixes, 7XXXXXXXX, +9627XXXXXXXX and 009627XXXXXXXX; converts Arabic numeral digits to Latin.
- Explicit + or 00 international prefixes supported. Alternative selected country dial codes include Saudi Arabia, UAE, Palestine, Iraq, Egypt, Gulf states, Lebanon, Syria, USA/Canada, UK and Turkey. Enforce E.164-length and mobile prefix restrictions for Jordan; reject ambiguous unlabelled unknown numbers rather than assume they belong to Jordan.
- B2C and B2B order forms now have a country chooser, HTML type=tel, autocomplete=tel, and field validation. On leaving input, valid numbers normalize to +COUNTRYNUMBER. Canonical submissions also normalize on backend payload creation.
- src/lib/whatsapp.ts is the single URL builder; old number sanitizer removed. It returns empty string when the number is invalid, preventing wrong WhatsApp targets. Site contact links use the same formatter. Success pages guard invalid store WhatsApp numbers, preserving existing automatic order handoff otherwise.
- Native browser autofill may help with the phone field, but browsers **cannot** request SIM/phone number directly without user action/permissions. No automatic phone read promised.
- Dashboard users editing legacy customer numbers should enter an explicit +country prefix for non-Jordanian numbers.

## Status messages and operations
- In Request Details, the current status from APPROVED through COMPLETED presents a prominent **WhatsApp message button**. It opens a pre-filled message for the customer to review and send; the system does not send messages automatically or falsely log them as sent.
- **APPROVED:** approval confirmation (both B2B and B2C).
- **PREPARING:** in preparation.
- **READY:** pickup ready, or delivery arrangements in progress.
- **OUT_FOR_DELIVERY:** order is en route.
- **COMPLETED:** pickup or delivery completed.
- Existing payment instructions remain an independent WhatsApp action before approval.
- Manager/Super Admin may click Start Preparing, Ready Now, Out for Delivery, Pickup Complete or Delivered from order details, with confirmation dialogs. Direct Ready Now when status APPROVED triggers the two permitted transitions APPROVED -> PREPARING -> READY atomically, with proper history. Status workflow remains server-authoritative.

## Backend status
Migration: supabase/migrations/20261017000800_manager_manual_order_progress.sql.
**Already applied** successfully on linked Chef Mujahed Supabase after a rollback-only syntax/test transaction.
RPC: dashboard_manager_advance_request(uuid,text).
- Calls dashboard_assert_role(ADMIN/SUPER_ADMIN) inside a SECURITY DEFINER function.
- Enforces one next status, or direct-ready from APPROVED with two official transitions. Original dashboard_update_request_status still validates payments and state and records activity.
- No kitchen API changes, no live request statuses mutated during deployment.
- Anon execution revoked; authenticated users may call RPC but only managers get past server-side role check.
**Do not run the SQL again in the linked Supabase when uploading the Figma Make files.**

## QA acceptance
1. B2C 0791234567, 791234567, +962791234567 and 00962791234567 all produce wa.me/962791234567.
2. Foreign +966501234567 or selected Saudi code + local 0501234567 produce wa.me/966501234567.
3. Invalid numbers must NOT open a WhatsApp link or fall back to the shop's number.
4. B2C/B2B forms accept valid mobile and require correction of malformed phone. Browser autofill available.
5. Create a designated test request, approve payment, confirm customer WhatsApp button appears, and manually send the text in WhatsApp.
6. As ADMIN/SUPER_ADMIN change APPROVED -> PREPARING -> READY, or READY directly, then Delivery -> OUT_FOR_DELIVERY -> COMPLETED, or Collection -> COMPLETED. Ensure history/status show changes. Supervisor cannot call manager RPC.
7. On mobile/tablet check button visibility and confirm steps never auto-send messages.
8. Existing B2C/B2B successful request handoff to shop WhatsApp should still work.

## Build
GitHub Actions built Vite and compiled phone/WhatsApp helpers, ran unit tests for valid/invalid numbers and status messages. Strict TypeScript audit still has unrelated earlier app errors (nonblocking), so browser acceptance on published Figma Make is necessary.
