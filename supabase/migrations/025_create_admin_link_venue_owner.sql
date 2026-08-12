-- 025_create_admin_link_venue_owner.sql
-- APLICADA — já executada manualmente no Supabase remoto. Mantida aqui como
-- registro histórico do schema; reexecutar é seguro (create or replace),
-- mas não é mais necessário.
--
-- Objetivo: infraestrutura mínima para vincular um usuário já existente a
-- um estabelecimento já existente, sem passar por create_owned_venue() (que
-- só cria vínculo para quem acabou de criar o venue, nunca para um
-- terceiro) — ver auditoria "fluxo empresarial e vínculo de proprietários".
--
-- Escopo estritamente aditivo:
-- - Não cria tabela nem coluna nova.
-- - Não altera public.venues, public.profiles nem auth.users.
-- - Não altera public.create_owned_venue() nem seu comportamento.
-- - Não altera nenhuma policy de RLS existente (nem em venues, nem em
--   venue_members, nem em nenhuma outra tabela). O controle de acesso desta
--   função não é RLS — é a checagem explícita de is_platform_admin() logo
--   no início do corpo, mesmo padrão já usado em
--   can_manage_venue_registration() (009).
--
-- Segurança:
-- - SECURITY DEFINER + search_path fixo, mesmo padrão de toda função deste
--   projeto (create_owned_venue, publish_owned_venue, etc.).
-- - Só quem passa em is_platform_admin() consegue executar com efeito —
--   qualquer outra chamada lança exceção antes de tocar em qualquer linha.
-- - Idempotente via "on conflict (venue_id, user_id)", reaproveitando a
--   constraint unique já existente em venue_members (005) — nunca duplica
--   um vínculo, sempre normaliza para owner ativo.
--
-- Este arquivo é seguro para revisar e reexecutar: "create or replace
-- function" não falha nem duplica se rodado mais de uma vez.

create or replace function public.admin_link_venue_owner(
  p_venue_id uuid,
  p_user_id uuid
)
returns table (
  venue_id uuid,
  user_id uuid,
  member_role text,
  is_active boolean
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_platform_admin() then
    raise exception 'Acesso negado: apenas administradores podem vincular proprietários.';
  end if;

  return query
  insert into public.venue_members (venue_id, user_id, member_role, is_active)
  values (p_venue_id, p_user_id, 'owner', true)
  on conflict (venue_id, user_id)
  do update set
    member_role = 'owner',
    is_active = true
  returning venue_members.venue_id, venue_members.user_id, venue_members.member_role, venue_members.is_active;
end;
$$;

comment on function public.admin_link_venue_owner(uuid, uuid) is
  'Vincula um usuário já existente a um estabelecimento já existente como owner ativo, sem passar por create_owned_venue(). Só executável por quem passa em is_platform_admin() — qualquer outra chamada é rejeitada. Idempotente: chamar de novo para o mesmo par (venue_id, user_id) apenas garante owner ativo, nunca duplica a linha em venue_members.';

-- Por padrão o Postgres concede EXECUTE em funções novas para PUBLIC — aqui
-- isso é revogado explicitamente e reconcedido só para authenticated. A
-- checagem real de quem pode usar de fato é is_platform_admin() dentro do
-- corpo da função; este grant só define quem pode tentar chamar.
revoke execute on function public.admin_link_venue_owner(uuid, uuid) from public;
revoke execute on function public.admin_link_venue_owner(uuid, uuid) from anon;
grant execute on function public.admin_link_venue_owner(uuid, uuid) to authenticated;

-- ============================================================================
-- ROLLBACK MANUAL desta migration (NÃO executar automaticamente).
-- Copie e rode este bloco separadamente, apenas se precisar reverter
-- especificamente a 025. Não desfaz nenhum vínculo já criado por ela — só
-- remove a função em si.
-- ============================================================================
--
-- drop function if exists public.admin_link_venue_owner(uuid, uuid);
