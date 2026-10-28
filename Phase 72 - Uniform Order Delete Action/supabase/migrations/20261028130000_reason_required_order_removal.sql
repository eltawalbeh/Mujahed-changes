-- Phase 72: a consistent, reason-required removal action for all order statuses.
-- Retain paid/invoiced records for finance; exclude removed orders from operational reports.
BEGIN;
ALTER TABLE public.requests
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_by uuid,
  ADD COLUMN IF NOT EXISTS deleted_reason text;

DO $ensure$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='requests_phase72_reason_required') THEN
    ALTER TABLE public.requests ADD CONSTRAINT requests_phase72_reason_required CHECK (
      (deleted_at IS NULL AND deleted_by IS NULL AND deleted_reason IS NULL)
      OR (deleted_at IS NOT NULL AND deleted_by IS NOT NULL AND deleted_reason IS NOT NULL
          AND length(btrim(deleted_reason)) BETWEEN 5 AND 500)
    );
  END IF;
END $ensure$;

CREATE INDEX IF NOT EXISTS requests_phase72_active_idx ON public.requests(submitted_at DESC) WHERE deleted_at IS NULL;

CREATE OR REPLACE FUNCTION public.dashboard_remove_request(
  p_request_id uuid, p_reference_confirmation text, p_reason text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','auth'
AS $function$
DECLARE
  v_req public.requests%rowtype;
  v_reason text := btrim(coalesce(p_reason,''));
BEGIN
  PERFORM public.dashboard_assert_role(ARRAY['SUPER_ADMIN']);
  IF length(v_reason) NOT BETWEEN 5 AND 500 THEN
    RAISE EXCEPTION 'يجب كتابة سبب واضح للحذف (5 إلى 500 حرف)';
  END IF;
  SELECT * INTO v_req FROM public.requests WHERE id=p_request_id FOR UPDATE;
  IF NOT FOUND OR v_req.deleted_at IS NOT NULL THEN
    RAISE EXCEPTION 'الطلب غير موجود أو سبق استبعاده';
  END IF;
  IF btrim(coalesce(p_reference_confirmation,'')) IS DISTINCT FROM v_req.reference THEN
    RAISE EXCEPTION 'رقم تأكيد الطلب غير مطابق';
  END IF;
  UPDATE public.requests SET deleted_at=now(),deleted_by=auth.uid(),
    deleted_reason=v_reason,updated_at=now()
    WHERE id=p_request_id AND deleted_at IS NULL;
  INSERT INTO public.request_activity(request_id,action_type,description,actor_id,metadata)
  VALUES(p_request_id,'ORDER_EXCLUDED_FROM_OPERATIONS',
    'إزالة الطلب من التشغيل والتقارير: '||v_reason,auth.uid(),
    jsonb_build_object('reason',v_reason,'originalStatus',v_req.status,
       'paymentStatus',v_req.payment_status,'invoiceNumber',v_req.invoice_number,
       'preservedForFinancialAudit',true));
  RETURN jsonb_build_object('removed',true,'id',p_request_id,'reference',v_req.reference,
    'invoicePreserved',v_req.invoice_issued_at IS NOT NULL);
END;
$function$;
REVOKE ALL ON FUNCTION public.dashboard_remove_request(uuid,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.dashboard_remove_request(uuid,text,text) TO authenticated;
-- The previous Phase 71 hard-delete API must not bypass the new reason requirement.
REVOKE ALL ON FUNCTION public.dashboard_delete_test_request(uuid,text,text) FROM PUBLIC,anon,authenticated;

DO $rewrite$
DECLARE
  src text;
  needle text;
BEGIN
  src := pg_get_functiondef('public.dashboard_list_requests(jsonb)'::regprocedure);
  needle := '    where (v_status is null or r.status=v_status)';
  IF (length(src)-length(replace(src,needle,''))) <> 2*length(needle) THEN
    RAISE EXCEPTION 'dashboard_list_requests definition changed; migration safely aborted';
  END IF;
  EXECUTE replace(src,needle,'    where r.deleted_at is null AND (v_status is null or r.status=v_status)');

  src := pg_get_functiondef('public.dashboard_home()'::regprocedure);
  IF position(E'        from public.requests r\n        order by' in src)=0
    OR position(E'  from public.requests;\n' in src)=0 THEN
    RAISE EXCEPTION 'dashboard_home definition changed; migration safely aborted';
  END IF;
  src := replace(src,E'        from public.requests r\n        order by',
                 E'        from public.requests r\n        where r.deleted_at is null\n        order by');
  src := replace(src,E'  from public.requests;\n',E'  from public.requests\n  where deleted_at is null;\n');
  EXECUTE src;

  src := pg_get_functiondef('public.dashboard_get_customer(uuid)'::regprocedure);
  needle := 'from public.requests where customer_id=p_customer_id';
  IF (length(src)-length(replace(src,needle,''))) <> 5*length(needle) THEN
    RAISE EXCEPTION 'dashboard_get_customer definition changed; migration safely aborted';
  END IF;
  EXECUTE replace(src,needle,'from public.requests where customer_id=p_customer_id and deleted_at is null');

  src := pg_get_functiondef('public.dashboard_get_request(uuid)'::regprocedure);
  needle := 'from public.requests where id=p_request_id;';
  IF position(needle in src)=0 THEN
    RAISE EXCEPTION 'dashboard_get_request definition changed; migration safely aborted';
  END IF;
  EXECUTE replace(src,needle,'from public.requests where id=p_request_id and deleted_at is null;');

  src := pg_get_functiondef('public.dashboard_list_customers(jsonb)'::regprocedure);
  needle := 'left join public.requests r on r.customer_id=c.id';
  IF position(needle in src)=0 THEN
    RAISE EXCEPTION 'dashboard_list_customers definition changed; migration safely aborted';
  END IF;
  EXECUTE replace(src,needle,'left join public.requests r on r.customer_id=c.id and r.deleted_at is null');
END $rewrite$;
COMMIT;
