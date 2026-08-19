-- Bloco 10J — parte 10/10, execute por último (depois de 10A-10I).

create or replace function public.complete_existing_venue_onboarding(p_claim_request_id uuid)
returns table (venue_id uuid, status text, completed_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $func$
declare
  v_user_id uuid;
  v_req public.venue_claim_requests%rowtype;
  v_dr public.venue_claim_drafts%rowtype;
  v_done timestamptz;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'É necessário estar autenticado.';
  end if;
  v_req := public._cevo_guard(p_claim_request_id, v_user_id);
  if v_req.status = 'completed' then
    return query select v_req.venue_id, v_req.status, v_req.completed_at;
    return;
  end if;
  v_dr := public._cevo_prepare(p_claim_request_id, v_req.venue_id, v_user_id);
  v_done := public._cevo_finalize(p_claim_request_id, v_req.venue_id, v_user_id, v_dr.id, v_dr.venue_data, v_dr.business_hours);
  return query select v_req.venue_id, 'completed'::text, v_done;
end;
$func$;

comment on function public.complete_existing_venue_onboarding(uuid) is
  'Conclui cadastro existente via helpers _cevo_* (10A-10I). Idempotente.';

revoke all on function public.complete_existing_venue_onboarding(uuid) from public;
revoke all on function public.complete_existing_venue_onboarding(uuid) from anon;
grant execute on function public.complete_existing_venue_onboarding(uuid) to authenticated;
