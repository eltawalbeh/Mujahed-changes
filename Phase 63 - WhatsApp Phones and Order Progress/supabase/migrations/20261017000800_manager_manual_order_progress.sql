-- Phase 63: manager-only order progression from dashboard, without touching the kitchen screen.
-- Uses the existing central status transition RPC to preserve all validations/audit.
BEGIN;
CREATE OR REPLACE FUNCTION public.dashboard_manager_advance_request(
 p_request_id uuid,
 p_status text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,auth AS $$
DECLARE
  v_current text;
  v_next text;
  v_fulfillment text;
BEGIN
  PERFORM public.dashboard_assert_role(ARRAY['SUPER_ADMIN','ADMIN']);
  SELECT status,fulfillment_type INTO v_current,v_fulfillment
  FROM public.requests WHERE id=p_request_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Request not found'; END IF;
  -- A manager may mark a physically completed order ready directly.
  -- Both ordinary status transitions are still recorded and validated atomically.
  IF v_current='APPROVED' AND p_status='READY' THEN
    PERFORM public.dashboard_update_request_status(p_request_id,'PREPARING');
    RETURN public.dashboard_update_request_status(p_request_id,'READY');
  END IF;
  IF v_current='APPROVED' THEN v_next:='PREPARING';
  ELSIF v_current='PREPARING' THEN v_next:='READY';
  ELSIF v_current='READY' AND v_fulfillment='DELIVERY' THEN v_next:='OUT_FOR_DELIVERY';
  ELSIF v_current='READY' AND v_fulfillment='COLLECTION' THEN v_next:='COMPLETED';
  ELSIF v_current='OUT_FOR_DELIVERY' THEN v_next:='COMPLETED';
  ELSE RAISE EXCEPTION 'No manager progress transition is allowed from %',v_current;
  END IF;
  IF p_status IS DISTINCT FROM v_next THEN
    RAISE EXCEPTION 'Invalid next status: expected %, requested %',v_next,p_status;
  END IF;
  RETURN public.dashboard_update_request_status(p_request_id,p_status);
END;$$;
REVOKE ALL ON FUNCTION public.dashboard_manager_advance_request(uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.dashboard_manager_advance_request(uuid,text) TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
