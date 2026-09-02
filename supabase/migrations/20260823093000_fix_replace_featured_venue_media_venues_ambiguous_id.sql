-- ============================================================================
-- Migration: fix_replace_featured_venue_media_venues_ambiguous_id
--
-- CAUSA REAL de o upload de vídeo (e capa) continuar falhando mesmo depois
-- de fix_ambiguous_columns_media_write_rpcs: aquela correção qualificou
-- todo acesso a venue_media dentro de replace_featured_venue_media(), mas
-- deixou passar DUAS linhas que também são ambíguas — o passo 4 (sincroniza
-- cover_image_url/video_url em public.venues):
--
--   update public.venues set cover_image_url = v_clean_url where id = p_venue_id;
--   update public.venues set video_url = v_clean_url where id = p_venue_id;
--
-- "id" sem qualificador aqui colide com o parâmetro de saída "id" desta
-- mesma função (RETURNS TABLE (id uuid, ...)) exatamente como acontecia com
-- venue_media — só que agora contra a coluna id de public.venues. Esse
-- passo só roda quando p_is_featured = true, que é o padrão de
-- upsertFeaturedVenueMedia() (src/lib/venues/venue-media.ts) sempre que o
-- 4º argumento (isFeatured) não é passado explicitamente como false — é
-- exatamente o caminho usado por SingleMediaSlot (venue-media-slots.tsx,
-- upload de vídeo/capa no onboarding) e por qualquer chamada de "capa"
-- (imagem sempre destacada). Retire_venue_media()/set_venue_media_featured()
-- (mesma auditoria anterior) já faziam isso certo, com alias "vn" — só
-- replace_featured_venue_media() ficou com essa linha sem qualificar.
--
-- Mesma assinatura, mesmos passos, mesma ordem, mesma lógica de negócio —
-- só a qualificação da tabela venues foi corrigida (alias "vn").
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

  perform pg_advisory_xact_lock(hashtext('venue_media_replace:' || p_venue_id::text)::bigint);

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

  if p_media_type = 'image' and p_is_featured then
    update public.venue_media vmed
    set is_active = false, retired_at = now()
    where vmed.venue_id = p_venue_id
      and vmed.media_type = 'image'
      and vmed.is_active = true
      and vmed.is_featured = true
      and vmed.id <> v_new_id;
  end if;

  if p_is_featured then
    update public.venue_media vmed
    set is_featured = true
    where vmed.id = v_new_id;
  end if;

  -- CORREÇÃO (esta migration): "where id = p_venue_id" sem qualificador era
  -- ambíguo contra o parâmetro de saída "id" — alias "vn" em venues, mesmo
  -- padrão já usado em retire_venue_media()/set_venue_media_featured().
  if p_is_featured then
    if p_media_type = 'image' then
      update public.venues vn set cover_image_url = v_clean_url where vn.id = p_venue_id;
    elsif p_media_type = 'video' then
      update public.venues vn set video_url = v_clean_url where vn.id = p_venue_id;
    end if;
  end if;

  return query
  select v.id, v.url, v.media_type, v.is_featured
  from public.venue_media v
  where v.id = v_new_id;
end;
$func$;

comment on function public.replace_featured_venue_media(uuid, text, text, boolean, text, text) is
  'Único caminho para o painel escrever a capa/vídeo em venue_media: exige owner/manager ativo ou admin, trava por advisory lock, insere/reativa a mídia nova com is_featured=false primeiro, só depois retira o destaque da capa anterior (só para imagem) e só então marca a nova como destacada, sincronizando cover_image_url/video_url na mesma transação. CORRIGIDO (2ª rodada): a sincronização de venues também usa alias qualificado (vn.id) — o "where id = p_venue_id" sem qualificador colidia com o parâmetro de saída "id", causando "column reference is ambiguous" (42702) sempre que p_is_featured=true (o padrão).';
