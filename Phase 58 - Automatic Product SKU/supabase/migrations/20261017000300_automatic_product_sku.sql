-- Phase 58 — Server-issued channel-specific SKUs (B2C/B2B)
-- Existing CM-### identifiers are never rewritten; no product rows are modified by installation.
-- Next value previews are advisory only; the final SKU is allocated atomically on insert.
BEGIN;
CREATE SEQUENCE IF NOT EXISTS public.cm_b2c_product_sku_seq INCREMENT BY 1 MINVALUE 1 START WITH 1 CACHE 1;
CREATE SEQUENCE IF NOT EXISTS public.cm_b2b_product_sku_seq INCREMENT BY 1 MINVALUE 1 START WITH 1 CACHE 1;
DO $$
DECLARE v_channel text; v_max bigint; v_last bigint; v_called boolean; v_seq text;
BEGIN
  FOREACH v_channel IN ARRAY ARRAY['B2C','B2B'] LOOP
    v_seq := CASE WHEN v_channel='B2C' THEN 'public.cm_b2c_product_sku_seq' ELSE 'public.cm_b2b_product_sku_seq' END;
    SELECT COALESCE(MAX((substring(sku from ('^CM-'||v_channel||'-([0-9]+)$')))::bigint),0)
      INTO v_max FROM public.products;
    IF v_channel='B2C' THEN SELECT last_value,is_called INTO v_last,v_called FROM public.cm_b2c_product_sku_seq;
    ELSE SELECT last_value,is_called INTO v_last,v_called FROM public.cm_b2b_product_sku_seq; END IF;
    IF v_max>v_last OR (v_max=v_last AND NOT v_called) THEN
      PERFORM setval(v_seq::regclass,v_max,true);
    END IF;
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.dashboard_allocate_product_sku(p_channel text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,auth AS $$
DECLARE v_number bigint; v_channel text:=upper(trim(coalesce(p_channel,'')));
BEGIN
  IF v_channel='B2C' THEN v_number:=nextval('public.cm_b2c_product_sku_seq');
  ELSIF v_channel='B2B' THEN v_number:=nextval('public.cm_b2b_product_sku_seq');
  ELSE RAISE EXCEPTION 'Choose B2C or B2B to assign a product SKU'; END IF;
  RETURN 'CM-'||v_channel||'-'||lpad(v_number::text,4,'0');
END; $$;
REVOKE ALL ON FUNCTION public.dashboard_allocate_product_sku(text) FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.dashboard_preview_next_product_sku(p_channel text)
RETURNS text LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,auth AS $$
DECLARE v_role text;v_channel text:=upper(trim(coalesce(p_channel,'')));v_last bigint;v_called boolean;v_number bigint;
BEGIN
  v_role:=public.dashboard_assert_role(ARRAY['SUPER_ADMIN','ADMIN']);
  IF v_channel='B2C' THEN SELECT last_value,is_called INTO v_last,v_called FROM public.cm_b2c_product_sku_seq;
  ELSIF v_channel='B2B' THEN SELECT last_value,is_called INTO v_last,v_called FROM public.cm_b2b_product_sku_seq;
  ELSE RAISE EXCEPTION 'Invalid product channel'; END IF;
  v_number:=CASE WHEN v_called THEN v_last+1 ELSE v_last END;
  RETURN 'CM-'||v_channel||'-'||lpad(v_number::text,4,'0');
END; $$;
REVOKE ALL ON FUNCTION public.dashboard_preview_next_product_sku(text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.dashboard_preview_next_product_sku(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.dashboard_create_product(payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
declare
  v_role text; v_id uuid:=gen_random_uuid();
  v_name text:=trim(coalesce(payload->>'nameAr',''));
  v_sku text;
  v_slug text:=lower(trim(coalesce(payload->>'slug','')));
  v_channel text:=upper(coalesce(nullif(payload->>'channel',''),'B2C'));
  v_availability text:=upper(coalesce(nullif(payload->>'availability',''),'AVAILABLE'));
  v_status text; v_category uuid:=nullif(payload->>'categoryId','')::uuid;
  v_price numeric:=nullif(payload->>'basePriceJod','')::numeric;
begin
  v_role:=public.dashboard_assert_role(array['SUPER_ADMIN','ADMIN']);
  if v_name='' then raise exception 'product name is required'; end if;
  v_sku:=public.dashboard_allocate_product_sku(v_channel);
  if v_channel not in ('B2C','B2B') then raise exception 'choose exactly one product channel: B2C or B2B'; end if;
  if v_availability not in ('AVAILABLE','UNAVAILABLE') then raise exception 'availability must be AVAILABLE or UNAVAILABLE'; end if;
  -- A per-channel sequence and the products_sku_key unique constraint prevent collisions.
  if v_slug='' then v_slug:=regexp_replace(lower(v_sku),'[^a-z0-9]+','-','g'); end if;
  v_slug:=trim(both '-' from v_slug);
  if v_slug='' then v_slug:='product-'||substr(replace(v_id::text,'-',''),1,10); end if;
  if exists(select 1 from public.products where slug=v_slug) then v_slug:=v_slug||'-'||substr(replace(v_id::text,'-',''),1,6); end if;
  v_status:=case when v_availability='AVAILABLE' then 'ACTIVE' else 'INACTIVE' end;
  insert into public.products(id,category_id,name_ar,slug,sku,short_description_ar,long_description_ar,status,availability,channel,base_price_jod,public_visible,b2b_allow_custom_unit,internal_notes,updated_at)
  values(v_id,v_category,v_name,v_slug,v_sku,nullif(trim(payload->>'shortDescriptionAr'),''),nullif(trim(payload->>'longDescriptionAr'),''),v_status,v_availability,v_channel,v_price,(v_availability='AVAILABLE'),coalesce((payload->>'b2bAllowCustomUnit')::boolean,false),nullif(trim(payload->>'internalNotes'),''),now());
  return public.dashboard_get_product(v_id);
end;
$function$
;

CREATE OR REPLACE FUNCTION public.dashboard_preview_product_import(payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
declare
  v_role text; v_rows jsonb:=coalesce(payload->'rows','[]'::jsonb); v_row jsonb;
  v_result jsonb:='[]'::jsonb; v_errors jsonb; v_sku text; v_name text; v_channel text;
  v_availability text; v_category_slug text; v_action text; v_existing uuid; v_count int:=0;
begin
  v_role:=public.dashboard_assert_role(array['SUPER_ADMIN','ADMIN']);
  if jsonb_typeof(v_rows)<>'array' then raise exception 'rows must be an array'; end if;
  if jsonb_array_length(v_rows)>1000 then raise exception 'maximum 1000 rows per import'; end if;
  for v_row in select value from jsonb_array_elements(v_rows) loop
    v_count:=v_count+1; v_errors:='[]'::jsonb;
    v_sku:=upper(trim(coalesce(v_row->>'sku','')));
    v_name:=trim(coalesce(v_row->>'nameAr',''));
    v_channel:=upper(coalesce(nullif(trim(v_row->>'channel'),''),'B2C'));
    v_availability:=upper(coalesce(nullif(trim(v_row->>'availability'),''),'AVAILABLE'));
    v_category_slug:=trim(coalesce(v_row->>'categorySlug',''));
    -- An empty SKU requests an automatically assigned new product SKU.
    if v_name='' then v_errors:=v_errors||jsonb_build_array('اسم المنتج مطلوب'); end if;
    if v_channel not in ('B2C','B2B') then v_errors:=v_errors||jsonb_build_array('كل صف يجب أن يختار قناة واحدة: B2C أو B2B'); end if;
    if v_availability not in ('AVAILABLE','UNAVAILABLE') then v_errors:=v_errors||jsonb_build_array('التوفر يجب أن يكون AVAILABLE أو UNAVAILABLE'); end if;
    if nullif(v_row->>'basePriceJod','') is not null then
      begin if (v_row->>'basePriceJod')::numeric<0 then v_errors:=v_errors||jsonb_build_array('السعر لا يمكن أن يكون سالباً'); end if;
      exception when others then v_errors:=v_errors||jsonb_build_array('السعر غير صالح'); end;
    end if;
    if v_category_slug<>'' and not exists(select 1 from public.categories c where c.slug=v_category_slug and c.is_active=true) then
      v_errors:=v_errors||jsonb_build_array('التصنيف غير موجود: '||v_category_slug);
    end if;
    select p.id into v_existing from public.products p where upper(coalesce(p.sku,''))=v_sku limit 1;
    if v_sku<>'' and v_existing is null then v_errors:=v_errors||jsonb_build_array('لا يمكن إدخال SKU جديد يدويًا. اترك خانة SKU فارغة للإنشاء التلقائي.'); end if;
    v_action:=case when v_existing is null then 'CREATE' else 'UPDATE' end;
    v_result:=v_result||jsonb_build_array(jsonb_build_object(
      'row',v_count,'sku',case when v_existing is null then 'تلقائي عند الاستيراد' else v_sku end,'nameAr',v_name,'channel',v_channel,'availability',v_availability,
      'action',v_action,'productId',v_existing,'valid',jsonb_array_length(v_errors)=0,'errors',v_errors
    ));
    v_existing:=null;
  end loop;
  return jsonb_build_object('role',v_role,'rows',v_result,'total',v_count,
    'valid',(select count(*) from jsonb_array_elements(v_result) x where (x->>'valid')::boolean),
    'invalid',(select count(*) from jsonb_array_elements(v_result) x where not (x->>'valid')::boolean),
    'creates',(select count(*) from jsonb_array_elements(v_result) x where x->>'action'='CREATE' and (x->>'valid')::boolean),
    'updates',(select count(*) from jsonb_array_elements(v_result) x where x->>'action'='UPDATE' and (x->>'valid')::boolean));
end;
$function$
;

CREATE OR REPLACE FUNCTION public.dashboard_import_products(payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
declare
  v_row jsonb; v_unit jsonb; v_product_id uuid; v_category_id uuid;
  v_sku text; v_channel text; v_unit_channel text; v_price numeric; v_availability text;
  v_status text; v_created int:=0; v_updated int:=0; v_duplicate_count int;
  v_created_rows jsonb:='[]'::jsonb;
begin
  perform public.dashboard_assert_role(array['SUPER_ADMIN','ADMIN']);
  if jsonb_typeof(payload->'rows')<>'array' then raise exception 'rows must be array'; end if;
  if jsonb_array_length(payload->'rows')>1000 then raise exception 'maximum 1000 rows per import'; end if;
  select count(*) into v_duplicate_count from (
    select upper(trim(coalesce(value->>'sku',''))) sku
    from jsonb_array_elements(payload->'rows') where nullif(trim(coalesce(value->>'sku','')),'') is not null group by 1 having count(*)>1
  ) duplicates;
  if v_duplicate_count>0 then raise exception 'duplicate SKU in import file'; end if;
  for v_row in select value from jsonb_array_elements(payload->'rows') loop
    v_sku:=upper(trim(coalesce(v_row->>'sku','')));
    v_channel:=upper(coalesce(nullif(trim(v_row->>'channel'),''),'B2C'));
    v_availability:=upper(coalesce(nullif(trim(v_row->>'availability'),''),'AVAILABLE'));
    if trim(coalesce(v_row->>'nameAr',''))='' then raise exception 'Product name is required'; end if;
    if v_channel not in ('B2C','B2B') then raise exception 'each imported product must belong to exactly one channel: B2C or B2B'; end if;
    if v_availability not in ('AVAILABLE','UNAVAILABLE') then raise exception 'availability must be AVAILABLE or UNAVAILABLE for %',v_sku; end if;
    select c.id into v_category_id from public.categories c where c.slug=nullif(v_row->>'categorySlug','') and c.is_active=true limit 1;
    select p.id,p.status into v_product_id,v_status from public.products p where upper(coalesce(p.sku,''))=v_sku limit 1 for update;
    if v_product_id is null then
      if v_sku<>'' then raise exception 'SKU is system generated for new products; clear SKU to create instead of inventing a code'; end if;
      v_sku:=public.dashboard_allocate_product_sku(v_channel);
      -- New products always start hidden, regardless of old XLSX template availability values.
      v_availability:='UNAVAILABLE';
      v_status:=case when v_availability='AVAILABLE' then 'ACTIVE' else 'INACTIVE' end;
      insert into public.products(category_id,name_ar,slug,sku,status,availability,channel,base_price_jod,public_visible,b2b_allow_custom_unit,short_description_ar,long_description_ar)
      values(v_category_id,trim(v_row->>'nameAr'),coalesce(nullif(v_row->>'slug',''),lower(regexp_replace(v_sku,'[^A-Z0-9]+','-','g'))),v_sku,v_status,v_availability,v_channel,nullif(v_row->>'basePriceJod','')::numeric,(v_availability='AVAILABLE'),coalesce((v_row->>'b2bAllowCustomUnit')::boolean,false),nullif(v_row->>'shortDescriptionAr',''),nullif(v_row->>'longDescriptionAr','')) returning id into v_product_id;
      v_created:=v_created+1;
      v_created_rows:=v_created_rows||jsonb_build_array(jsonb_build_object('nameAr',trim(v_row->>'nameAr'),'sku',v_sku,'channel',v_channel));
    else
      v_status:=case when v_status='ARCHIVED' then 'ARCHIVED' when v_availability='AVAILABLE' then 'ACTIVE' else 'INACTIVE' end;
      update public.products p set
        name_ar=trim(v_row->>'nameAr'),category_id=coalesce(v_category_id,p.category_id),channel=v_channel,
        status=v_status,availability=v_availability,
        base_price_jod=case when v_row?'basePriceJod' then nullif(v_row->>'basePriceJod','')::numeric else p.base_price_jod end,
        public_visible=(v_status<>'ARCHIVED' and v_availability='AVAILABLE'),
        b2b_allow_custom_unit=coalesce((v_row->>'b2bAllowCustomUnit')::boolean,p.b2b_allow_custom_unit),
        short_description_ar=case when v_row?'shortDescriptionAr' then nullif(v_row->>'shortDescriptionAr','') else p.short_description_ar end,
        long_description_ar=case when v_row?'longDescriptionAr' then nullif(v_row->>'longDescriptionAr','') else p.long_description_ar end,
        updated_at=now() where p.id=v_product_id;
      v_updated:=v_updated+1;
    end if;
    if jsonb_typeof(v_row->'units')='array' then
      update public.product_units pu set is_active=false where pu.product_id=v_product_id;
      for v_unit in select value from jsonb_array_elements(v_row->'units') loop
        v_unit_channel:=v_channel;
        v_availability:=upper(coalesce(nullif(trim(v_unit->>'availability'),''),'AVAILABLE'));
        v_price:=nullif(v_unit->>'priceJod','')::numeric;
        if trim(coalesce(v_unit->>'label',''))='' or v_availability not in ('AVAILABLE','LIMITED','UNAVAILABLE') then raise exception 'invalid unit row for %',v_sku; end if;
        if v_channel='B2C' and v_price is null then raise exception 'B2C unit price required for %',v_sku; end if;
        insert into public.product_units(product_id,label_ar,channel,sort_order,is_active,price_jod,availability)
        values(v_product_id,trim(v_unit->>'label'),v_channel,coalesce((v_unit->>'sortOrder')::int,1),true,v_price,v_availability);
      end loop;
    end if;
  end loop;
  return jsonb_build_object('created',v_created,'updated',v_updated,'total',v_created+v_updated,'createdProducts',v_created_rows);
end;
$function$
;

NOTIFY pgrst, 'reload schema';
COMMIT;
