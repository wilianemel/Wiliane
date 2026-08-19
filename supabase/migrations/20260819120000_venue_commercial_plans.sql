-- ============================================================================
-- Migration: venue_commercial_plans
-- Implementa os planos comerciais Free/Partner/Básico: limite de imagem no
-- banco (novo — hoje só existe limite de vídeo), corte de recomendação por
-- visualizações reais (nunca click_limit), expiração automática do plano
-- Partner (90 dias, sem cobrança) com downgrade lazy para Free, e as
-- consultas que o admin usa para acompanhar planos.
--
-- Nada é apagado: toda retirada de mídia excedente é soft delete
-- (is_active=false, retired_at=now()), nunca DELETE físico nem remoção de
-- arquivo do Storage. Nenhuma tabela, RLS, trigger, grant ou regra de
-- negócio já existente é removida — só estendida.
--
-- Mecanismo de limite de tempo/contagem: checagem LAZY (sob demanda), sem
-- depender de pg_cron — combinado com o usuário porque não há confirmação
-- de que a extensão pg_cron está habilitada neste projeto Supabase.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- SEÇÃO 1 — venue_plan_definitions: novas colunas image_limit/view_limit e
-- valores comerciais atualizados. view_limit é o teto REAL de visualizações
-- (contra user_interactions, nunca click_limit) para permanecer elegível a
-- recomendação; NULL = sem corte de recomendação.
-- ----------------------------------------------------------------------------
alter table public.venue_plan_definitions
  add column if not exists image_limit integer check (image_limit >= 0),
  add column if not exists view_limit integer check (view_limit >= 0);

-- CORREÇÃO (planos comerciais): valores antigos de partner (20 vídeos,
-- introdutório R$99 -> R$199/mês) substituídos pelo novo modelo "90 dias
-- sem cobrança" definido nesta rodada. free ganha o teto de imagem (1) e o
-- teto de visualização (300) que nunca existiram antes.
update public.venue_plan_definitions
set image_limit = 1,
    view_limit = 300,
    updated_at = now()
where plan_type = 'free';

update public.venue_plan_definitions
set video_limit = 2,
    image_limit = 2,
    view_limit = null,
    introductory_price_cents = null,
    introductory_months = null,
    regular_price_cents = 0,
    updated_at = now()
where plan_type = 'partner';

insert into public.venue_plan_definitions
  (plan_type, click_limit, video_limit, image_limit, view_limit, introductory_price_cents, introductory_months, regular_price_cents)
values
  ('basico', 999999, 3, 3, null, null, null, 9700)
on conflict (plan_type) do update set
  click_limit = excluded.click_limit,
  video_limit = excluded.video_limit,
  image_limit = excluded.image_limit,
  view_limit = excluded.view_limit,
  introductory_price_cents = excluded.introductory_price_cents,
  introductory_months = excluded.introductory_months,
  regular_price_cents = excluded.regular_price_cents,
  updated_at = now();

comment on column public.venue_plan_definitions.image_limit is
  'Fotos ativas simultâneas permitidas pelo plano — mesma semântica de video_limit, aplicado pelos gatilhos _enforce_draft_media_image_limit/_enforce_venue_media_image_limit (SEÇÃO 4).';

comment on column public.venue_plan_definitions.view_limit is
  'Teto de visualizações REAIS (user_interactions, nunca click_limit/click_count legados) para o venue continuar elegível a recomendação — NULL = sem corte. Consultado por list_recommendation_ineligible_venue_ids() (SEÇÃO 6). O venue continua publicado e pesquisável mesmo depois de atingir o teto; só some das recomendações.';

-- ----------------------------------------------------------------------------
-- SEÇÃO 2 — venue_plans: expiração automática do plano partner (90 dias).
-- Dispara não importa como a linha partner é criada/atualizada (hoje só via
-- ação direta do admin, permitida pela RLS ALL já existente) — nunca
-- sobrescreve um expires_at já definido manualmente.
-- ----------------------------------------------------------------------------
create or replace function public._set_venue_plan_expiry()
returns trigger
language plpgsql
security definer
set search_path = ''
as $func$
begin
  if new.plan_type = 'partner' and new.expires_at is null then
    new.expires_at := coalesce(new.started_at, now()) + interval '90 days';
  end if;
  return new;
end;
$func$;

