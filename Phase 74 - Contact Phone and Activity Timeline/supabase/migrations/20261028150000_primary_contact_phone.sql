-- Chef Mujahed Phase 74: change primary contact phone safely without changing historic invoices/order snapshots.
-- When linked to a customer, update customers.phone and customers.normalized_phone.
-- When unlinked, store a live order-only contact override. WhatsApp alternate remains separate and optional.
BEGIN;
ALTER TABLE public.requests ADD COLUMN IF NOT EXISTS contact_phone_override text;

CREATE OR REPLACE FUNCTION public.dashboard_update_request_contact_phone(p_request_id uuid, p_phone text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','auth'
AS $fn$
DECLARE
  v_req public.requests%rowtype;
  v_phone text := btrim(coalesce(p_phone,''));
  v_digits text;
BEGIN
  PERFORM public.dashboard_assert_role(ARRAY['SUPER_ADMIN','ADMIN']);
  SELECT * INTO v_req FROM public.requests
  WHERE id=p_request_id AND deleted_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'request not found'; END IF;

  IF length(v_phone) NOT BETWEEN 7 AND 35
    OR v_phone !~ '^[+0-9() .-]+$'
  THEN RAISE EXCEPTION 'أدخل رقم هاتف صالحًا مع رمز الدولة (مثل +962).'; END IF;
  v_digits := public.normalize_public_phone(v_phone);
  IF v_digits IS NULL OR length(v_digits) NOT BETWEEN 7 AND 15 THEN
    RAISE EXCEPTION 'رقم الهاتف غير صالح.';
  END IF;
  IF left(v_phone,1)='+' AND (left(v_digits,1)='0' OR length(v_digits)<8) THEN
    RAISE EXCEPTION 'مفتاح الدولة غير صالح.';
  END IF;

  IF v_req.customer_id IS NOT NULL THEN
    UPDATE public.customers
    SET phone=v_phone, normalized_phone=v_digits, updated_at=now()
    WHERE id=v_req.customer_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'ملف العميل غير موجود.'; END IF;
    UPDATE public.requests
    SET contact_phone_override=NULL, whatsapp_phone_override=NULL, updated_at=now()
    WHERE id=p_request_id;
  ELSE
    UPDATE public.requests
    SET contact_phone_override=v_phone, whatsapp_phone_override=NULL, updated_at=now()
    WHERE id=p_request_id;
  END IF;

  INSERT INTO public.request_activity(request_id,action_type,description,actor_id,metadata)
  VALUES(p_request_id,'CONTACT_PHONE_UPDATED',
    CASE WHEN v_req.customer_id IS NULL THEN 'تم تحديث رقم التواصل الخاص بالطلب'
         ELSE 'تم تحديث رقم الهاتف في ملف العميل' END,
    auth.uid(),
    jsonb_build_object('scope',CASE WHEN v_req.customer_id IS NULL THEN 'REQUEST' ELSE 'CUSTOMER' END,
                       'previousWhatsappOverrideCleared',v_req.whatsapp_phone_override IS NOT NULL));
  RETURN public.dashboard_get_request(p_request_id);
END
$fn$;
REVOKE ALL ON FUNCTION public.dashboard_update_request_contact_phone(uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.dashboard_update_request_contact_phone(uuid,text) TO authenticated;
COMMIT;
