-- Bloco 10A — helper _cevo_guard(uuid, uuid)
-- Parte 1/10 do bloco 10 (dividido por limite de colagem do SQL Editor).
-- Idempotente. Trava + valida posse + status. 'completed' passa aqui; o
-- curto-circuito idempotente é decidido no bloco 10J (função principal).

create or replace function public._cevo_guard(
  p_claim_request_id uuid,
  p_user_id uuid
)
returns public.venue_claim_requests
language plpgsql
security definer
set search_path = ''
as $func$
declare
  v_request public.venue_claim_requests%rowtype;
begin
  select * into v_request from public.venue_claim_requests where id = p_claim_request_id for update;
  if not found then
    raise exception 'Solicitação não encontrada.';
  end if;

  if v_request.user_id <> p_user_id then
    raise exception 'Esta solicitação não pertence à sua conta.';
  end if;

  if v_request.status not in ('draft', 'submitted', 'rejected', 'completed') then
    raise exception 'Este cadastro não pode mais ser concluído (status atual: %).', v_request.status;
  end if;

  return v_request;
end;
$func$;

revoke all on function public._cevo_guard(uuid, uuid) from public;
revoke all on function public._cevo_guard(uuid, uuid) from anon;
revoke all on function public._cevo_guard(uuid, uuid) from authenticated;
