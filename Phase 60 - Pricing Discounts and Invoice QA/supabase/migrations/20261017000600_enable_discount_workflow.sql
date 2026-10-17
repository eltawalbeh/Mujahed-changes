-- Phase 60: install the missing Phase 53 financial foundation WITHOUT creating phantom B2C units.
-- No historical issued invoices are recalculated; guard all financial mutations at invoice issuance.
BEGIN;
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS default_discount_type text NOT NULL DEFAULT 'NONE',
  ADD COLUMN IF NOT EXISTS default_discount_value numeric(12,3) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS business_name text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS billing_address text,
  ADD COLUMN IF NOT EXISTS tax_number text,
  ADD COLUMN IF NOT EXISTS payment_terms text,
  ADD COLUMN IF NOT EXISTS contact_notes text;

UPDATE public.customers
SET default_discount_type = 'PERCENT',
    default_discount_value = default_discount_percent
WHERE default_discount_percent > 0
  AND default_discount_type = 'NONE' AND default_discount_value = 0;

ALTER TABLE public.customers
  ADD CONSTRAINT phase53_customer_discount_rule CHECK (
    default_discount_type IN ('NONE','PERCENT','FIXED')
    AND default_discount_value >= 0
    AND (default_discount_type <> 'PERCENT' OR default_discount_value <= 100)
    AND (default_discount_type <> 'NONE' OR default_discount_value = 0)
  );

ALTER TABLE public.requests
  ADD COLUMN IF NOT EXISTS customer_discount_type text NOT NULL DEFAULT 'NONE',
  ADD COLUMN IF NOT EXISTS customer_discount_value numeric(12,3) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS customer_discount_jod numeric(12,3) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS order_discount_type text NOT NULL DEFAULT 'NONE',
  ADD COLUMN IF NOT EXISTS order_discount_value numeric(12,3) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS order_discount_jod numeric(12,3) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS order_discount_reason text,
  ADD COLUMN IF NOT EXISTS discount_total_jod numeric(12,3) NOT NULL DEFAULT 0;

ALTER TABLE public.requests
  ADD CONSTRAINT phase53_request_customer_discount_rule CHECK (
    customer_discount_type IN ('NONE','PERCENT','FIXED') AND customer_discount_value >= 0
    AND (customer_discount_type <> 'PERCENT' OR customer_discount_value <= 100)
  ),
  ADD CONSTRAINT phase53_request_order_discount_rule CHECK (
    order_discount_type IN ('NONE','PERCENT','FIXED') AND order_discount_value >= 0
    AND (order_discount_type <> 'PERCENT' OR order_discount_value <= 100)
  );

UPDATE public.requests SET discount_total_jod=discount_amount_jod WHERE invoice_issued_at IS NULL AND discount_total_jod=0 AND discount_amount_jod>0;


