-- Phase 59: base-priced B2C products work without explicit selling units.
-- Existing catalog records and issued invoices are not modified.
BEGIN;
CREATE OR REPLACE FUNCTION public.submit_b2c_request(payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_submission_id uuid; v_existing public.requests%rowtype; v_customer_id uuid; v_phone_norm text; v_name text; v_phone text; v_email text; v_fulfillment text; v_address text; v_location_notes text; v_preferred_date date; v_preferred_time time; v_general_notes text; v_request_id uuid; v_reference text; v_subtotal numeric(12,3):=0; v_item jsonb; v_product public.products%rowtype; v_unit public.product_units%rowtype; v_quantity integer; v_customization jsonb; v_customization_labels jsonb; v_notes text; v_unit_price numeric;
begin
  v_submission_id:=nullif(payload->>'clientSubmissionId','')::uuid; if v_submission_id is null then raise exception 'clientSubmissionId is required'; end if;
  select * into v_existing from public.requests where client_submission_id=v_submission_id limit 1;
  if found then return jsonb_build_object('id',v_existing.id,'reference',v_existing.reference,'duplicate',true,'estimatedSubtotal',v_existing.estimated_subtotal,'status',v_existing.status); end if;
  v_name:=trim(coalesce(payload#>>'{customer,name}','')); v_phone:=trim(coalesce(payload#>>'{customer,phone}','')); v_email:=nullif(trim(coalesce(payload#>>'{customer,email}','')),''); v_phone_norm:=public.normalize_public_phone(v_phone);
  if length(v_name)<2 then raise exception 'customer name is required'; end if; if v_phone_norm is null or length(v_phone_norm)<7 then raise exception 'valid customer phone is required'; end if;
  v_fulfillment:=payload#>>'{fulfillment,type}'; if v_fulfillment not in ('DELIVERY','COLLECTION') then raise exception 'invalid fulfillment type'; end if;
  v_address:=nullif(trim(coalesce(payload#>>'{fulfillment,address}','')),''); v_location_notes:=nullif(trim(coalesce(payload#>>'{fulfillment,locationNotes}','')),''); v_preferred_date:=nullif(payload#>>'{fulfillment,preferredDate}','')::date; v_preferred_time:=nullif(payload#>>'{fulfillment,preferredTime}','')::time; v_general_notes:=nullif(trim(coalesce(payload->>'generalNotes','')),'');
  if v_preferred_date is null then raise exception 'preferred date is required'; end if; if v_fulfillment='DELIVERY' and v_address is null then raise exception 'delivery address is required'; end if;
  if jsonb_typeof(payload->'items')<>'array' or jsonb_array_length(payload->'items')=0 then raise exception 'at least one request item is required'; end if;
  select id into v_customer_id from public.customers where customer_type='B2C' and normalized_phone=v_phone_norm limit 1;
  if v_customer_id is null then insert into public.customers(customer_type,name,phone,normalized_phone,email) values('B2C',v_name,v_phone,v_phone_norm,v_email) returning id into v_customer_id; end if;
  v_reference:=public.next_request_reference();
  insert into public.requests(reference,client_submission_id,customer_type,source,status,payment_status,customer_id,customer_name_snapshot,customer_phone_snapshot,customer_email_snapshot,fulfillment_type,delivery_address,location_notes,preferred_date,preferred_time,general_notes,currency,estimated_subtotal)
  values(v_reference,v_submission_id,'B2C','WEBSITE','NEW','NOT_RECORDED',v_customer_id,v_name,v_phone,v_email,v_fulfillment,case when v_fulfillment='DELIVERY' then v_address else null end,v_location_notes,v_preferred_date,v_preferred_time,v_general_notes,'JOD',0) returning id into v_request_id;
  for v_item in select value from jsonb_array_elements(payload->'items') loop
    v_quantity:=coalesce((v_item->>'quantity')::int,0); if v_quantity<=0 then raise exception 'invalid item quantity'; end if;
    select * into v_product from public.products where id=(v_item->>'productId')::uuid and status='ACTIVE' and public_visible=true and availability<>'UNAVAILABLE' and channel in ('B2C','BOTH') limit 1; if not found then raise exception 'product is unavailable'; end if;
    -- A B2C product with no configured units is a simple base-priced item.
    IF nullif(trim(coalesce(v_item->>'unitId','')),'') IS NULL THEN
      IF EXISTS (SELECT 1 FROM public.product_units u WHERE u.product_id=v_product.id AND u.is_active AND u.channel IN ('B2C','BOTH')) THEN RAISE EXCEPTION 'Choose an available product unit'; END IF;
      IF v_product.base_price_jod IS NULL OR v_product.base_price_jod<0 THEN RAISE EXCEPTION 'Product base price is required'; END IF;
      v_unit.id:=NULL;
      v_unit.label_ar:='قطعة';
      v_unit_price:=v_product.base_price_jod;
    ELSE
      SELECT * INTO v_unit FROM public.product_units WHERE id=nullif(v_item->>'unitId','')::uuid AND product_id=v_product.id AND is_active=true AND availability<>'UNAVAILABLE' AND channel IN ('B2C','BOTH') LIMIT 1;
      IF NOT FOUND THEN RAISE EXCEPTION 'invalid product unit'; END IF;
      v_unit_price:=coalesce(v_unit.price_jod,v_product.base_price_jod);
      IF v_unit_price IS NULL OR v_unit_price<0 THEN RAISE EXCEPTION 'product unit price is required'; END IF;
    END IF;
    v_customization:=coalesce(v_item->'customization','{}'::jsonb); v_customization_labels:=case when jsonb_typeof(v_item->'customizationLabels')='array' then v_item->'customizationLabels' else '[]'::jsonb end; v_notes:=nullif(trim(coalesce(v_item->>'notes','')),'');
    insert into public.request_items(request_id,product_id,product_name_snapshot,quantity,unit_id,unit_label_snapshot,observed_base_price_jod,customization,customization_label_snapshot,notes) values(v_request_id,v_product.id,v_product.name_ar,v_quantity,v_unit.id,v_unit.label_ar,v_unit_price,v_customization,v_customization_labels,v_notes);
    v_subtotal:=v_subtotal+v_unit_price*v_quantity;
  end loop;
  update public.requests set estimated_subtotal=v_subtotal where id=v_request_id;
  return jsonb_build_object('id',v_request_id,'reference',v_reference,'duplicate',false,'estimatedSubtotal',v_subtotal,'status','NEW');
exception when unique_violation then select * into v_existing from public.requests where client_submission_id=v_submission_id limit 1; if found then return jsonb_build_object('id',v_existing.id,'reference',v_existing.reference,'duplicate',true,'estimatedSubtotal',v_existing.estimated_subtotal,'status',v_existing.status); end if; raise;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.dashboard_bulk_manage_products(p_product_ids uuid[], p_action text, p_channel text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
DECLARE
  v_role text;
  v_action text := upper(trim(coalesce(p_action,'')));
  v_channel text := upper(trim(coalesce(p_channel,'')));
  v_ids uuid[];
  v_id uuid;
  v_product public.products%rowtype;
  v_result jsonb;
  v_results jsonb := '[]'::jsonb;
  v_changed int := 0;
  v_missing text := '';
  v_eligible boolean;
BEGIN
  -- Individual visibility toggles follow the existing operational editor permissions.
  IF v_action IN ('SHOW','HIDE') THEN
    v_role := public.dashboard_assert_role();
  ELSE
    v_role := public.dashboard_assert_role(ARRAY['SUPER_ADMIN','ADMIN']);
  END IF;

  IF v_action NOT IN ('SHOW','HIDE','CHANNEL','DELETE') THEN
    RAISE EXCEPTION 'Invalid product action';
  END IF;
  IF v_action='CHANNEL' AND v_channel NOT IN ('B2B','B2C') THEN
    RAISE EXCEPTION 'Choose B2B or B2C target channel';
  END IF;
  IF p_product_ids IS NULL OR cardinality(p_product_ids)=0 OR cardinality(p_product_ids)>50 THEN
    RAISE EXCEPTION 'Choose between 1 and 50 products';
  END IF;
  SELECT array_agg(id ORDER BY id) INTO v_ids
  FROM (SELECT DISTINCT unnest(p_product_ids) AS id) chosen;
  IF cardinality(v_ids)<>cardinality(p_product_ids) OR array_position(v_ids,NULL) IS NOT NULL THEN
    RAISE EXCEPTION 'Product selection contains a duplicate or invalid ID';
  END IF;
  -- Lock the entire selection in a fixed order to prevent partial or racing updates.
  PERFORM 1 FROM public.products WHERE id=ANY(v_ids) ORDER BY id FOR UPDATE;
  IF (SELECT count(*) FROM public.products WHERE id=ANY(v_ids))<>cardinality(v_ids) THEN
    RAISE EXCEPTION 'A selected product no longer exists. Refresh the list';
  END IF;

  -- Validate every selected item BEFORE changing any item.
  FOREACH v_id IN ARRAY v_ids LOOP
    SELECT * INTO v_product FROM public.products WHERE id=v_id;
    IF v_product.status='ARCHIVED' THEN
      RAISE EXCEPTION 'Archived products cannot be modified here: %',v_product.name_ar;
    END IF;
    IF v_action='SHOW' OR v_action='CHANNEL' THEN
      v_eligible := (
        (CASE WHEN v_action='CHANNEL' THEN v_channel ELSE v_product.channel END) IN ('B2C','BOTH')
        AND v_product.base_price_jod IS NOT NULL
        AND (
          NOT EXISTS (
            SELECT 1 FROM public.product_units u WHERE u.product_id=v_id
            AND u.is_active AND u.channel IN ('B2C','BOTH')
          ) OR EXISTS (
            SELECT 1 FROM public.product_units u WHERE u.product_id=v_id
            AND u.is_active AND u.availability<>'UNAVAILABLE'
            AND u.channel IN ('B2C','BOTH') AND coalesce(u.price_jod,v_product.base_price_jod) IS NOT NULL
          )
        )
      ) OR (
        (CASE WHEN v_action='CHANNEL' THEN v_channel ELSE v_product.channel END) IN ('B2B','BOTH')
        AND (
          coalesce(v_product.b2b_allow_custom_unit,false)
          OR EXISTS (
            SELECT 1 FROM public.product_units u
            WHERE u.product_id=v_id AND u.is_active AND u.availability<>'UNAVAILABLE'
              AND u.channel IN ('B2B','BOTH')
          )
        )
      );
      -- Only require readiness if it would be publicly visible after the action.
      IF (v_action='SHOW' OR (v_action='CHANNEL' AND v_product.public_visible)) AND NOT v_eligible THEN
        RAISE EXCEPTION 'Cannot publish %: configure an active selling unit for the target channel first',v_product.name_ar;
      END IF;
    END IF;
  END LOOP;

  FOREACH v_id IN ARRAY v_ids LOOP
    SELECT * INTO v_product FROM public.products WHERE id=v_id;
    IF v_action='SHOW' THEN
      UPDATE public.products SET status='ACTIVE',availability='AVAILABLE',public_visible=true,updated_at=now() WHERE id=v_id;
      v_result:=jsonb_build_object('id',v_id,'action','SHOW');
    ELSIF v_action='HIDE' THEN
      UPDATE public.products SET status='INACTIVE',availability='UNAVAILABLE',public_visible=false,updated_at=now() WHERE id=v_id;
      v_result:=jsonb_build_object('id',v_id,'action','HIDE');
    ELSIF v_action='CHANNEL' THEN
      UPDATE public.products SET channel=v_channel,updated_at=now() WHERE id=v_id;
      v_result:=jsonb_build_object('id',v_id,'action','CHANNEL','channel',v_channel);
    ELSE
      -- Reuse existing safe history-aware delete semantics: archive if ordered before,
      -- physically remove otherwise. A database error rolls back the entire batch.
      v_result := public.dashboard_delete_product(v_id);
    END IF;
    v_results := v_results || jsonb_build_array(v_result);
    v_changed := v_changed+1;
  END LOOP;

  RETURN jsonb_build_object('changed',v_changed,'action',v_action,'results',v_results,'role',v_role);
END;
$function$
;
CREATE OR REPLACE FUNCTION public.dashboard_update_payment(p_request_id uuid, p_status text, p_method text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
declare v_role text; v_request public.requests%rowtype; v_method text; v_should_approve boolean := false;
begin
  v_role := public.dashboard_assert_role();
  select * into v_request from public.requests where id=p_request_id for update;
  if not found then raise exception 'request not found'; end if;
  if p_status not in ('NOT_RECORDED','PENDING','PAID','CASH_ON_DELIVERY','MONTHLY_B2B_ACCOUNT') then raise exception 'invalid payment status'; end if;
  if p_status='PAID' then
    if p_method is null or p_method not in ('CASH','BANK_TRANSFER','CLIQ','MOBILE_WALLET') then raise exception 'payment method is required for paid orders'; end if;
    v_method := p_method; v_should_approve := true;
  elsif p_status='CASH_ON_DELIVERY' then
    if v_request.customer_type <> 'B2C' then raise exception 'Pay on collection is available for retail orders only'; end if;
    v_method := 'CASH'; v_should_approve := true;
  elsif p_status='MONTHLY_B2B_ACCOUNT' then
    if v_request.customer_type <> 'B2B' then raise exception 'monthly account is only available for B2B customers'; end if;
    v_method := 'B2B_MONTHLY_ACCOUNT'; v_should_approve := true;
  else
    v_method := null;
  end if;
  update public.requests set payment_status=p_status,payment_method=v_method,updated_at=now() where id=p_request_id;
  insert into public.request_activity(request_id,action_type,description,actor_id,metadata)
  values(p_request_id,'PAYMENT_UPDATED','تم تحديث حالة الدفع',auth.uid(),jsonb_build_object('status',p_status,'method',v_method,'role',v_role));
  if v_should_approve and v_request.status in ('NEW','CONTACT_REQUIRED','AWAITING_CONFIRMATION') then
    return public.dashboard_update_request_status(p_request_id,'APPROVED');
  end if;
  return public.dashboard_get_request(p_request_id);
end $function$
;
NOTIFY pgrst, 'reload schema';
COMMIT;
