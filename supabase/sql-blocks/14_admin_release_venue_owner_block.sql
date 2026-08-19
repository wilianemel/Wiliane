-- Bloco 14 — admin_release_venue_owner_block(uuid, uuid)
-- Idempotente: CREATE OR REPLACE substitui a definição sem apagar dados.
-- Já estava correta (venue_id_snapshot/blocked_user_id_snapshot não
-- colidem com os parâmetros de saída venue_id/released); incluída aqui só
-- para fechar a auditoria completa das 14 funções RETURNS TABLE.
-- "Liberar nova tentativa" — só desativa o bloqueio, nunca apaga a linha
-- nem a auditoria da remoção original.

create or replace function public.admin_release_venue_owner_block(p_venue_id uuid, p_user_id uuid)
returns table (
  venue_id uuid,
  released boolean
)
language plpgsql
security definer
set search_path = ''
as $func$
declare
  v_admin_id uuid;
begin
  v_admin_id := auth.uid();
  if v_admin_id is null then
    raise exception 'É necessário estar autenticado.';
  end if;

  if not public.is_platform_admin() then
    raise exception 'Acesso negado: apenas administradores podem liberar uma nova tentativa.';
  end if;

  -- Filtra pelos snapshots (identidade permanente, not null), não mais
  -- pelas colunas venue_id/blocked_user_id (podem virar null via ON DELETE SET NULL).
  update public.venue_owner_reclaim_blocks
  set is_active = false, released_by = v_admin_id, released_at = now()
  where venue_id_snapshot = p_venue_id and blocked_user_id_snapshot = p_user_id and is_active = true;

  return query select p_venue_id, found;
end;
$func$;

comment on function public.admin_release_venue_owner_block(uuid, uuid) is
  '"Liberar nova tentativa" — só admin. Desativa (is_active=false) o bloqueio de venue_owner_reclaim_blocks para o par (venue_id_snapshot, blocked_user_id_snapshot), nunca apaga a linha nem a auditoria da remoção original. Idempotente: sem bloqueio ativo para liberar, devolve released=false sem erro.';

revoke all on function public.admin_release_venue_owner_block(uuid, uuid) from public;
revoke all on function public.admin_release_venue_owner_block(uuid, uuid) from anon;
grant execute on function public.admin_release_venue_owner_block(uuid, uuid) to authenticated;