CREATE OR REPLACE FUNCTION public.phase53_recalculate_discounts(p_request_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, auth AS $$
DECLARE
  v_request public.requests%rowtype;
  v_customer public.customers%rowtype;
  v_subtotal numeric(12,3);
  v_line_discount numeric(12,3);
  v_after_lines numeric(12,3);
  v_customer_amount numeric(12,3) := 0;
  v_order_amount numeric(12,3) := 0;
  v_customer_type text := 'NONE';
  v_customer_value numeric(12,3) := 0;
BEGIN
  SELECT * INTO v_request FROM public.requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'request not found'; END IF;
  IF v_request.invoice_issued_at IS NOT NULL THEN RAISE EXCEPTION 'issued invoice is immutable'; END IF;
  SELECT COALESCE(SUM(COALESCE(i.observed_base_price_jod,p.base_price_jod,0)*i.quantity),0),
         COALESCE(SUM(i.discount_amount_jod),0)
    INTO v_subtotal,v_line_discount
  FROM public.request_items i
  LEFT JOIN public.products p ON p.id=i.product_id
  WHERE i.request_id=p_request_id;

  v_after_lines := GREATEST(ROUND(v_subtotal - v_line_discount,3),0);
  IF v_request.customer_id IS NOT NULL THEN
    SELECT * INTO v_customer FROM public.customers WHERE id=v_request.customer_id;
    IF FOUND AND v_customer.customer_type = v_request.customer_type THEN
      v_customer_type := v_customer.default_discount_type;
      v_customer_value := v_customer.default_discount_value;
    END IF;
  END IF;
  v_customer_amount := CASE v_customer_type
    WHEN 'PERCENT' THEN ROUND(v_after_lines*v_customer_value/100,3)
    WHEN 'FIXED' THEN LEAST(v_after_lines,v_customer_value)
    ELSE 0 END;
  v_customer_amount := LEAST(GREATEST(v_customer_amount,0),v_after_lines);
  v_order_amount := CASE v_request.order_discount_type
    WHEN 'PERCENT' THEN ROUND((v_after_lines-v_customer_amount)*v_request.order_discount_value/100,3)
    WHEN 'FIXED' THEN LEAST(v_after_lines-v_customer_amount,v_request.order_discount_value)
    ELSE 0 END;
  v_order_amount := LEAST(GREATEST(v_order_amount,0),GREATEST(v_after_lines-v_customer_amount,0));

  UPDATE public.requests
  SET estimated_subtotal=ROUND(v_subtotal,3),
      customer_discount_type=v_customer_type,
      customer_discount_value=v_customer_value,
      customer_discount_jod=v_customer_amount,
      order_discount_jod=v_order_amount,
      discount_total_jod=ROUND(v_line_discount+v_customer_amount+v_order_amount,3),
      discount_amount_jod=ROUND(v_line_discount+v_customer_amount+v_order_amount,3),
      final_total_jod=GREATEST(ROUND(v_after_lines-v_customer_amount-v_order_amount,3),0),
      updated_at=now()
  WHERE id=p_request_id;
END;
$$;
REVOKE ALL ON FUNCTION public.phase53_recalculate_discounts(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.dashboard_save_customer(payload jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
DECLARE
  v_role text;
  v_id uuid := NULLIF(payload->>'id','')::uuid;
  v_type text := COALESCE(NULLIF(payload->>'customerType',''),'B2B');
  v_name text := NULLIF(TRIM(COALESCE(payload->>'name','')),'');
  v_company text := NULLIF(TRIM(COALESCE(payload->>'companyName','')),'');
  v_phone text := NULLIF(TRIM(COALESCE(payload->>'phone','')),'');
  v_email text := NULLIF(TRIM(COALESCE(payload->>'email','')),'');
  v_existing public.customers%rowtype;
  v_dtype text;
  v_dvalue numeric(12,3);
BEGIN
  v_role := public.dashboard_assert_role(ARRAY['SUPER_ADMIN','ADMIN']);
  IF v_type NOT IN ('B2B','B2C') THEN RAISE EXCEPTION 'invalid customer type'; END IF;
  IF v_type='B2B' AND v_company IS NULL THEN RAISE EXCEPTION 'company name is required'; END IF;
  IF v_type='B2C' AND v_name IS NULL THEN RAISE EXCEPTION 'customer name is required'; END IF;
  IF v_id IS NOT NULL THEN SELECT * INTO v_existing FROM public.customers WHERE id=v_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'customer not found'; END IF;
  END IF;
  v_dtype := COALESCE(NULLIF(payload->>'defaultDiscountType',''),
    CASE WHEN payload ? 'defaultDiscountPercent' THEN 'PERCENT' ELSE v_existing.default_discount_type END,
    'NONE');
  v_dvalue := COALESCE(NULLIF(payload->>'defaultDiscountValue','')::numeric,
    NULLIF(payload->>'defaultDiscountPercent','')::numeric,
    CASE WHEN v_id IS NOT NULL THEN v_existing.default_discount_value ELSE 0 END,0);
  IF v_dtype NOT IN ('NONE','PERCENT','FIXED') OR v_dvalue < 0
      OR (v_dtype='PERCENT' AND v_dvalue>100) THEN RAISE EXCEPTION 'invalid customer discount'; END IF;
  IF v_dtype='NONE' THEN v_dvalue:=0; END IF;
  IF v_id IS NULL THEN
    INSERT INTO public.customers
      (customer_type,name,company_name,phone,normalized_phone,email,
       default_discount_type,default_discount_value,default_discount_percent,
       business_name,address,billing_address,tax_number,payment_terms,contact_notes)
    VALUES(v_type,v_name,v_company,v_phone,public.normalize_public_phone(v_phone),v_email,
       v_dtype,v_dvalue,CASE WHEN v_dtype='PERCENT' THEN v_dvalue ELSE 0 END,
       NULLIF(TRIM(payload->>'businessName'),''),
       NULLIF(TRIM(payload->>'address'),''),
       NULLIF(TRIM(payload->>'billingAddress'),''),
       NULLIF(TRIM(payload->>'taxNumber'),''),
       NULLIF(TRIM(payload->>'paymentTerms'),''),
       NULLIF(TRIM(payload->>'contactNotes'),''))
    RETURNING id INTO v_id;
  ELSE
    UPDATE public.customers SET
      customer_type=v_type,name=v_name,company_name=v_company,
      phone=v_phone,normalized_phone=public.normalize_public_phone(v_phone),
      email=v_email,default_discount_type=v_dtype,default_discount_value=v_dvalue,
      default_discount_percent=CASE WHEN v_dtype='PERCENT' THEN v_dvalue ELSE 0 END,
      business_name=CASE WHEN payload?'businessName' THEN NULLIF(TRIM(payload->>'businessName'),'') ELSE business_name END,
      address=CASE WHEN payload?'address' THEN NULLIF(TRIM(payload->>'address'),'') ELSE address END,
      billing_address=CASE WHEN payload?'billingAddress' THEN NULLIF(TRIM(payload->>'billingAddress'),'') ELSE billing_address END,
      tax_number=CASE WHEN payload?'taxNumber' THEN NULLIF(TRIM(payload->>'taxNumber'),'') ELSE tax_number END,
      payment_terms=CASE WHEN payload?'paymentTerms' THEN NULLIF(TRIM(payload->>'paymentTerms'),'') ELSE payment_terms END,
      contact_notes=CASE WHEN payload?'contactNotes' THEN NULLIF(TRIM(payload->>'contactNotes'),'') ELSE contact_notes END,
      updated_at=now()
    WHERE id=v_id;
  END IF;
  RETURN public.dashboard_get_customer(v_id);
END; $$;

CREATE OR REPLACE FUNCTION public.dashboard_set_order_discount(
  p_request_id uuid, p_discount_type text, p_discount_value numeric, p_reason text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
DECLARE
  v_role text; v_req public.requests%rowtype;
BEGIN
  v_role:=public.dashboard_assert_role(ARRAY['SUPER_ADMIN','ADMIN']);
  SELECT * INTO v_req FROM public.requests WHERE id=p_request_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'request not found'; END IF;
  IF v_req.invoice_issued_at IS NOT NULL OR v_req.status IN ('COMPLETED','CANCELLED','PREPARING','READY','OUT_FOR_DELIVERY')
     THEN RAISE EXCEPTION 'discount can only change before invoice approval'; END IF;
  IF p_discount_type NOT IN ('NONE','PERCENT','FIXED') OR p_discount_value IS NULL OR p_discount_value < 0
     OR (p_discount_type='PERCENT' AND p_discount_value>100)
     OR (p_discount_type='NONE' AND p_discount_value<>0) THEN RAISE EXCEPTION 'invalid discount'; END IF;
  UPDATE public.requests SET
    order_discount_type=p_discount_type,
    order_discount_value=ROUND(p_discount_value,3),
    order_discount_reason=NULLIF(TRIM(p_reason),''),
    updated_at=now()
  WHERE id=p_request_id;
  PERFORM public.phase53_recalculate_discounts(p_request_id);
  INSERT INTO public.request_activity(request_id,action_type,description,actor_id,metadata)
  VALUES(p_request_id,'ORDER_DISCOUNT_UPDATED','تم تحديث خصم الطلب قبل الاعتماد',auth.uid(),
    jsonb_build_object('type',p_discount_type,'value',p_discount_value,'reason',p_reason,'role',v_role));
  RETURN public.dashboard_get_request(p_request_id);
END; $$;
REVOKE ALL ON FUNCTION public.dashboard_set_order_discount(uuid,text,numeric,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.dashboard_set_order_discount(uuid,text,numeric,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.dashboard_update_item_discount(
  p_request_id uuid,p_item_id uuid,p_discount_amount numeric
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
DECLARE v_role text; v_req public.requests%rowtype; v_base numeric; v_qty int;
BEGIN
  v_role:=public.dashboard_assert_role(ARRAY['SUPER_ADMIN','ADMIN']);
  IF p_discount_amount IS NULL OR p_discount_amount<0 THEN RAISE EXCEPTION 'invalid discount'; END IF;
  SELECT * INTO v_req FROM public.requests WHERE id=p_request_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'request not found'; END IF;
  IF v_req.invoice_issued_at IS NOT NULL OR v_req.status IN ('COMPLETED','CANCELLED','PREPARING','READY','OUT_FOR_DELIVERY')
    THEN RAISE EXCEPTION 'issued invoice is immutable'; END IF;
  SELECT COALESCE(i.observed_base_price_jod,p.base_price_jod,0),i.quantity
    INTO v_base,v_qty FROM public.request_items i
    LEFT JOIN public.products p ON p.id=i.product_id
    WHERE i.id=p_item_id AND i.request_id=p_request_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'request item not found'; END IF;
  IF p_discount_amount>v_base*v_qty THEN RAISE EXCEPTION 'discount exceeds line total'; END IF;
  UPDATE public.request_items
    SET discount_amount_jod=ROUND(p_discount_amount,3),
        final_line_total_jod=GREATEST(ROUND(v_base*v_qty-p_discount_amount,3),0)
    WHERE id=p_item_id;
  PERFORM public.phase53_recalculate_discounts(p_request_id);
  INSERT INTO public.request_activity(request_id,action_type,description,actor_id,metadata)
  VALUES(p_request_id,'DISCOUNT_UPDATED','تم تحديث خصم عنصر في الطلب',auth.uid(),
    jsonb_build_object('itemId',p_item_id,'discount',p_discount_amount,'role',v_role));
  RETURN public.dashboard_get_request(p_request_id);
END; $$;

CREATE OR REPLACE FUNCTION public.dashboard_update_request_status(
  p_request_id uuid,p_status text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
DECLARE
  v_role text;v_req public.requests%rowtype;v_old text;v_allowed boolean:=false;
BEGIN
  v_role:=public.dashboard_assert_role();
  IF p_status NOT IN ('NEW','CONTACT_REQUIRED','AWAITING_CONFIRMATION','APPROVED','PREPARING','READY','OUT_FOR_DELIVERY','COMPLETED','CANCELLED')
    THEN RAISE EXCEPTION 'invalid request status'; END IF;
  SELECT * INTO v_req FROM public.requests WHERE id=p_request_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'request not found'; END IF;
  v_old:=v_req.status;
  v_allowed:=p_status=v_old
    OR (v_old IN ('NEW','CONTACT_REQUIRED') AND p_status='AWAITING_CONFIRMATION')
    OR (v_old IN ('NEW','CONTACT_REQUIRED','AWAITING_CONFIRMATION') AND p_status='APPROVED')
    OR (v_old='APPROVED' AND p_status='PREPARING')
    OR (v_old='PREPARING' AND p_status='READY')
    OR (v_old='READY' AND v_req.fulfillment_type='DELIVERY' AND p_status='OUT_FOR_DELIVERY')
    OR (v_old='READY' AND v_req.fulfillment_type='COLLECTION' AND p_status='COMPLETED')
    OR (v_old='OUT_FOR_DELIVERY' AND p_status='COMPLETED')
    OR (v_old<>'COMPLETED' AND p_status='CANCELLED');
  IF NOT v_allowed THEN RAISE EXCEPTION 'invalid status transition from % to %',v_old,p_status; END IF;
  IF p_status='APPROVED' AND v_req.payment_status NOT IN ('PAID','CASH_ON_DELIVERY','MONTHLY_B2B_ACCOUNT')
    THEN RAISE EXCEPTION 'payment must be recorded before approval'; END IF;
  IF p_status='APPROVED' AND v_old<>'APPROVED' THEN
    UPDATE public.request_items i SET
      observed_base_price_jod=COALESCE(i.observed_base_price_jod,p.base_price_jod),
      final_line_total_jod=GREATEST(COALESCE(i.observed_base_price_jod,p.base_price_jod,0)*i.quantity-COALESCE(i.discount_amount_jod,0),0)
      FROM public.products p WHERE i.request_id=p_request_id AND i.product_id=p.id;
    PERFORM public.phase53_recalculate_discounts(p_request_id);
    UPDATE public.requests SET status='APPROVED',requires_reapproval=false,
      invoice_number=COALESCE(invoice_number,public.next_invoice_number()),
      invoice_issued_at=COALESCE(invoice_issued_at,now()),updated_at=now()
      WHERE id=p_request_id;
  ELSE
    IF p_status='AWAITING_CONFIRMATION' AND v_old IN ('NEW','CONTACT_REQUIRED')
      AND v_req.invoice_issued_at IS NULL THEN
      PERFORM public.phase53_recalculate_discounts(p_request_id);
    END IF;
    UPDATE public.requests SET status=p_status,updated_at=now() WHERE id=p_request_id;
  END IF;
  INSERT INTO public.request_activity(request_id,action_type,description,actor_id,metadata)
    VALUES(p_request_id,'STATUS_CHANGED','تم تغيير حالة الطلب من '||v_old||' إلى '||p_status,auth.uid(),
      jsonb_build_object('from',v_old,'to',p_status,'role',v_role));
  RETURN public.dashboard_get_request(p_request_id);
END; $$;



-- Recalculate when a request is linked to a known customer, without repricing invoices.
CREATE OR REPLACE FUNCTION public.dashboard_link_request_customer(p_request_id uuid,p_customer_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,auth AS $$
DECLARE v_role text; v_req public.requests%rowtype; v_customer_type text;
BEGIN
  v_role:=public.dashboard_assert_role(ARRAY['SUPER_ADMIN','ADMIN']);
  SELECT * INTO v_req FROM public.requests WHERE id=p_request_id FOR UPDATE;
  SELECT customer_type INTO v_customer_type FROM public.customers WHERE id=p_customer_id;
  IF v_req.id IS NULL OR v_customer_type IS NULL THEN RAISE EXCEPTION 'request or customer not found'; END IF;
  IF v_req.customer_type<>v_customer_type THEN RAISE EXCEPTION 'customer type mismatch'; END IF;
  UPDATE public.requests SET customer_id=p_customer_id,updated_at=now() WHERE id=p_request_id;
  IF v_req.invoice_issued_at IS NULL THEN PERFORM public.phase53_recalculate_discounts(p_request_id); END IF;
  INSERT INTO public.request_activity(request_id,action_type,description,actor_id,metadata)
  VALUES(p_request_id,'CUSTOMER_LINKED','تم ربط الطلب بعميل موجود يدوياً',auth.uid(),
    jsonb_build_object('customerId',p_customer_id,'role',v_role));
  RETURN public.dashboard_get_request(p_request_id);
END; $$;



REVOKE ALL ON FUNCTION public.phase53_recalculate_discounts(uuid) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.dashboard_save_customer(jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.dashboard_save_customer(jsonb) TO authenticated;
REVOKE ALL ON FUNCTION public.dashboard_update_item_discount(uuid,uuid,numeric) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.dashboard_update_item_discount(uuid,uuid,numeric) TO authenticated;
REVOKE ALL ON FUNCTION public.dashboard_link_request_customer(uuid,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.dashboard_link_request_customer(uuid,uuid) TO authenticated;
NOTIFY pgrst, 'reload schema';
COMMIT;

