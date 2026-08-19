-- Bloco 04 — set_venue_media_featured(uuid, boolean)
-- Idempotente: CREATE OR REPLACE substitui a definição sem apagar dados.
-- CORREÇÃO real do 42P01: "id"/"is_featured" sem qualificador colidem com
-- os parâmetros de saída (id, is_featured) desta função RETURNS TABLE.
-- Qualificado com alias em todo o corpo.

create or replace function public.set_venue_media_featured(p_media_id uuid, p_featured boolean)
returns table (
  id uuid,
  is_featured boolean
)
language plpgsql
security definer
set search_path = ''
as $func$
declare
  v_user_id uuid;
  v_venue_id uuid;
  v_media_type text;
  v_url text;
  v_can_manage boolean;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'É necessário estar autenticado.';
  end if;

  select vmed.venue_id, vmed.media_type, vmed.url into v_venue_id, v_media_type, v_url
  from public.venue_media vmed where vmed.id = p_media_id and vmed.is_active = true;

  if v_venue_id is null then
    raise exception 'Mídia não encontrada ou não está ativa.';
  end if;

  select
    public.is_platform_admin()
    or exists (
      select 1 from public.venue_members vm
      where vm.venue_id = v_venue_id
        and vm.user_id = v_user_id
        and vm.member_role in ('owner', 'manager')
        and vm.is_active = true
    )
  into v_can_manage;

  if not v_can_manage then
    raise exception 'Você não tem permissão para gerenciar a mídia deste estabelecimento.';
  end if;

  perform pg_advisory_xact_lock(hashtext('venue_media_replace:' || v_venue_id::text)::bigint);

  -- Imagem: desmarca (nunca desativa) a anterior antes de marcar a nova —
  -- clear-then-set nunca deixa duas linhas destacadas+ativas ao mesmo
  -- tempo. Vídeo: nunca mexe em outro (vários podem estar destacados).
  if v_media_type = 'image' and p_featured then
    update public.venue_media vmed
    set is_featured = false
    where vmed.venue_id = v_venue_id
      and vmed.media_type = 'image'
      and vmed.is_active = true
      and vmed.is_featured = true
      and vmed.id <> p_media_id;
  end if;

  update public.venue_media vmed
  set is_featured = p_featured
  where vmed.id = p_media_id;

  -- Sincroniza cover_image_url/video_url na mesma transação.
  if v_media_type = 'image' then
    if p_featured then
      update public.venues vn set cover_image_url = v_url where vn.id = v_venue_id;
    else
      update public.venues vn set cover_image_url = null where vn.id = v_venue_id and vn.cover_image_url = v_url;
    end if;
  elsif v_media_type = 'video' then
    if p_featured then
      update public.venues vn set video_url = v_url where vn.id = v_venue_id;
    else
      update public.venues vn set video_url = null where vn.id = v_venue_id and vn.video_url = v_url;
    end if;
  end if;

  return query select p_media_id, p_featured;
end;
$func$;

comment on function public.set_venue_media_featured(uuid, boolean) is
  'Destaca/remove destaque de uma mídia ativa. Imagem: só uma capa ativa por vez (desmarca a anterior, sem desativá-la — continua na galeria). Vídeo: nunca mexe em outro vídeo — vários podem estar destacados ao mesmo tempo (plano partner). Sincroniza cover_image_url/video_url na mesma transação.';

revoke all on function public.set_venue_media_featured(uuid, boolean) from public;
revoke all on function public.set_venue_media_featured(uuid, boolean) from anon;
grant execute on function public.set_venue_media_featured(uuid, boolean) to authenticated;
