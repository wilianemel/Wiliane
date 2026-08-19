-- Bloco 13 — admin_remove_venue_owner(uuid, text)
-- Idempotente: CREATE OR REPLACE substitui a definição sem apagar dados.
-- Nunca apaga usuário, venue, mídia ou plano — só soft delete
-- (venue_members.is_active=false, venues.is_published=false).
-- CORREÇÃO real do 42P01: "venue_id" sem qualificador em duas consultas
-- contra venue_members é ambíguo — colide com o parâmetro de saída
-- venue_id desta própria função RETURNS TABLE. Qualificado com alias vm.

create or replace function public.admin_remove_venue_owner(p_venue_id uuid, p_reason text)
returns table (
  venue_id uuid,
  removed boolean
)
language plpgsql
security definer
set search_path = ''
as $func$
declare
  v_admin_id uuid;
  v_clean_reason text;
  v_owner_id uuid;
  v_venue_name text;
  v_owner_email text;
begin
  v_admin_id := auth.uid();
  if v_admin_id is null then
    raise exception 'É necessário estar autenticado.';
  end if;

  if not public.is_platform_admin() then
    raise exception 'Acesso negado: apenas administradores podem remover um proprietário.';
  end if;

  v_clean_reason := trim(coalesce(p_reason, ''));
  if v_clean_reason = '' then
    raise exception 'Informe um motivo para a remoção.';
  end if;

  perform pg_advisory_xact_lock(hashtext('venue_claim_complete:' || p_venue_id::text)::bigint);

  select name into v_venue_name from public.venues where id = p_venue_id for update;
  if v_venue_name is null then
    raise exception 'Estabelecimento não encontrado.';
  end if;

  select vm.user_id into v_owner_id
  from public.venue_members vm
  where vm.venue_id = p_venue_id and vm.member_role = 'owner' and vm.is_active = true
  limit 1;

  if v_owner_id is null then
    -- Idempotente: já sem owner ativo — só garante despublicado, sem duplicar auditoria.
    update public.venues
    set is_published = false, updated_at = now()
    where id = p_venue_id and is_published = true;

    return query select p_venue_id, false;
    return;
  end if;

  select email into v_owner_email from auth.users where id = v_owner_id;

  update public.venue_members vm
  set is_active = false
  where vm.venue_id = p_venue_id and vm.user_id = v_owner_id and vm.member_role = 'owner' and vm.is_active = true;

  update public.venues
  set is_published = false, updated_at = now()
  where id = p_venue_id;

  insert into public.venue_owner_removal_audit
    (venue_id, venue_id_snapshot, venue_name_snapshot, removed_user_id, removed_user_id_snapshot, removed_user_email_snapshot, admin_id, admin_id_snapshot, reason)
  values (p_venue_id, p_venue_id, v_venue_name, v_owner_id, v_owner_id, v_owner_email, v_admin_id, v_admin_id, v_clean_reason);

  -- Bloqueia explicitamente ESTE usuário para ESTE venue — reativa a mesma
  -- linha por (venue_id_snapshot, blocked_user_id_snapshot), a identidade permanente.
  insert into public.venue_owner_reclaim_blocks
    (venue_id, venue_id_snapshot, venue_name_snapshot, blocked_user_id, blocked_user_id_snapshot, blocked_user_email_snapshot, is_active, reason, created_by, created_at, released_by, released_at)
  values (p_venue_id, p_venue_id, v_venue_name, v_owner_id, v_owner_id, v_owner_email, true, v_clean_reason, v_admin_id, now(), null, null)
  on conflict (venue_id_snapshot, blocked_user_id_snapshot) do update set
    venue_id = excluded.venue_id,
    venue_name_snapshot = excluded.venue_name_snapshot,
    blocked_user_id = excluded.blocked_user_id,
    blocked_user_email_snapshot = excluded.blocked_user_email_snapshot,
    is_active = true,
    reason = excluded.reason,
    created_by = excluded.created_by,
    created_at = now(),
    released_by = null,
    released_at = null;

  return query select p_venue_id, true;
end;
$func$;

comment on function public.admin_remove_venue_owner(uuid, text) is
  'Remove (soft) o proprietário ativo de um estabelecimento — só admin. Nunca apaga usuário, venue, mídia ou plano: marca venue_members.is_active=false e venues.is_published=false. Exige motivo não vazio, registrado em venue_owner_removal_audit (snapshots permanentes, not null). Cria/reativa um bloqueio explícito em venue_owner_reclaim_blocks para o usuário removido, até um admin liberar. Idempotente.';

revoke all on function public.admin_remove_venue_owner(uuid, text) from public;
revoke all on function public.admin_remove_venue_owner(uuid, text) from anon;
grant execute on function public.admin_remove_venue_owner(uuid, text) to authenticated;
