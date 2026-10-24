-- Phase 67. Manager-created orders may include hidden, draft, or temporarily unavailable products.
-- This does not change public product availability, visibility, or inventory data.
-- Preserves SUPER_ADMIN / ADMIN checks and B2C/B2B channel matching.
-- Archived products stay excluded. Explicit units remain validated; unit-less single products use 'قطعة'.
CREATE OR REPLACE FUNCTION public.dashboard_create_manual_request(payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
 v_role text; v_type text:=coalesce(payload->>'customerType','B2B'); v_customer_id uuid:=nullif(payload->>'customerId','')::uuid; v_customer public.customers%rowtype; v_request_id uuid; v_reference text; v_item jsonb; v_product public.products%rowtype; v_unit public.product_units%rowtype; v_quantity integer; v_subtotal numeric(12,3):=0; v_source text:=coalesce(nullif(payload->>'source',''),'PHONE');
begin
 v_role:=public.dashboard_assert_role(array['SUPER_ADMIN','ADMIN']);
 if v_type not in ('B2B','B2C') then raise exception 'invalid customer type'; end if;
 if v_source not in ('WHATSAPP','INSTAGRAM','PHONE','WALK_IN','OTHER') then raise exception 'invalid source'; end if;
 if v_customer_id is null then raise exception 'customer is required'; end if;
 select * into v_customer from public.customers where id=v_customer_id and customer_type=v_type; if not found then raise exception 'valid customer is required'; end if;
 if jsonb_typeof(payload->'items')<>'array' or jsonb_array_length(payload->'items')=0 then raise exception 'at least one product is required'; end if;
 v_reference:=public.next_request_reference();
 insert into public.requests(reference,client_submission_id,customer_type,source,status,payment_status,customer_id,customer_name_snapshot,customer_phone_snapshot,customer_email_snapshot,company_name_snapshot,contact_name_snapshot,fulfillment_type,delivery_address,location_notes,preferred_date,preferred_time,general_notes,currency,estimated_subtotal)
 values(v_reference,gen_random_uuid(),v_type,v_source,'NEW','NOT_RECORDED',v_customer_id,coalesce(v_customer.name,v_customer.company_name),coalesce(v_customer.phone,''),v_customer.email,v_customer.company_name,v_customer.name,coalesce(nullif(payload->>'fulfillmentType',''),'COLLECTION'),nullif(trim(coalesce(payload->>'deliveryAddress','')),''),nullif(trim(coalesce(payload->>'locationNotes','')),''),nullif(payload->>'preferredDate','')::date,nullif(payload->>'preferredTime','')::time,nullif(trim(coalesce(payload->>'generalNotes','')),''),'JOD',0) returning id into v_request_id;
 for v_item in select value from jsonb_array_elements(payload->'items') loop
  v_quantity:=greatest(coalesce((v_item->>'quantity')::int,0),0); if v_quantity=0 then raise exception 'invalid item quantity'; end if;
  select * into v_product from public.products where id=(v_item->>'productId')::uuid and status<>'ARCHIVED' and (channel=v_type or channel='BOTH'); if not found then raise exception 'product is not permitted for this internal order'; end if;
  if nullif(v_item->>'unitId','') is not null then
    select * into v_unit from public.product_units where id=(v_item->>'unitId')::uuid and product_id=v_product.id and is_active=true and (channel=v_type or channel='BOTH');
    if not found then raise exception 'selected product unit is unavailable'; end if;
  else
    select * into v_unit from public.product_units where product_id=v_product.id and is_active=true and (channel=v_type or channel='BOTH') order by created_at limit 1;
    -- A simple/single product may have no unit. request_items.unit_id is nullable.
  end if;
  insert into public.request_items(request_id,product_id,product_name_snapshot,quantity,unit_id,unit_label_snapshot,observed_base_price_jod,customization,customization_label_snapshot,notes) values(v_request_id,v_product.id,v_product.name_ar,v_quantity,v_unit.id,coalesce(v_unit.label_ar,'قطعة'),v_product.base_price_jod,'{}','[]',null);
  v_subtotal:=v_subtotal+coalesce(v_product.base_price_jod,0)*v_quantity;
 end loop;
 update public.requests set estimated_subtotal=v_subtotal,updated_at=now() where id=v_request_id;
 insert into public.request_activity(request_id,action_type,description,actor_id,metadata) values(v_request_id,'MANUAL_REQUEST_CREATED','تم إنشاء طلب داخلي',auth.uid(),jsonb_build_object('role',v_role,'source',v_source));
 return public.dashboard_get_request(v_request_id);
end;$function$;

