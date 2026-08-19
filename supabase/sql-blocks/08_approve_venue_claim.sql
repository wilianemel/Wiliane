-- Bloco 08 — approve_venue_claim(uuid)
-- Idempotente: CREATE OR REPLACE substitui a definição sem apagar dados.
-- Caminho administrativo histórico/de emergência, sem uso pelo frontend
-- (complete_existing_venue_onboarding substitui para o caminho novo).
-- Já estava correta (todas as colunas qualificadas via v_request./v_draft.);
-- incluída aqui só para fechar a auditoria completa das 14 funções
-- RETURNS TABLE.

create or replace function public.approve_venue_claim(p_claim_request_id uuid)
returns table (
  venue_id uuid,
  status text
)
language plpgsql
security definer
set search_path = ''
as $func$
declare
  v_request public.venue_claim_requests%rowtype;
  v_draft public.venue_claim_drafts%rowtype;
  v_has_active_image boolean;
begin
  if not public.is_platform_admin() then
    raise exception 'Acesso negado: apenas administradores podem autorizar publicação.';
  end if;

  -- Bloqueia a SOLICITAÇÃO durante a decisão — impede duas chamadas
  -- concorrentes de processarem a mesma solicitação em paralelo.
  select * into v_request
  from public.venue_claim_requests
  where id = p_claim_request_id
  for update;

  if not found then
    raise exception 'Solicitação não encontrada.';
  end if;

  if v_request.status = 'approved' then
    return query select v_request.venue_id, 'approved'::text;
    return;
  end if;

  if v_request.status <> 'submitted' then
    raise exception 'Esta solicitação não está aguardando aprovação.';
  end if;

  select * into v_draft from public.venue_claim_drafts where claim_request_id = p_claim_request_id;
  if not found then
    raise exception 'Rascunho não encontrado para esta solicitação.';
  end if;

  -- Bloqueia o VENUE também — defesa em profundidade, sem custo.
  perform 1 from public.venues where id = v_draft.venue_id for update;

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
    raise exception 'Escolha pelo menos um ambiente antes de aprovar.';
  end if;

  -- Pelo menos uma imagem ATIVA — vídeo sozinho nunca satisfaz o requisito.
  select exists (
    select 1 from public.venue_claim_draft_media
    where draft_id = v_draft.id and media_type = 'image' and is_active = true
  ) into v_has_active_image;

  if not v_has_active_image then
    raise exception 'É necessário pelo menos uma imagem ativa (vídeo sozinho não é suficiente) antes de aprovar.';
  end if;

  -- Passos 1/2/4/4b chamam os mesmos helpers de SEÇÃO 5 reaproveitados por
  -- complete_existing_venue_onboarding — comportamento não muda em nada.
  perform public._apply_venue_claim_fields_to_venue(v_draft.venue_id, v_draft.venue_data);
  perform public._apply_venue_claim_hours_to_venue(v_draft.venue_id, v_draft.business_hours);
  perform public._ensure_venue_plan(v_draft.venue_id);
  perform public._consolidate_venue_claim_media(v_draft.id, v_draft.venue_id);
  perform public.admin_link_venue_owner(v_draft.venue_id, v_request.user_id);

  update public.venue_claim_requests
  set status = 'approved',
      reviewed_by = auth.uid(),
      reject_reason = null,
      reviewed_at = now(),
      updated_at = now()
  where id = p_claim_request_id;

  return query select v_draft.venue_id, 'approved'::text;
end;
$func$;

comment on function public.approve_venue_claim(uuid) is
  'Caminho administrativo histórico/de emergência para aprovar uma solicitação — sem uso pelo frontend, que agora publica automaticamente via complete_existing_venue_onboarding(). Confirma admin, bloqueia solicitação e venue durante a decisão, revalida campos obrigatórios e ao menos uma imagem ativa, aplica os dados do rascunho ao venue real, mescla horários sem apagar os existentes, garante um plano ativo (idempotente), consolida mídia sem duplicar, vincula o owner e publica. Transacional e idempotente.';

revoke all on function public.approve_venue_claim(uuid) from public;
revoke all on function public.approve_venue_claim(uuid) from anon;
grant execute on function public.approve_venue_claim(uuid) to authenticated;
