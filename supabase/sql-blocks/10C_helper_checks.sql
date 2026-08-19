-- Bloco 10C — helper _cevo_checks(uuid, uuid)
-- Parte 3/10 do bloco 10. Idempotente.
-- Bloqueio ativo (por snapshot) + confirma que não existe OUTRO owner
-- ativo — mesma lógica exata de antes.

create or replace function public._cevo_checks(
  p_venue_id uuid,
  p_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $func$
begin
  if exists (
    select 1 from public.venue_owner_reclaim_blocks
    where venue_id_snapshot = p_venue_id and blocked_user_id_snapshot = p_user_id and is_active = true
  ) then
    raise exception 'Você não pode concluir este cadastro. Fale com nossa equipe se precisar de ajuda.';
  end if;

  if exists (
    select 1 from public.venue_members vm
    where vm.venue_id = p_venue_id
      and vm.member_role = 'owner'
      and vm.is_active = true
      and vm.user_id <> p_user_id
  ) then
    raise exception 'Este estabelecimento já tem um proprietário ativo.';
  end if;
end;
$func$;

revoke all on function public._cevo_checks(uuid, uuid) from public;
revoke all on function public._cevo_checks(uuid, uuid) from anon;
revoke all on function public._cevo_checks(uuid, uuid) from authenticated;
