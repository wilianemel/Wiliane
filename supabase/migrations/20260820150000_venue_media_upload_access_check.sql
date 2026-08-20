-- ============================================================================
-- Migration: venue_media_upload_access_check
-- RPC nova, só-leitura, pro painel mostrar a mensagem certa ANTES de tentar
-- enviar capa/vídeo (nunca depois de um erro genérico da RPC de escrita).
--
-- Por que precisa de RPC (SECURITY DEFINER) e não dá pra consultar
-- venue_members direto do cliente: a policy "Members can read own
-- memberships" (005_create_marketplace_core.sql) só deixa cada usuário ler
-- a PRÓPRIA linha (user_id = auth.uid() or is_admin()) — um dono/gerente
-- não-admin nunca enxerga a linha de outra pessoa. Isso significa que uma
-- consulta direta do cliente não consegue distinguir "este estabelecimento
-- não tem NINGUÉM vinculado" de "outra pessoa é a dona ativa" — as duas
-- situações voltam vazias igual. A distinção é exigida pelo produto (duas
-- mensagens diferentes), por isso esta função central resolve isso uma vez
-- só, sem alterar RLS nem abrir SELECT amplo em venue_members pra ninguém.
--
-- Não apaga, insere nem atualiza nada — só 4 booleanos agregados, nunca
-- linhas individuais nem identidade de outros usuários.
-- ============================================================================

create or replace function public.check_venue_media_upload_access(p_venue_id uuid)
returns table (
  is_authenticated boolean,
  venue_exists boolean,
  has_active_owner boolean,
  current_user_can_manage boolean
)
language plpgsql
security definer
set search_path = ''
as $func$
declare
  v_user_id uuid;
begin
  v_user_id := auth.uid();

  return query
  select
    v_user_id is not null,
    exists (select 1 from public.venues where id = p_venue_id),
    exists (select 1 from public.venue_members where venue_id = p_venue_id and is_active = true),
    coalesce(
      v_user_id is not null and (
        public.is_platform_admin()
        or exists (
          select 1 from public.venue_members vm
          where vm.venue_id = p_venue_id
            and vm.user_id = v_user_id
            and vm.is_active = true
            and vm.member_role in ('owner', 'manager')
        )
      ),
      false
    );
end;
$func$;

comment on function public.check_venue_media_upload_access(uuid) is
  'Só-leitura: confere sessão autenticada, existência do venue, se existe ALGUM owner/manager ativo (sem revelar quem) e se o usuário atual pode gerenciar (owner/manager ativo ou admin) — usada pelo painel para escolher a mensagem certa ANTES de tentar enviar capa/vídeo, em vez de deixar a RPC de escrita (replace_featured_venue_media) falhar com um erro genérico. Nunca insere, atualiza ou apaga nada.';

revoke all on function public.check_venue_media_upload_access(uuid) from public;
revoke all on function public.check_venue_media_upload_access(uuid) from anon;
grant execute on function public.check_venue_media_upload_access(uuid) to authenticated;
