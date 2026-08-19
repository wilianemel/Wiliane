-- Bloco 09 — reject_venue_claim(uuid, text)
-- Idempotente: CREATE OR REPLACE substitui a definição sem apagar dados.
-- Fluxo administrativo descontinuado, sem uso pelo frontend — mantida só
-- como caminho histórico/de emergência. Nunca apaga nada — só marca
-- rejected com o motivo, preservando rascunho e mídia intactos. Já estava
-- correta (nenhuma coluna colide com claim_request_id/status); incluída
-- aqui só para fechar a auditoria completa das 14 funções RETURNS TABLE.

create or replace function public.reject_venue_claim(p_claim_request_id uuid, p_reason text default null)
returns table (
  claim_request_id uuid,
  status text
)
language plpgsql
security definer
set search_path = ''
as $func$
declare
  v_request public.venue_claim_requests%rowtype;
begin
  if not public.is_platform_admin() then
    raise exception 'Acesso negado: apenas administradores podem recusar publicação.';
  end if;

  select * into v_request
  from public.venue_claim_requests
  where id = p_claim_request_id
  for update;

  if not found then
    raise exception 'Solicitação não encontrada.';
  end if;

  if v_request.status <> 'submitted' then
    raise exception 'Esta solicitação não está aguardando aprovação.';
  end if;

  update public.venue_claim_requests
  set status = 'rejected',
      reject_reason = nullif(trim(coalesce(p_reason, '')), ''),
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      updated_at = now()
  where id = p_claim_request_id;

  return query select p_claim_request_id, 'rejected'::text;
end;
$func$;

comment on function public.reject_venue_claim(uuid, text) is
  'Fluxo administrativo descontinuado, sem uso pelo frontend — mantida só como caminho histórico/de emergência. Recusa uma solicitação enviada para aprovação — nunca apaga conta, rascunho, mídia ou dados.';

revoke all on function public.reject_venue_claim(uuid, text) from public;
revoke all on function public.reject_venue_claim(uuid, text) from anon;
grant execute on function public.reject_venue_claim(uuid, text) to authenticated;
