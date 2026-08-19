-- Bloco 10G — helper _cevo_apply(uuid, uuid, uuid, jsonb, jsonb)
-- Parte 7/10 do bloco 10. Idempotente.
-- Aplica o rascunho ao venue + vínculo do usuário como proprietário —
-- reaproveita os helpers já existentes, sem duplicar lógica.

create or replace function public._cevo_apply(
  p_draft_id uuid,
  p_venue_id uuid,
  p_user_id uuid,
  p_venue_data jsonb,
  p_business_hours jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $func$
begin
  perform public._apply_venue_claim_fields_to_venue(p_venue_id, p_venue_data);
  perform public._apply_venue_claim_hours_to_venue(p_venue_id, p_business_hours);
  perform public._ensure_venue_plan(p_venue_id);
  perform public._consolidate_venue_claim_media(p_draft_id, p_venue_id);

  insert into public.venue_members (venue_id, user_id, member_role, is_active)
  values (p_venue_id, p_user_id, 'owner', true)
  on conflict (venue_id, user_id) do update set
    member_role = 'owner',
    is_active = true;
end;
$func$;

revoke all on function public._cevo_apply(uuid, uuid, uuid, jsonb, jsonb) from public;
revoke all on function public._cevo_apply(uuid, uuid, uuid, jsonb, jsonb) from anon;
revoke all on function public._cevo_apply(uuid, uuid, uuid, jsonb, jsonb) from authenticated;
