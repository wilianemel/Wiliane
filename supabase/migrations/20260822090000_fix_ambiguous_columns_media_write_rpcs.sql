-- ============================================================================
-- Migration: fix_ambiguous_columns_media_write_rpcs
--
-- CAUSA REAL do upload de capa/vídeo falhando sempre com a mensagem genérica
-- "Não foi possível registrar a mídia no banco de dados agora.": as funções
-- replace_featured_venue_media() e add_venue_gallery_media()
-- (20260818220256_simplify_existing_venue_onboarding.sql) têm colunas de
-- saída (RETURNS TABLE) chamadas id/url/media_type/is_featured — os MESMOS
-- nomes das colunas da tabela venue_media. Em PL/pgSQL, um identificador sem
-- qualificador que bate ao mesmo tempo com uma coluna e com uma variável
-- (RETURNS TABLE vira variável) é AMBÍGUO por padrão — Postgres recusa com
-- "column reference ... is ambiguous" (42702) antes de a lógica de negócio
-- rodar. Isso acontece na PRIMEIRA linha de cada função que usa esses nomes
-- sem qualificar, então TODA chamada falhava (capa e vídeo, sempre).
--
-- Mesma classe de bug já corrigida em retire_venue_media()/
-- set_venue_media_featured() nesta mesma migration (ver os comentários
-- "CORREÇÃO (investigação real...)" ali) — replace_featured_venue_media() e
-- add_venue_gallery_media() ficaram de fora daquela rodada e são corrigidas
-- agora com o mesmo padrão: todo acesso a venue_media dentro do corpo passa
-- a usar um alias explícito (vmed/v), nunca nome de coluna solto.
--
-- Nenhuma regra de negócio muda: mesma assinatura (CREATE OR REPLACE com os
-- mesmos parâmetros — GRANTs existentes continuam valendo, sem necessidade
-- de REVOKE/GRANT de novo), mesmos passos, mesma ordem, mesmas mensagens de
-- erro, mesmo soft delete, mesmo limite de vídeo/imagem por plano. Só a
-- qualificação de colunas foi corrigida.
-- ============================================================================

create or replace function public.replace_featured_venue_media(
  p_venue_id uuid,
  p_media_type text,
  p_url text,
  p_is_featured boolean default true,
  p_title text default null,
  p_thumbnail_url text default null
)
returns table (
  id uuid,
  url text,
  media_type text,
  is_featured boolean
)
language plpgsql
security definer
set search_path = ''
as $func$
declare
  v_user_id uuid;
  v_can_manage boolean;
  v_new_id uuid;
  v_clean_url text;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'É necessário estar autenticado.';
  end if;

  if p_media_type not in ('image', 'video') then
    raise exception 'Tipo de mídia inválido.';
  end if;

  v_clean_url := trim(coalesce(p_url, ''));
  if v_clean_url = '' then
    raise exception 'URL da mídia é obrigatória.';
  end if;

  select
    public.is_platform_admin()
    or exists (
      select 1 from public.venue_members vm
      where vm.venue_id = p_venue_id
        and vm.user_id = v_user_id
        and vm.member_role in ('owner', 'manager')
        and vm.is_active = true
    )
  into v_can_manage;

  if not v_can_manage then
    raise exception 'Você não tem permissão para gerenciar a mídia deste estabelecimento.';
  end if;

  -- Serializa trocas concorrentes de mídia pro mesmo venue — evita duas
  -- chamadas quase simultâneas disputando o mesmo slot de capa/vídeo ou
  -- colidindo no índice único parcial de imagem destacada.
  perform pg_advisory_xact_lock(hashtext('venue_media_replace:' || p_venue_id::text)::bigint);

  -- 1) Insere ou reativa a mídia NOVA primeiro, sempre com is_featured=false
  --    neste passo. CORREÇÃO: "returning id" sem qualificador era ambíguo
  --    (colide com o parâmetro de saída "id") — alias "vmed" no INSERT
  --    qualifica a coluna certa.
  insert into public.venue_media as vmed (venue_id, url, media_type, title, thumbnail_url, is_featured, is_active)
  values (p_venue_id, v_clean_url, p_media_type, p_title, p_thumbnail_url, false, true)
  on conflict (venue_id, url) do update set
    media_type = excluded.media_type,
    title = excluded.title,
    thumbnail_url = excluded.thumbnail_url,
    is_featured = false,
    is_active = true,
    retired_at = null
  returning vmed.id into v_new_id;

  -- 2) Só agora, com a mídia nova já confirmada, retira o destaque da capa
  --    anterior (só imagem — vídeo nunca retira outro aqui). CORREÇÃO:
  --    "media_type"/"is_featured"/"id" sem qualificador eram ambíguos —
  --    alias "vmed" em todo o corpo do UPDATE.
  if p_media_type = 'image' and p_is_featured then
    update public.venue_media vmed
    set is_active = false, retired_at = now()
    where vmed.venue_id = p_venue_id
      and vmed.media_type = 'image'
      and vmed.is_active = true
      and vmed.is_featured = true
      and vmed.id <> v_new_id;
  end if;

  -- 3) Só por último marca a mídia nova como destacada de fato. CORREÇÃO:
  --    "id" sem qualificador era ambíguo — alias "vmed".
  if p_is_featured then
    update public.venue_media vmed
    set is_featured = true
    where vmed.id = v_new_id;
  end if;

  -- 4) Sincroniza cover_image_url/video_url na MESMA transação.
  if p_is_featured then
    if p_media_type = 'image' then
      update public.venues set cover_image_url = v_clean_url where id = p_venue_id;
    elsif p_media_type = 'video' then
      update public.venues set video_url = v_clean_url where id = p_venue_id;
    end if;
  end if;

  return query
  select v.id, v.url, v.media_type, v.is_featured
  from public.venue_media v
  where v.id = v_new_id;
