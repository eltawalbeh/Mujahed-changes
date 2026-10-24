-- Chef Mujahed / Phase 64 / 2026-10-24
-- Fix: replacing/removing a product's primary image must retire the previous
-- active rows; identical URL saves must not create duplicates.
-- Non-destructive: storage objects and historical DB image rows are retained.
-- The editor exposes a single product image; gallery expansion is out of scope.
begin;

CREATE OR REPLACE FUNCTION public.dashboard_update_product_basic(p_product_id uuid, payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
declare
  v_role text; v_old_price numeric(12,3); v_new_price numeric(12,3);
  v_image_url text; v_channel text; v_availability text; v_status text;
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
    -- The editor controls one image. Retire all old active rows, not only is_primary.
    -- The product row is locked FOR UPDATE, serializing concurrent editor saves.
    update public.product_images
       set is_active=false, is_primary=false
     where product_id=p_product_id and (is_active or is_primary);
    if v_image_url is not null then
      -- Reuse a previously uploaded URL when possible (idempotent saves).
      update public.product_images
         set is_active=true, is_primary=true, sort_order=0,
             alt_ar=(select name_ar from public.products where id=p_product_id)
       where id = (
         select id from public.product_images
          where product_id=p_product_id and image_url=v_image_url
          order by created_at desc, id desc limit 1
       );
      if not found then
        insert into public.product_images(product_id,image_url,alt_ar,sort_order,is_primary,is_active)
        values(p_product_id,v_image_url,(select name_ar from public.products where id=p_product_id),0,true,true);
      end if;
    end if;
  end if;
  return public.dashboard_get_product(p_product_id);
end;
$function$
;

-- Normalise legacy accidental duplicates without deleting image objects or rows.
-- Keep the current primary (or most recent row if a primary is missing).
-- Older rows remain recoverable as is_active=false.
with ranked as (
  select id, row_number() over (
    partition by product_id
    order by is_primary desc, created_at desc, id desc
  ) as image_rank
  from public.product_images
  where is_active=true
)
update public.product_images as pi
   set is_active=false, is_primary=false
  from ranked as r
 where pi.id=r.id and r.image_rank>1;

create unique index if not exists product_images_one_active_primary_idx
 on public.product_images(product_id)
 where is_active=true and is_primary=true;

commit;