comment on function public._set_venue_plan_expiry() is
  'Trigger BEFORE INSERT OR UPDATE em venue_plans: define expires_at = started_at + 90 dias sempre que plan_type=partner e expires_at ainda não foi definido. Nunca sobrescreve um expires_at já existente (permite ajuste manual do admin).';

revoke all on function public._set_venue_plan_expiry() from public, anon, authenticated;

drop trigger if exists set_venue_plan_expiry_before_insert_or_update on public.venue_plans;

create trigger set_venue_plan_expiry_before_insert_or_update
before insert or update on public.venue_plans
for each row
execute function public._set_venue_plan_expiry();

-- ----------------------------------------------------------------------------
-- SEÇÃO 3 — retirada de mídia excedente (soft delete, nunca apaga linha nem
-- arquivo) e downgrade automático (lazy) do plano partner vencido.
-- ----------------------------------------------------------------------------
create or replace function public._retire_excess_media(p_venue_id uuid, p_media_type text, p_keep_count integer)
returns void
language plpgsql
security definer
set search_path = ''
as $func$
declare
  v_keep_ids uuid[];
begin
  select coalesce(array_agg(id), '{}'::uuid[]) into v_keep_ids
  from (
    select id
    from public.venue_media
    where venue_id = p_venue_id and media_type = p_media_type and is_active = true
    order by is_featured desc, created_at desc
    limit p_keep_count
  ) s;

  update public.venue_media
  set is_active = false, retired_at = now()
  where venue_id = p_venue_id
    and media_type = p_media_type
    and is_active = true
    and not (id = any (v_keep_ids));
end;
$func$;

comment on function public._retire_excess_media(uuid, text, integer) is
  'Retira (soft delete: is_active=false, retired_at=now(), nunca apaga linha nem arquivo) toda mídia ATIVA de um venue/media_type além de p_keep_count, priorizando manter a destacada e depois a mais recente. Reaproveitada pelo downgrade automático de plano vencido (SEÇÃO 3) e pelo backfill de conformidade (SEÇÃO 5).';

revoke all on function public._retire_excess_media(uuid, text, integer) from public, anon, authenticated;

