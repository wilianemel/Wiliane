-- Corrige a RPC da galeria: os nomes de saída (id/url/media_type/is_featured)
-- não podem ser confundidos com colunas de venue_media dentro da função.
-- Sem os aliases, o Postgres interrompe o envio com o erro 42702.

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

  if exists (
    select 1 from public.venue_media vmed
    where vmed.venue_id = p_venue_id
      and vmed.url = v_clean_url
      and vmed.is_active = true
      and vmed.is_featured = true
  ) then
    raise exception 'Esta imagem já é a capa atual do estabelecimento — gerencie pela capa, não pela galeria.';
  end if;

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

revoke all on function public.add_venue_gallery_media(uuid, text, text, text) from public;
revoke all on function public.add_venue_gallery_media(uuid, text, text, text) from anon;
grant execute on function public.add_venue_gallery_media(uuid, text, text, text) to authenticated;
