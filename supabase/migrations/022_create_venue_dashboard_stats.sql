-- 022_create_venue_dashboard_stats.sql
-- APLICADA — confirmada ao vivo no Supabase. Esta versão da função (retorno
-- de 5 colunas: views/favorites/whatsapp_clicks/route_clicks/
-- reservation_clicks) foi posteriormente substituída por
-- 024_extend_venue_dashboard_stats.sql (retorno de 7 colunas, com
-- unique_visitors/likes/dislikes e sem reservation_clicks) — a forma atual
-- da função em produção é a da 024, não a deste arquivo. Este arquivo
-- permanece só como registro histórico de quando/como a função nasceu;
-- não deve ser reaplicado por cima da 024.
--
-- Objetivo: métricas agregadas de um estabelecimento (visualizações,
-- favoritos, cliques de WhatsApp/rota/reserva) para o dono/gestor, sem
-- expor nenhuma linha individual de user_interactions ou favorites e sem
-- criar nenhuma policy nova de SELECT nessas duas tabelas.
--
-- Como funciona: a função é SECURITY DEFINER, então roda com privilégio do
-- dono do banco e enxerga todas as linhas de user_interactions/favorites
-- internamente (ignorando RLS), mas só devolve para quem chama 5 números
-- agregados — nunca user_id, nunca linha por linha. O controle de acesso
-- não é RLS: é a checagem explícita de can_manage_venue_registration()
-- logo no início do corpo da função, que já existe (009) e já é usada
-- exatamente para esse propósito nas policies de venues (011).
--
-- Este arquivo é seguro para revisar e reexecutar: "create or replace
-- function" não falha nem duplica se rodado mais de uma vez.
--
-- Não altera user_interactions, favorites, match-engine, HomeMatchFlow,
-- recommendation_history nem nenhuma migration 001-021.

create or replace function public.get_venue_dashboard_stats(
  p_venue_id uuid,
  p_since timestamptz
)
returns table (
  views bigint,
  favorites bigint,
  whatsapp_clicks bigint,
  route_clicks bigint,
  reservation_clicks bigint
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
    ) as route_clicks,
    (
      select count(*) from public.user_interactions
      where venue_id = p_venue_id
        and created_at >= p_since
        and interaction_type = 'reservation_click'
    ) as reservation_clicks;
end;
$$;

comment on function public.get_venue_dashboard_stats(uuid, timestamptz) is
  'Métricas agregadas (views/favorites/whatsapp_clicks/route_clicks/reservation_clicks) de um venue desde p_since, só para quem gerencia esse venue (can_manage_venue_registration). Nunca retorna user_id nem linhas individuais.';

-- Por padrão o Postgres concede EXECUTE em funções novas para PUBLIC — aqui
-- isso é revogado explicitamente e reconcedido só para authenticated. anon
-- nunca deveria conseguir chamar isso (não tem venue pra gerenciar mesmo,
-- mas o revoke é explícito por clareza e defesa em profundidade).
revoke execute on function public.get_venue_dashboard_stats(uuid, timestamptz) from public;
revoke execute on function public.get_venue_dashboard_stats(uuid, timestamptz) from anon;
grant execute on function public.get_venue_dashboard_stats(uuid, timestamptz) to authenticated;

-- ============================================================================
-- ROLLBACK MANUAL desta migration (NÃO executar automaticamente).
-- Copie e rode este bloco separadamente, apenas se precisar reverter
-- especificamente a 022.
-- ============================================================================
--
-- drop function if exists public.get_venue_dashboard_stats(uuid, timestamptz);
