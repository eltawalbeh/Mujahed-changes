-- Phase 57 — One public Show/Hide control, safe multi-product operations.
-- Staging-first migration. Does not update product records on install.
-- Backwards-compatible status/availability/public_visible fields are updated together.
BEGIN;

CREATE OR REPLACE FUNCTION public.dashboard_bulk_manage_products(
  p_product_ids uuid[], p_action text, p_channel text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, auth
AS $$
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
        AND EXISTS (
          SELECT 1 FROM public.product_units u
          WHERE u.product_id=v_id AND u.is_active AND u.availability<>'UNAVAILABLE'
            AND u.channel IN ('B2C','BOTH') AND u.price_jod IS NOT NULL
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
$$;

REVOKE ALL ON FUNCTION public.dashboard_bulk_manage_products(uuid[],text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.dashboard_bulk_manage_products(uuid[],text,text) TO authenticated;
COMMIT;
