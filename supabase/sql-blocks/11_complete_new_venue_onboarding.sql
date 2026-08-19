-- Bloco 11 — complete_new_venue_onboarding(uuid)
-- Idempotente: CREATE OR REPLACE substitui a definição sem apagar dados.
-- CORREÇÃO real do 42P01: "venue_id" sem qualificador nos dois selects
-- contra venue_media é ambíguo — colide com o parâmetro de saída venue_id
-- desta própria função RETURNS TABLE. Qualificado com o alias vmed.

create or replace function public.complete_new_venue_onboarding(p_venue_id uuid)
returns table (
  venue_id uuid,
  status text
)
language plpgsql
security definer
set search_path = ''
as $func$
declare
  v_user_id uuid;
  v_venue public.venues%rowtype;
  v_can_manage boolean;
  v_checklist jsonb;
  v_missing text;
  v_has_cover boolean;
  v_has_video boolean;
  v_hours_ok boolean;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'É necessário estar autenticado.';
  end if;

  select
    public.is_platform_admin()
    or exists (
      select 1 from public.venue_members vm
      where vm.venue_id = p_venue_id and vm.user_id = v_user_id
        and vm.member_role in ('owner', 'manager') and vm.is_active = true
    )
  into v_can_manage;

  if not v_can_manage then
    raise exception 'Você não tem permissão para publicar este estabelecimento.';
  end if;

  perform pg_advisory_xact_lock(hashtext('venue_claim_complete:' || p_venue_id::text)::bigint);

  select * into v_venue from public.venues where id = p_venue_id for update;
  if not found then
    raise exception 'Estabelecimento não encontrado.';
  end if;

  -- Checklist SEMPRE recalculada, publicado ou não — um venue publicado
  -- que perdeu um requisito depois não pode mais reportar sucesso.
  v_hours_ok := public._venue_hours_jsonb_is_complete(public._venue_claim_business_hours_snapshot(p_venue_id));

  select exists (
    select 1 from public.venue_media vmed
    where vmed.venue_id = p_venue_id and vmed.media_type = 'image' and vmed.is_active = true and vmed.is_featured = true
  ) into v_has_cover;

  select exists (
    select 1 from public.venue_media vmed
    where vmed.venue_id = p_venue_id and vmed.media_type = 'video' and vmed.is_active = true
  ) into v_has_video;

  v_checklist := public._venue_publish_checklist(
    v_venue.name, v_venue.category, v_venue.description, v_venue.city, v_venue.neighborhood, v_venue.address,
    v_venue.price_range, v_venue.average_price_per_person,
    v_venue.whatsapp_number, v_venue.whatsapp, v_venue.whatsapp_url,
    coalesce(v_venue.atmospheres, '{}'::text[]),
    coalesce(v_venue.intentions, '{}'::text[]),
    coalesce(v_venue.companions, '{}'::text[]),
    v_hours_ok, v_has_cover, v_has_video
  );

  if not (v_checklist->>'complete')::boolean then
    v_missing := public._venue_publish_missing_summary(v_checklist);
    raise exception 'Cadastro incompleto — falta: %.', v_missing;
  end if;

  perform public._ensure_venue_plan(p_venue_id);

  -- Só grava se ainda não estava publicado — idempotente, sem bater updated_at à toa.
  if not v_venue.is_published then
    update public.venues
    set is_published = true, updated_at = now()
    where id = p_venue_id;
  end if;

  -- Conclusão completa desativa qualquer exceção legada ativa; no-op se nunca existiu exceção.
  update public.venue_legacy_completeness_waivers
  set is_active = false, completed_at = now()
  where venue_id_snapshot = p_venue_id and is_active = true;

  return query select p_venue_id, 'published'::text;
end;
$func$;

comment on function public.complete_new_venue_onboarding(uuid) is
  'Publica automaticamente um estabelecimento criado via create_owned_venue(), sem aprovação administrativa. Exige owner/manager ativo ou admin. SEMPRE revalida a checklist completa (_venue_publish_checklist), mesmo se já estiver publicado — nunca reporta sucesso sobre um cadastro que ficou incompleto depois de publicado. Garante plano free. Desativa qualquer exceção legada ativa (venue_legacy_completeness_waivers) ao concluir com sucesso. Idempotente: só grava is_published/updated_at se ainda não estava publicado.';

revoke all on function public.complete_new_venue_onboarding(uuid) from public;
revoke all on function public.complete_new_venue_onboarding(uuid) from anon;
grant execute on function public.complete_new_venue_onboarding(uuid) to authenticated;
