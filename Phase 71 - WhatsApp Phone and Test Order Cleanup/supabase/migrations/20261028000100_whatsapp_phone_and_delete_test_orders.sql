-- Phase 71: live WhatsApp recipient overrides and protected permanent removal of test orders.
-- This migration is additive and does not delete any existing order.
BEGIN;

ALTER TABLE public.requests
  ADD COLUMN IF NOT EXISTS whatsapp_phone_override text;

CREATE TABLE IF NOT EXISTS public.dashboard_deleted_test_requests (
  request_id uuid PRIMARY KEY,
  reference text NOT NULL,
  old_status text NOT NULL,
  old_total_jod numeric(12,3) NOT NULL,
  deleted_by uuid NOT NULL,
  deleted_at timestamptz NOT NULL DEFAULT now(),
  reason text NOT NULL DEFAULT 'TEST_ORDER' CHECK (reason = 'TEST_ORDER')
);

ALTER TABLE public.dashboard_deleted_test_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.dashboard_deleted_test_requests FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.dashboard_deleted_test_requests TO service_role;

CREATE OR REPLACE FUNCTION public.dashboard_set_request_whatsapp_phone(
  p_request_id uuid,
  p_phone text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','auth'
AS $function$
DECLARE
  v_req public.requests%rowtype;
  v_phone text := NULLIF(btrim(coalesce(p_phone,'')), '');
  v_digits text;
BEGIN
  PERFORM public.dashboard_assert_role(ARRAY['SUPER_ADMIN','ADMIN']);
  SELECT * INTO v_req FROM public.requests WHERE id=p_request_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'request not found'; END IF;
  IF v_phone IS NOT NULL THEN
    v_digits := public.normalize_public_phone(v_phone);
    IF NOT (
       v_digits ~ '^07[789][0-9]{7}$'
       OR v_digits ~ '^7[789][0-9]{7}$'
       OR v_digits ~ '^9627[789][0-9]{7}$'
       OR v_digits ~ '^009627[789][0-9]{7}$'
       OR (left(v_phone,1)='+' AND v_digits ~ '^[1-9][0-9]{7,14}$')
       OR (v_digits ~ '^00[1-9][0-9]{7,14}$')
    ) THEN RAISE EXCEPTION 'invalid whatsapp phone number; use +country code'; END IF;
  END IF;
  UPDATE public.requests SET whatsapp_phone_override=v_phone, updated_at=now() WHERE id=p_request_id;
  INSERT INTO public.request_activity(request_id,action_type,description,actor_id,metadata)
  VALUES(p_request_id,'WHATSAPP_PHONE_CHANGED',
    CASE WHEN v_phone IS NULL
      THEN 'إعادة رقم واتساب الطلب إلى الرقم الحالي في ملف العميل'
      ELSE 'تحديث رقم واتساب لهذا الطلب' END,
    auth.uid(),jsonb_build_object('overrideEnabled',v_phone IS NOT NULL));
  RETURN public.dashboard_get_request(p_request_id);
END
$function$;

CREATE OR REPLACE FUNCTION public.dashboard_delete_test_request(
  p_request_id uuid,
  p_reference_confirmation text,
  p_reason text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','auth'
AS $function$
DECLARE
  v_req public.requests%rowtype;
BEGIN
  PERFORM public.dashboard_assert_role(ARRAY['SUPER_ADMIN']);
  IF p_reason IS DISTINCT FROM 'TEST_ORDER' THEN
    RAISE EXCEPTION 'only confirmed test orders can be deleted';
  END IF;
  SELECT * INTO v_req FROM public.requests WHERE id=p_request_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'request not found'; END IF;
  IF btrim(coalesce(p_reference_confirmation,'')) IS DISTINCT FROM v_req.reference THEN
    RAISE EXCEPTION 'order reference confirmation does not match';
  END IF;
  IF v_req.status NOT IN ('NEW','CONTACT_REQUIRED','AWAITING_CONFIRMATION','CANCELLED')
     OR v_req.payment_status IS DISTINCT FROM 'NOT_RECORDED'
     OR v_req.invoice_issued_at IS NOT NULL
     OR v_req.invoice_number IS NOT NULL
     OR EXISTS (SELECT 1 FROM public.invoice_discount_adjustments WHERE request_id=p_request_id)
  THEN
    RAISE EXCEPTION 'cannot delete an invoiced, paid or operational order; preserve its financial history';
  END IF;

  INSERT INTO public.dashboard_deleted_test_requests(
     request_id,reference,old_status,old_total_jod,deleted_by,reason
  ) VALUES (
     v_req.id,v_req.reference,v_req.status,
     coalesce(v_req.final_total_jod,v_req.estimated_subtotal,0),
     auth.uid(),'TEST_ORDER'
  );

  DELETE FROM public.requests WHERE id=p_request_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'request deletion failed'; END IF;
  RETURN jsonb_build_object('deleted',true,'id',p_request_id,'reference',v_req.reference);
END
$function$;

REVOKE ALL ON FUNCTION public.dashboard_set_request_whatsapp_phone(uuid,text) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.dashboard_delete_test_request(uuid,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.dashboard_set_request_whatsapp_phone(uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.dashboard_delete_test_request(uuid,text,text) TO authenticated;
COMMIT;