end;
$func$;

comment on function public.replace_featured_venue_media(uuid, text, text, boolean, text, text) is
  'Único caminho para o painel escrever a capa/vídeo em venue_media: exige owner/manager ativo ou admin, trava por advisory lock, insere/reativa a mídia nova com is_featured=false primeiro, só depois retira o destaque da capa anterior (só para imagem) e só então marca a nova como destacada, sincronizando cover_image_url/video_url na mesma transação. CORRIGIDO (causa real do upload sempre falhando): todo acesso a venue_media dentro do corpo agora usa alias qualificado — os nomes das colunas de saída (id/url/media_type/is_featured) colidiam sem qualificador com os nomes de coluna da própria tabela, causando "column reference is ambiguous" (42702) em toda chamada.';

-- Registra/reativa uma imagem de GALERIA em venue_media — mesma classe de
-- bug (RETURNS TABLE com id/url/media_type/is_featured, colidindo com as
-- colunas de venue_media sem qualificador), corrigida com o mesmo padrão.
create or replace function public.add_venue_gallery_media(
  p_venue_id uuid,
  p_url text,
  p_title text default null,
  p_thumbnail_url text default null
)
returns table (
  id uuid,
  url text,
  media_type text,
  is_featured boolean
)
language plpgsql
security definer
set search_path = ''
as $func$
declare
  v_user_id uuid;
  v_can_manage boolean;
  v_new_id uuid;
  v_clean_url text;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'É necessário estar autenticado.';
  end if;

  v_clean_url := trim(coalesce(p_url, ''));
  if v_clean_url = '' then
    raise exception 'URL da imagem é obrigatória.';
  end if;

  select
    public.is_platform_admin()
    or exists (
      select 1 from public.venue_members vm
      where vm.venue_id = p_venue_id
        and vm.user_id = v_user_id
        and vm.member_role in ('owner', 'manager')
        and vm.is_active = true
    )
  into v_can_manage;

  if not v_can_manage then
    raise exception 'Você não tem permissão para gerenciar a mídia deste estabelecimento.';
  end if;

  perform pg_advisory_xact_lock(hashtext('venue_media_gallery:' || p_venue_id::text)::bigint);

  -- CORREÇÃO: "url"/"is_featured" sem qualificador eram ambíguos — alias
  -- "vmed".
  if exists (
    select 1 from public.venue_media vmed
    where vmed.venue_id = p_venue_id
      and vmed.url = v_clean_url
      and vmed.is_active = true
      and vmed.is_featured = true
  ) then
    raise exception 'Esta imagem já é a capa atual do estabelecimento — gerencie pela capa, não pela galeria.';
  end if;

  -- CORREÇÃO: "returning id" sem qualificador era ambíguo — alias "vmed" no
  -- INSERT qualifica a coluna certa (e also usado no ON CONFLICT DO UPDATE
  -- em vez do nome completo public.venue_media.*, equivalente e mais
  -- consistente com o resto da função).
  insert into public.venue_media as vmed (venue_id, url, media_type, title, thumbnail_url, is_featured, is_active)
  values (p_venue_id, v_clean_url, 'image', p_title, p_thumbnail_url, false, true)
  on conflict (venue_id, url) do update set
    title = coalesce(excluded.title, vmed.title),
    thumbnail_url = coalesce(excluded.thumbnail_url, vmed.thumbnail_url),
    is_featured = false,
    is_active = true,
    retired_at = null
  returning vmed.id into v_new_id;

  return query
  select v.id, v.url, v.media_type, v.is_featured
  from public.venue_media v
  where v.id = v_new_id;
end;
$func$;

comment on function public.add_venue_gallery_media(uuid, text, text, text) is
  'Registra/reativa uma imagem de galeria (sempre is_featured=false, inclusive na reativação via ON CONFLICT) em venue_media. Recusa se a URL já é a capa ativa do venue. CORRIGIDO: mesma causa de "column reference is ambiguous" (42702) de replace_featured_venue_media — alias qualificado em todo o corpo.';
