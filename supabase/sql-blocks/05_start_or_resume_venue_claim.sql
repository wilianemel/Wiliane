-- Bloco 05 — start_or_resume_venue_claim(uuid, text, text)
-- Idempotente: CREATE OR REPLACE substitui a definição sem apagar dados.
-- CORREÇÃO real do 42P01: colunas sem qualificador de venue_claim_requests
-- (status/venue_id/user_id/created_at) e "claim_request_id" numa segunda
-- consulta ficavam ambíguas contra os parâmetros de saída de RETURNS
-- TABLE (claim_request_id, draft_id, status). Qualificado com cr./vcd. e
-- os dois "RETURN QUERY SELECT" com expressões escalares soltas trocados
-- por atribuição direta aos parâmetros de saída + RETURN NEXT.

create or replace function public.start_or_resume_venue_claim(
  p_venue_id uuid,
  p_requester_name text default null,
  p_requester_email text default null
)
returns table (
  claim_request_id uuid,
  draft_id uuid,
  status text
)
language plpgsql
security definer
set search_path = ''
as $func$
declare
  v_user_id uuid;
  v_auth_email text;
  v_venue_exists boolean;
  v_has_active_owner boolean;
  v_existing public.venue_claim_requests%rowtype;
  v_draft_id uuid;
  v_new_request_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'É necessário estar autenticado para reivindicar um estabelecimento.';
  end if;

  -- E-mail sempre de auth.users via auth.uid() — nunca do p_requester_email
  -- enviado pelo cliente (aceito só por compatibilidade de assinatura).
  select email into v_auth_email from auth.users where id = v_user_id;

  select exists (select 1 from public.venues where id = p_venue_id) into v_venue_exists;
  if not v_venue_exists then
    raise exception 'Estabelecimento não encontrado.';
  end if;

  -- Serializa qualquer chamada concorrente para este venue_id.
  perform pg_advisory_xact_lock(hashtext('venue_claim:' || p_venue_id::text)::bigint);

  select exists (
    select 1 from public.venue_members
    where venue_id = p_venue_id and is_active = true
  ) into v_has_active_owner;

  if v_has_active_owner then
    raise exception 'Este estabelecimento já tem um proprietário ativo.';
  end if;

  -- Usuário removido por um admin não pode reivindicar de novo — só um
  -- admin libera, via admin_release_venue_owner_block(). Filtra pelos
  -- snapshots (identidade permanente, not null).
  if exists (
    select 1 from public.venue_owner_reclaim_blocks
    where venue_id_snapshot = p_venue_id and blocked_user_id_snapshot = v_user_id and is_active = true
  ) then
    raise exception 'Você não pode reivindicar este estabelecimento novamente. Fale com nossa equipe se precisar de ajuda.';
  end if;

  -- draft/submitted bloqueiam outra conta; 'rejected' legado só é retomado
  -- se for do PRÓPRIO usuário (nunca bloqueia ninguém).
  select cr.*
  into v_existing
  from public.venue_claim_requests cr
  where cr.venue_id = p_venue_id
    and (
      cr.status in ('draft', 'submitted')
      or (cr.status = 'rejected' and cr.user_id = v_user_id)
    )
  order by case when cr.status in ('draft', 'submitted') then 0 else 1 end, cr.created_at desc
  limit 1;

  if found then
    if v_existing.status in ('draft', 'submitted') and v_existing.user_id <> v_user_id then
      raise exception 'Este estabelecimento já está em processo de atualização por outra conta.';
    end if;

    select vcd.id into v_draft_id
    from public.venue_claim_drafts vcd
    where vcd.claim_request_id = v_existing.id;

    if v_draft_id is null then
      insert into public.venue_claim_drafts (claim_request_id, venue_id, user_id, venue_data, business_hours)
      values (
        v_existing.id,
        p_venue_id,
        v_user_id,
        public._venue_claim_editable_fields_snapshot(p_venue_id),
        public._venue_claim_business_hours_snapshot(p_venue_id)
      )
      returning id into v_draft_id;
    end if;

    -- Mantém o e-mail em dia com auth.users mesmo ao só retomar.
    update public.venue_claim_requests
    set requester_email = coalesce(v_auth_email, requester_email)
    where id = v_existing.id;

    claim_request_id := v_existing.id;
    draft_id := v_draft_id;
    status := v_existing.status;
    return next;
    return;
  end if;

  insert into public.venue_claim_requests
    (venue_id, user_id, status, source, requester_name, requester_email)
  values (
    p_venue_id, v_user_id, 'draft', 'claim_flow',
    nullif(trim(coalesce(p_requester_name, '')), ''),
    v_auth_email
  )
  returning id into v_new_request_id;

  insert into public.venue_claim_drafts (claim_request_id, venue_id, user_id, venue_data, business_hours)
  values (
    v_new_request_id,
    p_venue_id,
    v_user_id,
    public._venue_claim_editable_fields_snapshot(p_venue_id),
    public._venue_claim_business_hours_snapshot(p_venue_id)
  )
  returning id into v_draft_id;

  claim_request_id := v_new_request_id;
  draft_id := v_draft_id;
  status := 'draft'::text;
  return next;
  return;
end;
$func$;

comment on function public.start_or_resume_venue_claim(uuid, text, text) is
  'Cria ou retoma, de forma idempotente, o processo de reivindicação do usuário autenticado para um estabelecimento — clique duplo, duas abas ou atualizar a página sempre retomam a mesma linha (nunca dependem de estado React). Nunca aceita user_id externo — auth.uid() é a única fonte de identidade. E-mail sempre de auth.users (nunca de user_metadata/p_requester_email do cliente); p_requester_name é só um snapshot de exibição, preenchido pelo cliente a partir da própria sessão, nunca usado para autorização. Bloqueia com mensagem amigável se outro usuário já tem processo ativo para o mesmo venue. Serializado por advisory lock + reforçado pelo índice único parcial de solicitação ativa por venue.';

revoke all on function public.start_or_resume_venue_claim(uuid, text, text) from public;
revoke all on function public.start_or_resume_venue_claim(uuid, text, text) from anon;
grant execute on function public.start_or_resume_venue_claim(uuid, text, text) to authenticated;
