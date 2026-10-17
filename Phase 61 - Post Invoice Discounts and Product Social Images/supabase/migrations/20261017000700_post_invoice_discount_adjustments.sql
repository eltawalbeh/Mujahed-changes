-- Phase 61: authorised, append-only post-invoice discount adjustments.
-- Issued invoice totals, lines and payment states NEVER change. A linked adjustment record
-- states the new amount due/refund to be settled separately, with a full audit trail.
BEGIN;

CREATE TABLE IF NOT EXISTS public.invoice_discount_adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.requests(id) ON DELETE RESTRICT,
  item_id uuid REFERENCES public.request_items(id) ON DELETE RESTRICT,
  revision integer NOT NULL,
  discount_type text NOT NULL CHECK (discount_type IN ('PERCENT','FIXED')),
  discount_value numeric(13,3) NOT NULL CHECK (discount_value > 0),
  amount_jod numeric(13,3) NOT NULL CHECK (amount_jod > 0),
  reason text NOT NULL CHECK (char_length(btrim(reason)) BETWEEN 10 AND 1000),
  invoice_number_snapshot text,
  invoice_total_snapshot_jod numeric(13,3) NOT NULL,
  balance_after_jod numeric(13,3) NOT NULL CHECK (balance_after_jod >= 0),
  actor_id uuid NOT NULL,
  actor_role text NOT NULL CHECK(actor_role IN ('ADMIN','SUPER_ADMIN')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(request_id,revision)
);
CREATE INDEX IF NOT EXISTS invoice_discount_adjustments_request_idx ON public.invoice_discount_adjustments(request_id,revision);
ALTER TABLE public.invoice_discount_adjustments ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.invoice_discount_adjustments FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.prevent_invoice_discount_adjustment_mutation()
RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
  RAISE EXCEPTION 'Issued invoice discount adjustments are append-only';
END;$$;
DROP TRIGGER IF EXISTS invoice_discount_adjustments_immutable ON public.invoice_discount_adjustments;
CREATE TRIGGER invoice_discount_adjustments_immutable
BEFORE UPDATE OR DELETE ON public.invoice_discount_adjustments
FOR EACH ROW EXECUTE FUNCTION public.prevent_invoice_discount_adjustment_mutation();

