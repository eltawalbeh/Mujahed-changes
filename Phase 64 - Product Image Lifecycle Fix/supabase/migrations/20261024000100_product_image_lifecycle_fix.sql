-- PHASE64: applying this migration alone does not delete existing product images.
-- DELETE only runs on a future authorized save with explicit primaryImageUrl change.
CREATE OR REPLACE FUNCTION public.dashboard_update_product_basic(p_product_id uuid, payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
declare
  v_role text; v_old_price numeric(12,3); v_new_price numeric(12,3);
  v_image_url text; v_existing_primary_image text; v_channel text; v_availability text; v_status text;
begin
  v_role:=public.dashboard_assert_role();
  select base_price_jod,channel,availability,status into v_old_price,v_channel,v_availability,v_status
  from public.products where id=p_product_id for update;
  if not found then raise exception 'product not found'; end if;
  v_new_price:=case when payload?'basePriceJod' then nullif(payload->>'basePriceJod','')::numeric else v_old_price end;
  if v_role='SUPERVISOR' and v_new_price is distinct from v_old_price then raise exception 'supervisor cannot overwrite base price'; end if;
  if payload?'channel' then
    v_channel:=upper(trim(payload->>'channel'));
    if v_channel not in ('B2C','B2B') and not (v_channel='BOTH' and (select channel='BOTH' from public.products where id=p_product_id)) then
      raise exception 'choose exactly one product channel: B2C or B2B';
    end if;
  end if;
  if payload?'availability' then v_availability:=upper(trim(payload->>'availability')); end if;
  if v_availability not in ('AVAILABLE','UNAVAILABLE') then raise exception 'availability must be AVAILABLE or UNAVAILABLE'; end if;
  v_status:=case when v_status='ARCHIVED' then 'ARCHIVED' when v_availability='AVAILABLE' then 'ACTIVE' else 'INACTIVE' end;
  update public.products set
    name_ar=coalesce(nullif(trim(payload->>'nameAr'),''),name_ar),
    short_description_ar=case when payload?'shortDescriptionAr' then nullif(trim(payload->>'shortDescriptionAr'),'') else short_description_ar end,
    long_description_ar=case when payload?'longDescriptionAr' then nullif(trim(payload->>'longDescriptionAr'),'') else long_description_ar end,
    category_id=case when payload?'categoryId' then nullif(payload->>'categoryId','')::uuid else category_id end,
    base_price_jod=v_new_price,availability=v_availability,status=v_status,channel=v_channel,
    public_visible=(v_status<>'ARCHIVED' and v_availability='AVAILABLE'),
    b2b_allow_custom_unit=case when payload?'b2bAllowCustomUnit' then (payload->>'b2bAllowCustomUnit')::boolean else b2b_allow_custom_unit end,
    internal_notes=case when payload?'internalNotes' then nullif(trim(payload->>'internalNotes'),'') else internal_notes end,
    updated_at=now()
  where id=p_product_id;
  if payload?'primaryImageUrl' then
    v_image_url:=nullif(trim(payload->>'primaryImageUrl'),'');
    select image_url into v_existing_primary_image from public.product_images
      where product_id=p_product_id and is_primary=true and is_active=true
      order by created_at desc,id desc limit 1;
    if v_image_url is null then
      -- User requested permanent removal of every image for this product.
      delete from public.product_images where product_id=p_product_id;
    elsif v_image_url is distinct from v_existing_primary_image then
      -- Do not append old gallery media when the single main image changes.
      delete from public.product_images where product_id=p_product_id;
      insert into public.product_images(product_id,image_url,alt_ar,sort_order,is_primary,is_active)
      values(p_product_id,v_image_url,(select name_ar from public.products where id=p_product_id),0,true,true);
    else
      -- Re-saving the same image must be idempotent; clean identical repeats.
      delete from public.product_images p using (
        select id,row_number() over(partition by image_url order by is_primary desc,created_at desc,id desc) rn
        from public.product_images where product_id=p_product_id
      ) repeated where p.id=repeated.id and repeated.rn>1;
    end if;
  end if;
  return public.dashboard_get_product(p_product_id);
end;
$function$

