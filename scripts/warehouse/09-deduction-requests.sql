-- ============================================================================
-- ترحيل نظام طلبات الطرح المخزني المعتمدة بثنائية التأييد
-- 09-deduction-requests.sql
-- ============================================================================

create table if not exists public.warehouse_deduction_requests (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.profiles(id) on delete cascade,
  warehouse_id uuid not null references public.warehouses(id) on delete cascade,
  item_id uuid not null references public.warehouse_items(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  
  -- مقدم الطلب
  requested_by_id uuid not null references public.profiles(id) on delete cascade,
  requested_by_name text not null,
  
  -- تفاصيل الطرح
  quantity numeric not null check (quantity > 0),
  unit text not null,
  base_quantity numeric not null check (base_quantity > 0),
  reason_type text not null check (reason_type in ('damage', 'expired', 'external_sale', 'shortage', 'other')),
  notes text,
  
  -- تأييد الشاهد (الموظف الزميل إن وُجد)
  witness_id uuid references public.profiles(id) on delete set null,
  witness_name text,
  witness_status text not null default 'pending' check (witness_status in ('pending', 'approved', 'rejected', 'not_required')),
  witness_at timestamptz,
  witness_note text,
  
  -- موافقة التاجر صاحب المتجر
  merchant_status text not null default 'pending' check (merchant_status in ('pending', 'approved', 'rejected')),
  merchant_at timestamptz,
  merchant_note text,
  
  -- الحالة العامة للطلب
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'cancelled')),
  executed_at timestamptz,
  executed_movement_id uuid references public.warehouse_movements(id) on delete set null,
  
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- فهارس للأداء العالي
create index if not exists idx_wh_deductions_merchant on public.warehouse_deduction_requests(merchant_id, status);
create index if not exists idx_wh_deductions_witness on public.warehouse_deduction_requests(witness_id, witness_status);
create index if not exists idx_wh_deductions_item on public.warehouse_deduction_requests(item_id);

-- سياسات RLS
alter table public.warehouse_deduction_requests enable row level security;

drop policy if exists "deduction_requests_select" on public.warehouse_deduction_requests;
create policy "deduction_requests_select" on public.warehouse_deduction_requests
  for select using (
    merchant_id = auth.uid() or
    requested_by_id = auth.uid() or
    witness_id = auth.uid() or
    exists (
      select 1 from public.profiles
      where id = auth.uid() and parent_merchant_id = warehouse_deduction_requests.merchant_id
    )
  );

drop policy if exists "deduction_requests_insert" on public.warehouse_deduction_requests;
create policy "deduction_requests_insert" on public.warehouse_deduction_requests
  for insert with check (
    merchant_id = auth.uid() or
    exists (
      select 1 from public.profiles
      where id = auth.uid() and parent_merchant_id = warehouse_deduction_requests.merchant_id and is_active = true
    )
  );

