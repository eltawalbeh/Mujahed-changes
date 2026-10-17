# Phase 63 - WhatsApp Phones and Order Progress

Source: ChefMujahed PR #13, merged.

## Deliverables
The source code in this bundle contains 13 frontend changes plus one SQL migration, QA script and rollout documentation.

### 1. Reliable WhatsApp phone numbers
- Jordanian numbers are handled as +9627XXXXXXXX, even when entered locally as 079XXXXXXX or 7XXXXXXXX.
- Phone fields for B2C and B2B show country dial-code selection and browser telephone autofill.
- Numbers with explicit international +country are allowed, including non-Jordanian customers.
- Every WhatsApp link generated through the shared builder uses digits-only wa.me/COUNTRYNUMBER. Invalid numbers cannot accidentally open an incorrect destination.
- Existing successful-order automatic WhatsApp handoff stays in place.

### 2. Dashboard status messages
- After payment approval: send the order approval confirmation via the prefilled WhatsApp link.
- Preparing: message that order prep started.
- Ready: distinct pickup versus delivery-ready message.
- Out for delivery: customer delivery update.
- Completed: pickup/delivery confirmation.
- Staff must click Send in WhatsApp: the UI does not silently send messages or claim they have been sent.

### 3. Manager can advance an order
On Order Details, ADMIN and SUPER_ADMIN can Start Preparing, mark Ready Now, mark Out for Delivery, or Complete handoff.
Transitions are validated in the backend and recorded in order activity. A directly-ready order records both prep and ready transitions atomically.
Kitchen screen actions remain available.

## Supabase
Migration supabase/migrations/20261017000800_manager_manual_order_progress.sql was applied successfully to the linked Chef Mujahed Supabase instance after rolled-back testing.
The manager RPC enforces ADMIN or SUPER_ADMIN on the server. No historical orders were modified.
Do not rerun this SQL merely to upload the Figma Make interface.

## Figma Make rollout
Overlay contents of the src folder from this Phase 63 bundle into the same original project paths, then publish the site.
Test a newly approved B2C order and a B2B order with explicit international phone number.
Confirm manager stage transitions and customer WhatsApp messages, including 079 local numbers.
Use only designated QA orders. No live customer messages have been sent by this QA.

## QA
Original source GitHub Actions passed production build and phone/WhatsApp message unit tests:
https://github.com/eltawalbeh/ChefMujahed/actions/runs/39043055918

More detail: docs/phase63-whatsapp-phone-order-progress.md