CREATE OR REPLACE FUNCTION public.dashboard_get_invoice_adjustments(p_request_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,auth AS $$
DECLARE v_role text; v_request public.requests%rowtype; v_total numeric(13,3); v_adjustments jsonb;
BEGIN
 v_role:=public.dashboard_assert_role();
 SELECT * INTO v_request FROM public.requests WHERE id=p_request_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'Request not found'; END IF;
 SELECT coalesce(sum(amount_jod),0) INTO v_total FROM public.invoice_discount_adjustments WHERE request_id=p_request_id;
 SELECT coalesce(jsonb_agg(
  jsonb_build_object('id',a.id,'request_id',a.request_id,'item_id',a.item_id,'revision',a.revision,
  'discount_type',a.discount_type,'discount_value',a.discount_value,'amount_jod',a.amount_jod,
  'reason',a.reason,'actor_id',a.actor_id,'actor_role',a.actor_role,'actor_name',coalesce(u.display_name,u.email,'—'),
  'created_at',a.created_at,'balance_after_jod',a.balance_after_jod,'invoice_number',a.invoice_number_snapshot)
  ORDER BY a.revision),'[]'::jsonb) INTO v_adjustments
 FROM public.invoice_discount_adjustments a
 LEFT JOIN public.dashboard_users u ON u.user_id=a.actor_id
 WHERE a.request_id=p_request_id;
 RETURN jsonb_build_object('original_total_jod',v_request.final_total_jod,
  'adjustments_total_jod',v_total,
  'adjusted_balance_jod',greatest(0,v_request.final_total_jod-v_total),
  'invoice_issued',v_request.invoice_issued_at IS NOT NULL,
  'payment_status',v_request.payment_status,
  'adjustments',v_adjustments);
END;$$;

CREATE OR REPLACE FUNCTION public.dashboard_add_invoice_discount_adjustment(
 p_request_id uuid, p_discount_type text, p_discount_value numeric, p_reason text, p_item_id uuid DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,auth AS $$
DECLARE
 v_role text; v_request public.requests%rowtype; v_kind text:=upper(btrim(coalesce(p_discount_type,'')));
 v_reason text:=btrim(coalesce(p_reason,'')); v_total numeric(13,3); v_remaining numeric(13,3);
 v_scope numeric(13,3); v_amount numeric(13,3); v_revision integer; v_item public.request_items%rowtype;
 v_prior_item numeric(13,3);
BEGIN
 v_role:=public.dashboard_assert_role(ARRAY['SUPER_ADMIN','ADMIN']);
 IF v_kind NOT IN ('PERCENT','FIXED') THEN RAISE EXCEPTION 'Choose percentage or fixed JOD discount'; END IF;
 IF length(v_reason)<10 OR length(v_reason)>1000 THEN RAISE EXCEPTION 'Discount explanation must contain 10 to 1000 characters'; END IF;
 IF p_discount_value IS NULL OR p_discount_value<=0 OR p_discount_value>1000000 OR
    (v_kind='PERCENT' AND p_discount_value>100) THEN
   RAISE EXCEPTION 'Invalid discount amount or percentage';
 END IF;
 IF p_discount_value<>round(p_discount_value,3) THEN RAISE EXCEPTION 'Use at most three decimal places'; END IF;
 SELECT * INTO v_request FROM public.requests WHERE id=p_request_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Request not found'; END IF;
 IF v_request.invoice_issued_at IS NULL THEN RAISE EXCEPTION 'Use normal pricing for an unissued invoice'; END IF;
 SELECT coalesce(sum(amount_jod),0),coalesce(max(revision),0)+1
 INTO v_total,v_revision
 FROM public.invoice_discount_adjustments WHERE request_id=p_request_id;
 v_remaining:=round(v_request.final_total_jod-v_total,3);
 IF v_remaining<=0 THEN RAISE EXCEPTION 'Invoice balance is already fully discounted'; END IF;
 v_scope:=v_remaining;
 IF p_item_id IS NOT NULL THEN
   SELECT * INTO v_item FROM public.request_items WHERE id=p_item_id AND request_id=p_request_id;
   IF NOT FOUND THEN RAISE EXCEPTION 'Selected item does not belong to this invoice'; END IF;
   SELECT coalesce(sum(amount_jod),0) INTO v_prior_item
   FROM public.invoice_discount_adjustments WHERE request_id=p_request_id AND item_id=p_item_id;
   v_scope:=least(v_remaining,greatest(0,round(v_item.observed_base_price_jod*v_item.quantity-coalesce(v_item.discount_amount_jod,0)-v_prior_item,3)));
   IF v_scope<=0 THEN RAISE EXCEPTION 'No remaining item value can be discounted'; END IF;
 END IF;
 IF v_kind='PERCENT' THEN v_amount:=round(v_scope*p_discount_value/100,3);
 ELSE v_amount:=round(p_discount_value,3); END IF;
 IF v_amount<=0 OR v_amount>v_scope OR v_amount>v_remaining THEN
   RAISE EXCEPTION 'Discount exceeds the remaining eligible balance';
 END IF;
 INSERT INTO public.invoice_discount_adjustments(
  request_id,item_id,revision,discount_type,discount_value,amount_jod,reason,
  invoice_number_snapshot,invoice_total_snapshot_jod,balance_after_jod,actor_id,actor_role)
 VALUES(p_request_id,p_item_id,v_revision,v_kind,p_discount_value,v_amount,v_reason,
  v_request.invoice_number,v_request.final_total_jod,round(v_remaining-v_amount,3),auth.uid(),v_role);
 INSERT INTO public.request_activity(request_id,action_type,description,actor_id,metadata)
 VALUES(p_request_id,'POST_INVOICE_DISCOUNT_ADDED','تم إضافة مذكرة خصم استثنائية بعد إصدار الفاتورة',
  auth.uid(),jsonb_build_object('revision',v_revision,'amount_jod',v_amount,'reason',v_reason,
  'item_id',p_item_id,'discount_type',v_kind,'discount_value',p_discount_value,'actor_role',v_role,
  'original_invoice_total_jod',v_request.final_total_jod,'balance_after_jod',round(v_remaining-v_amount,3)));
 RETURN public.dashboard_get_invoice_adjustments(p_request_id);
END;$$;

REVOKE ALL ON FUNCTION public.dashboard_get_invoice_adjustments(uuid) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.dashboard_add_invoice_discount_adjustment(uuid,text,numeric,text,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.dashboard_get_invoice_adjustments(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.dashboard_add_invoice_discount_adjustment(uuid,text,numeric,text,uuid) TO authenticated;
NOTIFY pgrst, 'reload schema';
COMMIT;
