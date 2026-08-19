-- Bloco 01 — search_claimable_venues(text)
-- Idempotente: CREATE OR REPLACE substitui a definição sem apagar dados.
-- Já estava correta (todas as colunas qualificadas com alias); incluída
-- aqui só para fechar a auditoria completa das 14 funções RETURNS TABLE.

create or replace function public.search_claimable_venues(search_query text)
returns table (
  id uuid,
  name text,
  category text,
  city text,
  neighborhood text,
  cover_image_url text
)
language plpgsql
security definer
set search_path = ''
as $func$
declare
  v_query text;
begin
  v_query := trim(coalesce(search_query, ''));
  if length(v_query) < 2 then
    raise exception 'Digite ao menos 2 caracteres para buscar.';
  end if;

  return query
    select v.id, v.name, v.category, v.city, v.neighborhood, v.cover_image_url
    from public.venues v
    where v.name ilike '%' || v_query || '%'
      and not exists (
        select 1 from public.venue_members vm
        where vm.venue_id = v.id and vm.is_active = true
      )
      and not exists (
        -- draft/submitted bloqueiam; pending/rejected/superseded nunca bloqueiam.
        select 1 from public.venue_claim_requests cr
        where cr.venue_id = v.id and cr.status in ('draft', 'submitted')
      )
      and not exists (
        -- Filtra pelos snapshots (identidade permanente, not null) — nunca
        -- por venue_id/blocked_user_id, que podem virar null via ON DELETE
        -- SET NULL. auth.uid() é null para anon, então nunca exclui nada
        -- de quem não está logado.
        select 1 from public.venue_owner_reclaim_blocks b
        where b.venue_id_snapshot = v.id and b.blocked_user_id_snapshot = auth.uid() and b.is_active = true
      )
    order by v.name
    limit 20;
end;
$func$;

comment on function public.search_claimable_venues(text) is
  'Busca pública (anon ou authenticated) de estabelecimentos publicados ou não, sem proprietário ativo, sem solicitação ativa (draft/submitted) e sem bloqueio ativo para quem está buscando (venue_owner_reclaim_blocks) — para quem quer reivindicar um estabelecimento antes de criar conta. Nunca cria vínculo, nunca expõe dado fora das 6 colunas declaradas. Exige 2+ caracteres, limita a 20 resultados.';

revoke all on function public.search_claimable_venues(text) from public;
grant execute on function public.search_claimable_venues(text) to anon;
grant execute on function public.search_claimable_venues(text) to authenticated;
