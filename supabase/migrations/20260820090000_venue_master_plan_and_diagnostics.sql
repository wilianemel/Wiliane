-- ============================================================================
-- Migration: venue_master_plan_and_diagnostics
-- Adiciona o plano Master (plan_type='master' interno, "Plano Master" só na
-- apresentação) e a base de dados para o "Diagnóstico do estabelecimento"
-- (Master): um clique novo (website_click, nunca rastreado antes) e uma RPC
-- de métricas mais rica, sem tocar em get_venue_dashboard_stats (já
-- aplicada ao vivo — ver 024_extend_venue_dashboard_stats.sql).
--
-- plan_type='basico' (interno) é mantido como está — só o texto visível
-- muda para "Plano Essencial" no frontend, decisão explícita para não
-- renomear identificador já usado em 3 migrations anteriores.
--
-- Nada é apagado: só ADD VALUE no enum (aditivo, nunca remove um valor
-- existente), upsert de uma linha nova em venue_plan_definitions e uma
-- função nova. Nenhuma tabela, RLS, trigger, grant ou regra de negócio já
-- existente é removida.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- SEÇÃO 1 — website_click: novo tipo de clique rastreável (cliques no site
-- do estabelecimento), mesmo vocabulário de whatsapp_click/route_click/
-- reservation_click (019_extend_interaction_business_events.sql). Aditivo
-- ao enum — nenhum valor existente é alterado ou removido.
-- ----------------------------------------------------------------------------
alter type public.interaction_type add value if not exists 'website_click';

-- ----------------------------------------------------------------------------
-- SEÇÃO 2 — venue_plan_definitions: plano Master. video_limit/image_limit=5,
-- sem corte de recomendação (view_limit null, mesmo espírito do partner) —
-- "Master" continua aparecendo nas recomendações sempre.
-- ----------------------------------------------------------------------------
insert into public.venue_plan_definitions
  (plan_type, click_limit, video_limit, image_limit, view_limit, introductory_price_cents, introductory_months, regular_price_cents)
values
  ('master', 999999, 5, 5, null, null, null, 18700)
on conflict (plan_type) do update set
  click_limit = excluded.click_limit,
  video_limit = excluded.video_limit,
  image_limit = excluded.image_limit,
  view_limit = excluded.view_limit,
  introductory_price_cents = excluded.introductory_price_cents,
  introductory_months = excluded.introductory_months,
  regular_price_cents = excluded.regular_price_cents,
  updated_at = now();

-- ----------------------------------------------------------------------------
-- SEÇÃO 3 — get_venue_diagnostic_stats: superset de métricas para o
-- "Diagnóstico do estabelecimento" (exclusivo do plano Master na tela,
-- gate feito no frontend — aqui a autorização é a mesma de sempre,
-- can_manage_venue_registration, já usada por get_venue_dashboard_stats).
-- Função NOVA e separada — não altera get_venue_dashboard_stats (já ao
-- vivo, usada pelo dashboard de todos os planos) nem duplica sua lógica;
-- só reaproveita as mesmas fontes (user_interactions, recommendation_history,
-- favorites) com mais colunas.
-- ----------------------------------------------------------------------------
create or replace function public.get_venue_diagnostic_stats(
  p_venue_id uuid,
  p_since timestamptz
)
returns table (
  views bigint,
  unique_visitors bigint,
  favorites bigint,
  whatsapp_clicks bigint,
  website_clicks bigint,
  reservation_clicks bigint,
  route_clicks bigint,
  recommendation_count bigint,
  likes bigint,
  dislikes bigint
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.can_manage_venue_registration(p_venue_id) then
    raise exception 'Acesso negado: usuário não gerencia este estabelecimento.';
  end if;

  return query
  select
    (
      select count(*) from public.user_interactions
      where venue_id = p_venue_id
        and created_at >= p_since
        and interaction_type in ('visualizou', 'venue_view')
    ) as views,
    (
      select count(distinct
        case
          when user_id is not null then 'user:' || user_id::text
          when anonymous_id is not null then 'anon:' || anonymous_id
        end
      )
      from public.user_interactions
      where venue_id = p_venue_id
        and created_at >= p_since
        and interaction_type in ('visualizou', 'venue_view')
        and (user_id is not null or anonymous_id is not null)
    ) as unique_visitors,
    (
      select count(*) from public.favorites
      where venue_id = p_venue_id
        and created_at >= p_since
    ) as favorites,
    (
      select count(*) from public.user_interactions
      where venue_id = p_venue_id
        and created_at >= p_since
        and interaction_type = 'whatsapp_click'
    ) as whatsapp_clicks,
    (
      select count(*) from public.user_interactions
      where venue_id = p_venue_id
        and created_at >= p_since
        and interaction_type = 'website_click'
    ) as website_clicks,
    (
      select count(*) from public.user_interactions
      where venue_id = p_venue_id
        and created_at >= p_since
        and interaction_type = 'reservation_click'
    ) as reservation_clicks,
    (
      select count(*) from public.user_interactions
      where venue_id = p_venue_id
        and created_at >= p_since
        and interaction_type = 'route_click'
    ) as route_clicks,
    (
      select count(*) from public.recommendation_history
      where venue_id = p_venue_id
        and created_at >= p_since
    ) as recommendation_count,
    (
      select count(*) from public.recommendation_history
      where venue_id = p_venue_id
        and created_at >= p_since
        and user_feedback = 'gostei'
    ) as likes,
    (
      select count(*) from public.recommendation_history
      where venue_id = p_venue_id
        and created_at >= p_since
        and user_feedback = 'nao_gostei'
    ) as dislikes;
end;
$$;

comment on function public.get_venue_diagnostic_stats(uuid, timestamptz) is
  'Métricas estendidas (views/unique_visitors/favorites/whatsapp_clicks/website_clicks/reservation_clicks/route_clicks/recommendation_count/likes/dislikes) de um venue desde p_since, para o "Diagnóstico do estabelecimento" — só para quem gerencia esse venue (can_manage_venue_registration). Não substitui get_venue_dashboard_stats (022/024, já ao vivo) — função separada, mesma autorização, mesmas fontes de dado, mais colunas. Nunca retorna user_id, anonymous_id nem linhas individuais.';

revoke execute on function public.get_venue_diagnostic_stats(uuid, timestamptz) from public;
revoke execute on function public.get_venue_diagnostic_stats(uuid, timestamptz) from anon;
grant execute on function public.get_venue_diagnostic_stats(uuid, timestamptz) to authenticated;