-- ============================================================================
-- دالة RPC ذرية لمعالجة قرارات التأييد والاعتماد والتنفيذ المباشر
-- ============================================================================
create or replace function public.warehouse_process_deduction_decision(
  p_request_id uuid,
  p_actor_id uuid,
  p_decision text, -- 'approve' | 'reject'
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_req record;
  v_item record;
  v_is_witness boolean := false;
  v_is_merchant boolean := false;
  v_reason_ar text;
  v_movement_note text;
begin
  if p_decision not in ('approve', 'reject') then
    return jsonb_build_object('success', false, 'error', 'قرار غير صالح');
  end if;

  -- قفل سجل الطلب لمنع أي تضارب متزامن (Concurrency Lock)
  select * into v_req
  from public.warehouse_deduction_requests
  where id = p_request_id
  for update;

  if not found then
    return jsonb_build_object('success', false, 'error', 'طلب الطرح غير موجود');
  end if;

  if v_req.status <> 'pending' then
    return jsonb_build_object('success', false, 'error', 'تم البت في هذا الطلب مسبقاً');
  end if;

  -- التحقق من هوية الفاعل
  if v_req.witness_id = p_actor_id then
    v_is_witness := true;
  end if;
  if v_req.merchant_id = p_actor_id then
    v_is_merchant := true;
  end if;

  if not v_is_witness and not v_is_merchant then
    return jsonb_build_object('success', false, 'error', 'غير مصرح لك باتخاذ قرار على هذا الطلب');
  end if;

  -- حالة الرفض من أي طرف تنهي الطلب فوراً برفض
  if p_decision = 'reject' then
    if v_is_witness then
      update public.warehouse_deduction_requests
      set witness_status = 'rejected',
          witness_at = now(),
          witness_note = p_note,
          status = 'rejected',
          updated_at = now()
      where id = p_request_id;
    else
      update public.warehouse_deduction_requests
      set merchant_status = 'rejected',
          merchant_at = now(),
          merchant_note = p_note,
          status = 'rejected',
          updated_at = now()
      where id = p_request_id;
    end if;

    return jsonb_build_object('success', true, 'status', 'rejected', 'message', 'تم رفض الطلب');
  end if;

  -- حالة الموافقة (Approve):
  if v_is_witness then
    update public.warehouse_deduction_requests
    set witness_status = 'approved',
        witness_at = now(),
        witness_note = p_note,
        updated_at = now()
    where id = p_request_id;
    v_req.witness_status := 'approved';
  end if;

  if v_is_merchant then
    update public.warehouse_deduction_requests
    set merchant_status = 'approved',
        merchant_at = now(),
        merchant_note = p_note,
        updated_at = now()
    where id = p_request_id;
    v_req.merchant_status := 'approved';
  end if;

  -- هل اكتملت كافة الموافقات المطلوبة؟
  -- إما أن الشاهد معتمد (أو غير مطلوب) والتاجر معتمد:
  if (v_req.witness_status in ('approved', 'not_required')) and (v_req.merchant_status = 'approved') then
    -- فحص رصيد المخزن الحالي
    select * into v_item
    from public.warehouse_items
    where id = v_req.item_id
    for update;

    if not found then
      return jsonb_build_object('success', false, 'error', 'صنف المخزن غير موجود');
    end if;

    if v_item.quantity < v_req.base_quantity then
      return jsonb_build_object('success', false, 'error', 'رصيد المخزن الحالي لا يكفي لتنفيذ الطرح');
    end if;

    case v_req.reason_type
      when 'damage' then v_reason_ar := 'إتلاف / تلف بضاعة';
      when 'expired' then v_reason_ar := 'انتهاء صلاحية';
      when 'external_sale' then v_reason_ar := 'بيع نقدي خارجي بدون تطبيق';
      when 'shortage' then v_reason_ar := 'عجز جردي';
      else v_reason_ar := 'طرح مخزني معتمد';
    end case;

    v_movement_note := 'طرح معتمد: ' || v_reason_ar || ' — كمية: ' || v_req.quantity::text || ' ' || v_req.unit || ' (طالب: ' || v_req.requested_by_name || coalesce(', بيان: ' || v_req.notes, '') || ')';

    -- تطبيق الطرح الذري في المخزن
    perform public.warehouse_apply_movement(
      p_item_id := v_req.item_id,
      p_kind := 'out',
      p_quantity := - (v_req.base_quantity)::integer,
      p_note := v_movement_note,
      p_reference_type := 'deduction_request',
      p_reference_id := v_req.id
    );

    update public.warehouse_deduction_requests
    set status = 'approved',
        executed_at = now(),
        updated_at = now()
    where id = p_request_id;

    return jsonb_build_object('success', true, 'status', 'approved', 'executed', true, 'message', 'اكتملت الموافقات ونُفّذ الطرح من المخزن بنجاح');
  end if;

  return jsonb_build_object('success', true, 'status', 'pending', 'executed', false, 'message', 'تم تسجيل موافقتك بنجاح، بانتظار الطرف الآخر');
end;
$$;
