-- Bloco 06 — save_venue_claim_draft(uuid, jsonb, jsonb)
-- Idempotente: CREATE OR REPLACE substitui a definição sem apagar dados.
-- Já estava correta (draft_id/updated_at sempre via variável local ou
-- qualificados com o nome da própria tabela-alvo no RETURNING); incluída
-- aqui só para fechar a auditoria completa das 14 funções RETURNS TABLE.
-- Nunca altera public.venues. Whitelist explícita de campos.

create or replace function public.save_venue_claim_draft(
  p_claim_request_id uuid,
  p_venue_data jsonb,
  p_business_hours jsonb
)
returns table (
  draft_id uuid,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $func$
declare
  v_user_id uuid;
  v_request public.venue_claim_requests%rowtype;
  v_clean_data jsonb;
  v_draft_id uuid;
  v_updated_at timestamptz;
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
    raise exception 'Você não tem permissão para editar este rascunho.';
  end if;

  -- 'submitted' também é editável — não existe mais aprovação manual que
  -- o trave, e o frontend permite retomar/editar rascunhos nesse status.
  if v_request.status not in ('draft', 'submitted', 'rejected') then
    raise exception 'Este cadastro não pode mais ser editado no momento.';
  end if;

  v_clean_data := jsonb_build_object(
    'name', p_venue_data->>'name',
    'category', p_venue_data->>'category',
    'description', p_venue_data->>'description',
    'city', p_venue_data->>'city',
    'neighborhood', p_venue_data->>'neighborhood',
    'address', p_venue_data->>'address',
    'cuisine_types', coalesce(p_venue_data->'cuisine_types', '[]'::jsonb),
    'tags', coalesce(p_venue_data->'tags', '[]'::jsonb),
    'music_styles', coalesce(p_venue_data->'music_styles', '[]'::jsonb),
    'atmospheres', coalesce(p_venue_data->'atmospheres', '[]'::jsonb),
    'intentions', coalesce(p_venue_data->'intentions', '[]'::jsonb),
    'companions', coalesce(p_venue_data->'companions', '[]'::jsonb),
    'menu_highlights', coalesce(p_venue_data->'menu_highlights', '[]'::jsonb),
    'schedule', coalesce(p_venue_data->'schedule', '[]'::jsonb),
    'price_range', p_venue_data->>'price_range',
    'average_price_per_person', nullif(p_venue_data->>'average_price_per_person', '')::numeric,
    'average_price_for_couple', nullif(p_venue_data->>'average_price_for_couple', '')::numeric,
    'whatsapp_number', p_venue_data->>'whatsapp_number',
    'whatsapp', p_venue_data->>'whatsapp',
    'whatsapp_url', p_venue_data->>'whatsapp_url',
    'instagram_url', p_venue_data->>'instagram_url',
    'website', p_venue_data->>'website',
    'menu_url', p_venue_data->>'menu_url',
    'reservation_url', p_venue_data->>'reservation_url'
  );

  update public.venue_claim_drafts
  set venue_data = v_clean_data,
      business_hours = coalesce(p_business_hours, '[]'::jsonb),
      updated_at = now()
  where claim_request_id = p_claim_request_id
  returning id, venue_claim_drafts.updated_at into v_draft_id, v_updated_at;

  if v_draft_id is null then
    raise exception 'Rascunho não encontrado.';
  end if;

  draft_id := v_draft_id;
  updated_at := v_updated_at;
  return next;
  return;
end;
$func$;

comment on function public.save_venue_claim_draft(uuid, jsonb, jsonb) is
  'Salva o preenchimento do rascunho do próprio usuário — nunca altera public.venues. Whitelist explícita de campos, sempre os mesmos de EDITABLE_VENUE_FIELDS (venue-owner.ts). Só funciona enquanto a solicitação está em draft, submitted ou rejected.';

revoke all on function public.save_venue_claim_draft(uuid, jsonb, jsonb) from public;
revoke all on function public.save_venue_claim_draft(uuid, jsonb, jsonb) from anon;
grant execute on function public.save_venue_claim_draft(uuid, jsonb, jsonb) to authenticated;
