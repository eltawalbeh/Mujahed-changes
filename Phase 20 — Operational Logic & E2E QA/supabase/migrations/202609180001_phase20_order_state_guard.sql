-- Phase 20: enforce the operational order state machine in the database.
-- Payment approval remains handled by dashboard_update_payment.

create or replace function public.dashboard_update_request_status(p_request_id uuid, p_status text)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'auth'
as $$
declare
  v_role text;
  v_old text;
  v_total numeric(12,3);
  v_payment text;
  v_allowed boolean := false;
begin
  v_role := public.dashboard_assert_role();
  if p_status not in ('NEW','CONTACT_REQUIRED','AWAITING_CONFIRMATION','APPROVED','PREPARING','READY','OUT_FOR_DELIVERY','COMPLETED','CANCELLED') then
    raise exception 'invalid request status';
  end if;

  select status, payment_status into v_old, v_payment
  from public.requests where id = p_request_id for update;
  if not found then raise exception 'request not found'; end if;

  v_allowed := p_status = v_old
    or (v_old in ('NEW','CONTACT_REQUIRED') and p_status = 'AWAITING_CONFIRMATION')
    or (v_old in ('NEW','CONTACT_REQUIRED','AWAITING_CONFIRMATION') and p_status = 'APPROVED')
    or (v_old = 'APPROVED' and p_status = 'PREPARING')
    or (v_old = 'PREPARING' and p_status = 'READY')
    or (v_old = 'READY' and p_status = 'OUT_FOR_DELIVERY')
    or (v_old = 'OUT_FOR_DELIVERY' and p_status = 'COMPLETED')
    or (v_old <> 'COMPLETED' and p_status = 'CANCELLED');

  if not v_allowed then
    raise exception 'invalid status transition from % to %', v_old, p_status;
  end if;
  if p_status = 'APPROVED' and v_payment not in ('PAID','CASH_ON_DELIVERY','MONTHLY_B2B_ACCOUNT') then
    raise exception 'payment must be recorded before approval';
  end if;

  if p_status = 'APPROVED' then
    update public.request_items i
    set observed_base_price_jod = coalesce(i.observed_base_price_jod, p.base_price_jod),
        final_line_total_jod = greatest(coalesce(i.observed_base_price_jod, p.base_price_jod, 0) * i.quantity - i.discount_amount_jod, 0)
    from public.products p
    where i.request_id = p_request_id and p.id = i.product_id;

    select coalesce(sum(final_line_total_jod), 0) into v_total
    from public.request_items where request_id = p_request_id;

    update public.requests
    set status = p_status,
        final_total_jod = v_total,
        requires_reapproval = false,
        invoice_number = coalesce(invoice_number, public.next_invoice_number()),
        invoice_issued_at = coalesce(invoice_issued_at, now()),
        updated_at = now()
    where id = p_request_id;
  else
    update public.requests set status = p_status, updated_at = now() where id = p_request_id;
  end if;

  insert into public.request_activity(request_id, action_type, description, actor_id, metadata)
  values (p_request_id, 'STATUS_CHANGED', 'تم تغيير حالة الطلب من ' || v_old || ' إلى ' || p_status, auth.uid(), jsonb_build_object('from', v_old, 'to', p_status, 'role', v_role));

  return public.dashboard_get_request(p_request_id);
end;
$$;
