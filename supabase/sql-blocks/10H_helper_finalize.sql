-- Bloco 10H — helper _cevo_finalize(uuid, uuid, uuid, uuid, jsonb, jsonb)
-- Parte 8/10. Idempotente. Aplica rascunho (via _cevo_apply), desativa
-- exceção legada (no-op se ausente) e marca completed. Nada é apagado.

create or replace function public._cevo_finalize(
  p_claim_request_id uuid,
  p_venue_id uuid,
  p_user_id uuid,
  p_draft_id uuid,
  p_venue_data jsonb,
  p_business_hours jsonb
)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $func$
declare
  v_email text;
  v_completed_at timestamptz;
begin
  perform public._cevo_apply(p_draft_id, p_venue_id, p_user_id, p_venue_data, p_business_hours);

  select email into v_email from auth.users where id = p_user_id;
  v_completed_at := now();

  update public.venue_legacy_completeness_waivers
  set is_active = false, completed_at = v_completed_at
  where venue_id_snapshot = p_venue_id and is_active = true;

  update public.venue_claim_requests
  set status = 'completed',
      completed_at = v_completed_at,
      requester_email = coalesce(v_email, requester_email),
      updated_at = v_completed_at
  where id = p_claim_request_id;

  return v_completed_at;
end;
$func$;

revoke all on function public._cevo_finalize(uuid, uuid, uuid, uuid, jsonb, jsonb) from public;
revoke all on function public._cevo_finalize(uuid, uuid, uuid, uuid, jsonb, jsonb) from anon;
revoke all on function public._cevo_finalize(uuid, uuid, uuid, uuid, jsonb, jsonb) from authenticated;
