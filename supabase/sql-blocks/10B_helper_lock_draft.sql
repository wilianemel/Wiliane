-- Bloco 10B — helper _cevo_lock_draft(uuid, uuid)
-- Parte 2/10 do bloco 10. Idempotente.
-- Serializa por venue_id (advisory lock), trava o venue e o rascunho —
-- mesma lógica exata de antes, sem mudança de comportamento.

create or replace function public._cevo_lock_draft(
  p_claim_request_id uuid,
  p_venue_id uuid
)
returns public.venue_claim_drafts
language plpgsql
security definer
set search_path = ''
as $func$
declare
  v_draft public.venue_claim_drafts%rowtype;
begin
  perform pg_advisory_xact_lock(hashtext('venue_claim_complete:' || p_venue_id::text)::bigint);
  perform 1 from public.venues where id = p_venue_id for update;

  select * into v_draft from public.venue_claim_drafts where claim_request_id = p_claim_request_id for update;
  if not found then
    raise exception 'Rascunho não encontrado para esta solicitação.';
  end if;

  return v_draft;
end;
$func$;

revoke all on function public._cevo_lock_draft(uuid, uuid) from public;
revoke all on function public._cevo_lock_draft(uuid, uuid) from anon;
revoke all on function public._cevo_lock_draft(uuid, uuid) from authenticated;
