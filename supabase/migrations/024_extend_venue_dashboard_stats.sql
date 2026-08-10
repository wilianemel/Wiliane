-- 024_extend_venue_dashboard_stats.sql
-- APLICADA — confirmada ao vivo no Supabase: get_venue_dashboard_stats()
-- já retorna views/unique_visitors/likes/dislikes/favorites/
-- whatsapp_clicks/route_clicks (sem reservation_clicks), exatamente como
-- definido abaixo. Este arquivo passa a existir só como registro da
-- estrutura real, para uma instalação nova poder reproduzi-la — não deve
-- ser reaplicado sem necessidade.
--
-- Objetivo: evoluir public.get_venue_dashboard_stats() (022) para incluir
-- visitantes únicos, gostei/não gostei (de recommendation_history) e
-- remover reservation_clicks do retorno — sem apagar o evento
-- reservation_click do enum nem do tracking, só parar de expor essa métrica
-- no dashboard.
--
-- Retorno muda de (views, favorites, whatsapp_clicks, route_clicks,
-- reservation_clicks) para (views, unique_visitors, likes, dislikes,
-- favorites, whatsapp_clicks, route_clicks). Como a lista de colunas de
-- retorno muda, "create or replace function" não é suficiente (Postgres não
-- permite alterar o tipo de retorno de uma função existente mesmo com
-- "or replace") — por isso este arquivo primeiro dá DROP na versão antiga
-- (mesma assinatura de parâmetros, então é a mesma função sendo recriada,
-- não uma nova).
--
-- Mantém: SECURITY DEFINER, search_path fixo, checagem de
-- can_manage_venue_registration() antes de qualquer leitura, revoke de
-- public/anon + grant só para authenticated. Nenhuma policy de SELECT nova
-- em user_interactions, recommendation_history ou favorites — a função
-- continua sendo o único caminho de leitura agregada para o owner.
--
-- Não altera user_interactions, recommendation_history, favorites,
-- match-engine, tracking, anonymous_id, publicação nem onboarding.

drop function if exists public.get_venue_dashboard_stats(uuid, timestamptz);

create function public.get_venue_dashboard_stats(
  p_venue_id uuid,
  p_since timestamptz
)
returns table (
  views bigint,
  unique_visitors bigint,
  likes bigint,
  dislikes bigint,
  favorites bigint,
  whatsapp_clicks bigint,
  route_clicks bigint
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
      -- Visitante único: user_id quando logado, anonymous_id quando
      -- anônimo. Linhas sem os dois (não deveria existir, dada a
      -- constraint user_interactions_has_identifier de 023) são ignoradas
      -- pelo filtro abaixo antes mesmo de chegar no count(distinct ...).
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
    ) as dislikes,
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
        and interaction_type = 'route_click'
    ) as route_clicks;
end;
$$;

comment on function public.get_venue_dashboard_stats(uuid, timestamptz) is
  'Métricas agregadas (views/unique_visitors/likes/dislikes/favorites/whatsapp_clicks/route_clicks) de um venue desde p_since, só para quem gerencia esse venue (can_manage_venue_registration). reservation_click continua existindo em user_interactions, só não é mais retornado aqui. Nunca retorna user_id, anonymous_id nem linhas individuais.';

revoke execute on function public.get_venue_dashboard_stats(uuid, timestamptz) from public;
revoke execute on function public.get_venue_dashboard_stats(uuid, timestamptz) from anon;
grant execute on function public.get_venue_dashboard_stats(uuid, timestamptz) to authenticated;

-- ============================================================================
-- ROLLBACK MANUAL desta migration (NÃO executar automaticamente).
-- Copie e rode este bloco separadamente, apenas se precisar reverter
-- especificamente a 024 e voltar para a versão de 022.
-- ============================================================================
--
-- drop function if exists public.get_venue_dashboard_stats(uuid, timestamptz);
--
-- create function public.get_venue_dashboard_stats(
--   p_venue_id uuid,
--   p_since timestamptz
-- )
-- returns table (
--   views bigint,
--   favorites bigint,
--   whatsapp_clicks bigint,
--   route_clicks bigint,
--   reservation_clicks bigint
-- )
-- language plpgsql
-- security definer
-- set search_path = public
-- as $$
-- begin
--   if not public.can_manage_venue_registration(p_venue_id) then
--     raise exception 'Acesso negado: usuário não gerencia este estabelecimento.';
--   end if;
--
--   return query
--   select
--     (select count(*) from public.user_interactions where venue_id = p_venue_id and created_at >= p_since and interaction_type in ('visualizou', 'venue_view')) as views,
--     (select count(*) from public.favorites where venue_id = p_venue_id and created_at >= p_since) as favorites,
--     (select count(*) from public.user_interactions where venue_id = p_venue_id and created_at >= p_since and interaction_type = 'whatsapp_click') as whatsapp_clicks,
--     (select count(*) from public.user_interactions where venue_id = p_venue_id and created_at >= p_since and interaction_type = 'route_click') as route_clicks,
--     (select count(*) from public.user_interactions where venue_id = p_venue_id and created_at >= p_since and interaction_type = 'reservation_click') as reservation_clicks;
-- end;
-- $$;
--
-- revoke execute on function public.get_venue_dashboard_stats(uuid, timestamptz) from public;
-- revoke execute on function public.get_venue_dashboard_stats(uuid, timestamptz) from anon;
-- grant execute on function public.get_venue_dashboard_stats(uuid, timestamptz) to authenticated;
