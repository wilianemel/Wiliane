-- Bloco 02 — set_venue_claim_draft_media_featured(uuid, boolean)
-- Idempotente: CREATE OR REPLACE substitui a definição sem apagar dados.
-- CORREÇÃO real do 42P01: esta função nunca tinha sido tocada por nenhuma
-- correção anterior — "id"/"is_featured" sem qualificador nos dois UPDATE
-- colidem com os parâmetros de saída (id, is_featured) desta própria
-- função RETURNS TABLE. Qualificado com o alias vcdm.

create or replace function public.set_venue_claim_draft_media_featured(p_media_id uuid, p_featured boolean)
returns table (
  id uuid,
  is_featured boolean
)
language plpgsql
security definer
set search_path = ''
as $func$
declare
  v_draft_id uuid;
  v_media_type text;
begin
  if auth.uid() is null then
    raise exception 'É necessário estar autenticado.';
  end if;

  select m.draft_id, m.media_type into v_draft_id, v_media_type
  from public.venue_claim_draft_media m
  where m.id = p_media_id and m.is_active = true;

  if v_draft_id is null then
    raise exception 'Mídia não encontrada ou não está ativa.';
  end if;

  if not public._claim_draft_media_owned_and_editable(v_draft_id) then
    raise exception 'Você não tem permissão para editar esta mídia, ou o cadastro não está mais editável.';
  end if;

  perform pg_advisory_xact_lock(hashtext('claim_draft_media_featured:' || v_draft_id::text)::bigint);

  if v_media_type = 'image' and p_featured then
    update public.venue_claim_draft_media vcdm
    set is_featured = false
    where vcdm.draft_id = v_draft_id
      and vcdm.media_type = 'image'
      and vcdm.is_active = true
      and vcdm.is_featured = true
      and vcdm.id <> p_media_id;
  end if;

  update public.venue_claim_draft_media vcdm
  set is_featured = p_featured
  where vcdm.id = p_media_id;

  return query select p_media_id, p_featured;
end;
$func$;

comment on function public.set_venue_claim_draft_media_featured(uuid, boolean) is
  'Destaca/remove destaque de uma mídia do rascunho numa única transação — imagem só desmarca a anterior (nunca desativa), vídeo nunca mexe em outro. Só o dono do rascunho, só enquanto editável (draft/submitted/rejected).';

revoke all on function public.set_venue_claim_draft_media_featured(uuid, boolean) from public;
revoke all on function public.set_venue_claim_draft_media_featured(uuid, boolean) from anon;
grant execute on function public.set_venue_claim_draft_media_featured(uuid, boolean) to authenticated;