create or replace function public._venue_plan_downgrade_expired(p_venue_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $func$
declare
  v_expired_id uuid;
begin
  select id into v_expired_id
  from public.venue_plans
  where venue_id = p_venue_id
    and status = 'active'
    and plan_type = 'partner'
    and expires_at is not null
    and expires_at <= now()
  for update;

  if v_expired_id is null then
    return;
  end if;

  update public.venue_plans set status = 'expired' where id = v_expired_id;

  -- Sem plano ativo agora — recria free (idempotente, nunca duplica).
  perform public._ensure_venue_plan(p_venue_id);

  -- Free permite só 1 vídeo + 1 foto — retira o excedente (soft delete).
  perform public._retire_excess_media(p_venue_id, 'video', 1);
  perform public._retire_excess_media(p_venue_id, 'image', 1);
end;
$func$;

comment on function public._venue_plan_downgrade_expired(uuid) is
  'Checagem lazy (sob demanda, sem job agendado): se o venue tem plano partner ATIVO com expires_at vencido, marca status=expired, garante um plano free ativo (_ensure_venue_plan) e retira (soft delete) vídeo/foto além de 1+1. Chamada no início de qualquer caminho que leia ou escreva limite de mídia do venue (SEÇÕES 4 e 6), para nunca deixar um plano vencido "invisível" além da próxima leitura/gravação relevante.';

revoke all on function public._venue_plan_downgrade_expired(uuid) from public, anon, authenticated;

-- ----------------------------------------------------------------------------
-- SEÇÃO 4 — limite de imagem no banco (novo — hoje só existe
-- MAX_GALLERY_IMAGES=8 fixo no frontend, sem nenhum teto por banco). Mesma
-- forma de _venue_effective_video_limit; os dois gatilhos abaixo espelham
-- _enforce_draft_media_video_limit/_enforce_venue_media_video_limit (SEÇÃO
-- 3E da migration anterior), trocando media_type='video' por 'image'. Cada
-- gatilho roda o downgrade lazy (SEÇÃO 3) antes de ler o limite efetivo —
-- _venue_effective_image_limit é stable/read-only, então a escrita do
-- downgrade precisa acontecer antes, aqui no corpo do gatilho.
-- ----------------------------------------------------------------------------
create or replace function public._venue_effective_image_limit(p_venue_id uuid)
returns integer
language sql
stable
set search_path = ''
as $func$
  select coalesce(
    (
      select d.image_limit
      from public.venue_plans p
      join public.venue_plan_definitions d on d.plan_type = p.plan_type
      where p.venue_id = p_venue_id and p.status = 'active'
      limit 1
    ),
    (select image_limit from public.venue_plan_definitions where plan_type = 'free'),
    1
  );
$func$;

comment on function public._venue_effective_image_limit(uuid) is
  'Limite de imagens ativas do estabelecimento: image_limit do plano ativo real, ou do plano free se não houver plano ainda, ou 1 como último fallback. Mesma forma de _venue_effective_video_limit.';

revoke all on function public._venue_effective_image_limit(uuid) from public, anon, authenticated;

create or replace function public._enforce_draft_media_image_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $func$
declare
  v_venue_id uuid;
  v_becomes_active_image boolean;
  v_was_active_image boolean;
  v_limit integer;
  v_active_count integer;
  v_oldest_id uuid;
begin
  v_becomes_active_image := (new.media_type = 'image' and new.is_active = true);

  if tg_op = 'UPDATE' then
    v_was_active_image := (old.media_type = 'image' and old.is_active = true and old.draft_id = new.draft_id);
  else
    v_was_active_image := false;
  end if;

  if v_becomes_active_image = v_was_active_image then
    return new;
  end if;

  if not v_becomes_active_image then
    return new;
  end if;

  select venue_id into v_venue_id from public.venue_claim_drafts where id = new.draft_id;

  perform pg_advisory_xact_lock(hashtext('draft_media_image_limit:' || new.draft_id::text)::bigint);

  perform public._venue_plan_downgrade_expired(v_venue_id);

  v_limit := public._venue_effective_image_limit(v_venue_id);

  select count(*) into v_active_count
  from public.venue_claim_draft_media
  where draft_id = new.draft_id
    and media_type = 'image'
    and is_active = true
    and id <> new.id;

  if v_active_count < v_limit then
    return new;
  end if;

  if v_limit <= 1 then
    raise exception 'Seu plano atual permite só 1 foto. Remova a foto atual antes de enviar outra.';
  end if;

  select id into v_oldest_id
  from public.venue_claim_draft_media
  where draft_id = new.draft_id
    and media_type = 'image'
    and is_active = true
    and is_featured = false
    and id <> new.id
  order by created_at asc
  limit 1;

  if v_oldest_id is null then
    raise exception 'Limite de % fotos atingido e todas estão destacadas. Remova o destaque de alguma antes de enviar outra.', v_limit;
  end if;

  update public.venue_claim_draft_media
  set is_active = false, retired_at = now()
  where id = v_oldest_id;

  return new;
end;
$func$;

comment on function public._enforce_draft_media_image_limit() is
  'Trigger BEFORE INSERT OR UPDATE em venue_claim_draft_media: mesma regra de _enforce_draft_media_video_limit(), para imagens. Roda o downgrade lazy do plano antes de checar o limite.';

revoke all on function public._enforce_draft_media_image_limit() from public, anon, authenticated;

drop trigger if exists enforce_image_limit_before_insert_or_update on public.venue_claim_draft_media;

create trigger enforce_image_limit_before_insert_or_update
before insert or update on public.venue_claim_draft_media
for each row
execute function public._enforce_draft_media_image_limit();

create or replace function public._enforce_venue_media_image_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $func$
declare
  v_becomes_active_image boolean;
  v_was_active_image boolean;
  v_limit integer;
  v_active_count integer;
  v_oldest_id uuid;
begin
  v_becomes_active_image := (new.media_type = 'image' and new.is_active = true);

  if tg_op = 'UPDATE' then
    v_was_active_image := (old.media_type = 'image' and old.is_active = true and old.venue_id = new.venue_id);
  else
    v_was_active_image := false;
  end if;

  if v_becomes_active_image = v_was_active_image then
    return new;
  end if;

  if not v_becomes_active_image then
    return new;
  end if;

  perform pg_advisory_xact_lock(hashtext('venue_media_image_limit:' || new.venue_id::text)::bigint);

  perform public._venue_plan_downgrade_expired(new.venue_id);

  v_limit := public._venue_effective_image_limit(new.venue_id);

  select count(*) into v_active_count
  from public.venue_media
  where venue_id = new.venue_id
    and media_type = 'image'
    and is_active = true
    and id <> new.id;

  if v_active_count < v_limit then
    return new;
  end if;

  if v_limit <= 1 then
    raise exception 'Este estabelecimento já tem 1 foto ativa (limite do plano). Remova a foto atual antes de enviar outra.';
  end if;

  select id into v_oldest_id
  from public.venue_media
  where venue_id = new.venue_id
    and media_type = 'image'
    and is_active = true
    and is_featured = false
    and id <> new.id
  order by created_at asc
  limit 1;

  if v_oldest_id is null then
    raise exception 'Limite de % fotos atingido e todas estão destacadas. Remova o destaque de alguma antes de enviar outra.', v_limit;
  end if;

  update public.venue_media
  set is_active = false, retired_at = now()
  where id = v_oldest_id;

  return new;
end;
$func$;

comment on function public._enforce_venue_media_image_limit() is
  'Mesma regra de _enforce_draft_media_image_limit(), aplicada em venue_media (canônica). BEFORE INSERT OR UPDATE, advisory lock por venue_id, com downgrade lazy do plano antes de checar o limite.';

revoke all on function public._enforce_venue_media_image_limit() from public, anon, authenticated;

drop trigger if exists enforce_image_limit_before_insert_or_update on public.venue_media;

create trigger enforce_image_limit_before_insert_or_update
before insert or update on public.venue_media
for each row
execute function public._enforce_venue_media_image_limit();

-- ----------------------------------------------------------------------------
-- SEÇÃO 5 — Backfill de conformidade: aplica os novos limites a venues que
-- já existem HOJE, uma vez. Nunca apaga nada — só retira (soft delete) o
-- excedente, reaproveitando _retire_excess_media (SEÇÃO 3). Efeito mais
-- visível desta migration: um venue Free com mais de 1 foto na galeria
-- (nunca houve teto de imagem antes) perde o excedente da galeria
-- (recuperável no banco, só deixa de aparecer como mídia ativa).
-- ----------------------------------------------------------------------------
do $$
declare
  v_plan record;
begin
  for v_plan in
    select venue_id, plan_type
    from public.venue_plans
    where status = 'active' and plan_type in ('free', 'partner')
  loop
    if v_plan.plan_type = 'free' then
      perform public._retire_excess_media(v_plan.venue_id, 'video', 1);
      perform public._retire_excess_media(v_plan.venue_id, 'image', 1);
    else
      perform public._retire_excess_media(v_plan.venue_id, 'video', 2);
      perform public._retire_excess_media(v_plan.venue_id, 'image', 2);
    end if;
  end loop;
end
$$;

-- ----------------------------------------------------------------------------
-- SEÇÃO 6 — RPCs de consulta: elegibilidade de recomendação (nunca usa
-- click_limit — conta visualizações reais em user_interactions), limites
-- efetivos para o painel do dono, e listagem para o admin.
-- ----------------------------------------------------------------------------

-- Visualização real = user_interactions.interaction_type in
-- ('visualizou', 'venue_view') — nunca venue_plans.click_limit/click_count
-- (colunas legadas, nunca escritas/lidas por nenhuma função deste projeto).
create or replace function public.list_recommendation_ineligible_venue_ids()
returns table (venue_id uuid)
language sql
stable
security definer
set search_path = ''
as $func$
  select p.venue_id
  from public.venue_plans p
  join public.venue_plan_definitions d on d.plan_type = p.plan_type
  where p.status = 'active'
    and d.view_limit is not null
    and (
      select count(*)
      from public.user_interactions ui
      where ui.venue_id = p.venue_id and ui.interaction_type in ('visualizou', 'venue_view')
    ) >= d.view_limit;
$func$;

comment on function public.list_recommendation_ineligible_venue_ids() is
  'Venues cujo plano ativo tem view_limit definido (hoje só free, 300) e cuja contagem REAL de visualizações em user_interactions (visualizou/venue_view — nunca click_limit) já atingiu esse teto. Usada só nos caminhos de recomendação (match-engine/for-you) para excluir esses venues das recomendações — nunca na busca/Descobrir, que continuam usando getPublishedVenues() sem filtro. O venue continua publicado e pesquisável.';

revoke all on function public.list_recommendation_ineligible_venue_ids() from public;
grant execute on function public.list_recommendation_ineligible_venue_ids() to anon;
grant execute on function public.list_recommendation_ineligible_venue_ids() to authenticated;

-- Limites efetivos + contagem de visualização, para o painel do dono —
-- roda o downgrade lazy antes de responder, então nunca mostra um plano
-- partner vencido como se ainda estivesse ativo.
create or replace function public.get_venue_effective_limits(p_venue_id uuid)
returns table (
  plan_type text,
  video_limit integer,
  image_limit integer,
  view_limit integer,
  view_count bigint
)
language plpgsql
security definer
set search_path = ''
as $func$
declare
  v_can_manage boolean;
begin
  select
    public.is_platform_admin()
    or exists (
      select 1 from public.venue_members vm
      where vm.venue_id = p_venue_id and vm.user_id = auth.uid() and vm.is_active = true
    )
  into v_can_manage;

  if not v_can_manage then
    raise exception 'Você não tem permissão para ver os limites deste estabelecimento.';
  end if;

  perform public._venue_plan_downgrade_expired(p_venue_id);
  perform public._ensure_venue_plan(p_venue_id);

  return query
    select
      d.plan_type,
      d.video_limit,
      d.image_limit,
      d.view_limit,
      (
        select count(*) from public.user_interactions ui
        where ui.venue_id = p_venue_id and ui.interaction_type in ('visualizou', 'venue_view')
      )
    from public.venue_plans p
    join public.venue_plan_definitions d on d.plan_type = p.plan_type
    where p.venue_id = p_venue_id and p.status = 'active';
end;
$func$;

comment on function public.get_venue_effective_limits(uuid) is
  'Limites efetivos (vídeo/imagem/visualização) e contagem real de visualizações do plano ativo de um venue, para o painel do dono — só owner/manager ativo ou admin. Roda o downgrade lazy do plano partner vencido antes de responder, e garante um plano ativo (free por padrão) se ainda não houver nenhum.';

revoke all on function public.get_venue_effective_limits(uuid) from public;
revoke all on function public.get_venue_effective_limits(uuid) from anon;
grant execute on function public.get_venue_effective_limits(uuid) to authenticated;

-- Listagem para o admin: nome do venue, plano ativo, status, datas e
-- limites/contagem — roda o downgrade lazy para todo partner vencido antes
-- de listar, então a tela de admin nunca mostra um plano vencido como ativo.
create or replace function public.admin_list_venue_plans()
returns table (
  venue_id uuid,
  venue_name text,
  plan_type text,
  status text,
  started_at timestamptz,
  expires_at timestamptz,
  video_limit integer,
  image_limit integer,
  view_limit integer,
  view_count bigint
)
language plpgsql
security definer
set search_path = ''
as $func$
declare
  r record;
begin
  if not public.is_platform_admin() then
    raise exception 'Acesso negado: apenas administradores podem ver planos.';
  end if;

  for r in
    select p.venue_id
    from public.venue_plans p
    where p.status = 'active'
      and p.plan_type = 'partner'
      and p.expires_at is not null
      and p.expires_at <= now()
  loop
    perform public._venue_plan_downgrade_expired(r.venue_id);
  end loop;

  return query
    select
      v.id,
      v.name,
      p.plan_type,
      p.status,
      p.started_at,
      p.expires_at,
      d.video_limit,
      d.image_limit,
      d.view_limit,
      (
        select count(*) from public.user_interactions ui
        where ui.venue_id = v.id and ui.interaction_type in ('visualizou', 'venue_view')
      )
    from public.venues v
    join public.venue_plans p on p.venue_id = v.id and p.status = 'active'
    join public.venue_plan_definitions d on d.plan_type = p.plan_type
    order by v.name;
end;
$func$;

comment on function public.admin_list_venue_plans() is
  'Lista, só para admin, o plano ativo atual de cada estabelecimento com limites e contagem real de visualizações — roda o downgrade lazy para todo plano partner vencido antes de listar.';

revoke all on function public.admin_list_venue_plans() from public;
revoke all on function public.admin_list_venue_plans() from anon;
grant execute on function public.admin_list_venue_plans() to authenticated;
