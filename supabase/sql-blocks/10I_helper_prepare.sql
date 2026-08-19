-- Bloco 10I — helper _cevo_prepare(uuid, uuid, uuid)
-- Parte 9/10 do bloco 10. Idempotente. Execute depois de 10A-10H.
-- Combina lock_draft+checks+media_flags+checklist+validação de completude
-- (sem duplicar lógica, só chama cada um) e devolve o rascunho validado.

create or replace function public._cevo_prepare(
  p_claim_request_id uuid,
  p_venue_id uuid,
  p_user_id uuid
)
returns public.venue_claim_drafts
language plpgsql
security definer
set search_path = ''
as $func$
declare
  v_draft public.venue_claim_drafts%rowtype;
  v_has_cover boolean;
  v_has_video boolean;
  v_checklist jsonb;
  v_missing text;
begin
  v_draft := public._cevo_lock_draft(p_claim_request_id, p_venue_id);

  perform public._cevo_checks(p_venue_id, p_user_id);

  select has_cover, has_video into v_has_cover, v_has_video
  from public._cevo_media_flags(v_draft.id);

  v_checklist := public._cevo_checklist(
    v_draft.venue_data, v_draft.business_hours, v_has_cover, v_has_video
  );

  if not (v_checklist->>'complete')::boolean then
    v_missing := public._venue_publish_missing_summary(v_checklist);
    raise exception 'Cadastro incompleto — falta: %.', v_missing;
  end if;

  return v_draft;
end;
$func$;

revoke all on function public._cevo_prepare(uuid, uuid, uuid) from public;
revoke all on function public._cevo_prepare(uuid, uuid, uuid) from anon;
revoke all on function public._cevo_prepare(uuid, uuid, uuid) from authenticated;
