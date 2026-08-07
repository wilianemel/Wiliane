-- 014_create_publish_owned_venue.sql
-- NÃO APLICADA — aguardando autorização explícita antes de qualquer
-- execução no Supabase.
--
-- ============================================================================
-- Função: public.publish_owned_venue(target_venue_id uuid)
-- ============================================================================
-- Único caminho para um estabelecimento virar is_published = true. Não cria
-- tabela nem coluna nova, não altera nenhuma policy existente, não altera
-- nenhuma migration anterior.
--
-- Segurança:
-- - security definer + search_path fixo (set search_path = public), mesmo
--   padrão de todas as outras funções do projeto (create_owned_venue,
--   submit_venue_business_registration etc.).
-- - Nunca aceita is_published como parâmetro — o UPDATE sempre fixa
--   is_published = true internamente, nunca a partir de entrada do cliente.
-- - Nunca aceita user_id como parâmetro — usa auth.uid() internamente.
-- - Reaproveita public.can_manage_venue_registration(), já existente desde
--   007/009 — nenhuma lógica de permissão nova é inventada aqui.
-- - Depende de 011_allow_owner_select_update_venues.sql já ter revogado
--   update (is_published, ...) de authenticated/anon: esta função passa a
--   ser o único jeito de publicar um venue via API.
--
-- Pré-requisito de ordem: como o UPDATE abaixo passa pelo trigger de
-- 008_enforce_venue_publish_requires_business.sql enquanto ele existir,
-- esta função só publica de fato depois que
-- 013_remove_venue_publish_business_gate.sql também for aplicada. A função
-- é criada normalmente de qualquer forma (isso é DDL, não depende do
-- trigger) — só o comportamento em tempo de execução depende da ordem.

create or replace function public.publish_owned_venue(target_venue_id uuid)
returns table (
  venue_id uuid,
  is_published boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_venue public.venues%rowtype;
  v_has_gallery_media boolean;
begin
  -- Nunca aceita user_id como parâmetro — a única fonte de identidade é a
  -- sessão autenticada de quem está chamando a função.
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'É necessário estar autenticado para publicar um estabelecimento.';
  end if;

  if not public.can_manage_venue_registration(target_venue_id) then
    raise exception 'Você não possui permissão para publicar este estabelecimento.';
  end if;

  select * into v_venue from public.venues where id = target_venue_id;

  if not found then
    raise exception 'Estabelecimento não encontrado.';
  end if;

  if trim(coalesce(v_venue.name, '')) = '' then
    raise exception 'O nome do estabelecimento é obrigatório para publicar.';
  end if;

  if trim(coalesce(v_venue.description, '')) = '' then
    raise exception 'A descrição do estabelecimento é obrigatória para publicar.';
  end if;

  if trim(coalesce(v_venue.category, '')) = '' then
    raise exception 'A categoria do estabelecimento é obrigatória para publicar.';
  end if;

  if v_venue.atmospheres is null or array_length(v_venue.atmospheres, 1) is null then
    raise exception 'Escolha pelo menos um ambiente (atmosphere) antes de publicar.';
  end if;

  -- Capa OU pelo menos uma imagem na galeria (<venue_id>/gallery/... no
  -- bucket venue-media) — checado direto contra storage.objects, mesma
  -- convenção de pasta já usada nas policies de storage da 010.
  select exists (
    select 1
    from storage.objects so
    where so.bucket_id = 'venue-media'
      and (storage.foldername(so.name))[1] = target_venue_id::text
      and (storage.foldername(so.name))[2] = 'gallery'
  )
  into v_has_gallery_media;

  if v_venue.cover_image_url is null and not v_has_gallery_media then
    raise exception 'Adicione uma imagem de capa ou pelo menos uma foto na galeria antes de publicar.';
  end if;

  update public.venues
  set is_published = true,
      updated_at = now()
  where id = target_venue_id;

  return query
  select target_venue_id, true;
end;
$$;

comment on function public.publish_owned_venue(uuid) is
  'Único caminho para marcar um venue como is_published = true. Valida nome, descrição, categoria, pelo menos um atmosphere e pelo menos uma imagem (capa ou galeria) antes de publicar. Nunca aceita is_published como parâmetro; nunca aceita user_id externo, usa auth.uid() internamente.';

revoke all on function public.publish_owned_venue(uuid) from public;
revoke all on function public.publish_owned_venue(uuid) from anon;
grant execute on function public.publish_owned_venue(uuid) to authenticated;

-- ============================================================================
-- ROLLBACK MANUAL (NÃO executar automaticamente).
-- ============================================================================
--
-- drop function if exists public.publish_owned_venue(uuid);
