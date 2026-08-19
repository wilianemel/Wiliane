-- Bloco 07 — submit_venue_claim_draft(uuid)
-- Idempotente: CREATE OR REPLACE substitui a definição sem apagar dados.
-- Fluxo administrativo descontinuado — sem uso pelo frontend, EXECUTE
-- revogado de authenticated no final (mantida só como registro histórico).
-- CORREÇÃO real do 42P01: "claim_request_id" sem qualificador é ambíguo —
-- colide com o parâmetro de saída claim_request_id desta própria função.

create or replace function public.submit_venue_claim_draft(p_claim_request_id uuid)
returns table (
  claim_request_id uuid,
  status text
)
language plpgsql
security definer
set search_path = ''
as $func$
declare
  v_user_id uuid;
  v_request public.venue_claim_requests%rowtype;
  v_draft public.venue_claim_drafts%rowtype;
  v_has_media boolean;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'É necessário estar autenticado.';
  end if;

  select * into v_request from public.venue_claim_requests where id = p_claim_request_id;
  if not found then
    raise exception 'Solicitação não encontrada.';
  end if;

  if v_request.user_id <> v_user_id then
    raise exception 'Você não tem permissão para enviar este cadastro.';
  end if;

  if v_request.status not in ('draft', 'rejected') then
    raise exception 'Este cadastro já foi enviado ou já foi processado.';
  end if;

  select vcd.* into v_draft from public.venue_claim_drafts vcd where vcd.claim_request_id = p_claim_request_id;
  if not found then
    raise exception 'Rascunho não encontrado.';
  end if;

  if trim(coalesce(v_draft.venue_data->>'name', '')) = '' then
    raise exception 'O nome do estabelecimento é obrigatório.';
  end if;
  if trim(coalesce(v_draft.venue_data->>'description', '')) = '' then
    raise exception 'A descrição é obrigatória.';
  end if;
  if trim(coalesce(v_draft.venue_data->>'category', '')) = '' then
    raise exception 'A categoria é obrigatória.';
  end if;
  if jsonb_array_length(coalesce(v_draft.venue_data->'atmospheres', '[]'::jsonb)) = 0 then
    raise exception 'Escolha pelo menos um ambiente antes de enviar para aprovação.';
  end if;

  -- Pelo menos uma imagem ATIVA — vídeo sozinho não é suficiente.
  select exists (
    select 1 from public.venue_claim_draft_media
    where draft_id = v_draft.id and media_type = 'image' and is_active = true
  ) into v_has_media;

  if not v_has_media then
    raise exception 'Adicione ao menos uma imagem ativa (vídeo sozinho não é suficiente) antes de enviar para aprovação.';
  end if;

  update public.venue_claim_requests
  set status = 'submitted',
      reject_reason = null,
      updated_at = now()
  where id = p_claim_request_id;

  return query select p_claim_request_id, 'submitted'::text;
end;
$func$;

comment on function public.submit_venue_claim_draft(uuid) is
  'Fluxo administrativo descontinuado — o frontend não chama mais esta função, e authenticated não tem mais EXECUTE (revogado abaixo). Definição mantida intacta só como registro histórico; ninguém, nem admin, consegue mais chamá-la via RPC.';

revoke all on function public.submit_venue_claim_draft(uuid) from public;
revoke all on function public.submit_venue_claim_draft(uuid) from anon;
revoke all on function public.submit_venue_claim_draft(uuid) from authenticated;
