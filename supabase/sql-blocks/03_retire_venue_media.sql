-- Bloco 03 — retire_venue_media(uuid)
-- Idempotente: CREATE OR REPLACE substitui a definição sem apagar dados.
-- Nunca faz DELETE físico — só soft delete (is_active = false).
-- CORREÇÃO real do 42P01: "id" sem qualificador é ambíguo em QUALQUER
-- tabela referenciada (venue_media OU venues, as duas têm coluna id),
-- porque colide com o parâmetro de saída "id" desta função RETURNS TABLE.
-- Qualificado com alias em todo o corpo.

create or replace function public.retire_venue_media(p_media_id uuid)
returns table (
  id uuid,
  is_active boolean
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
  from public.venue_media vmed where vmed.id = p_media_id;

  if v_venue_id is null then
    raise exception 'Mídia não encontrada.';
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

  update public.venue_media vmed
  set is_active = false, retired_at = now()
  where vmed.id = p_media_id;

  if v_media_type = 'image' then
    update public.venues vn set cover_image_url = null where vn.id = v_venue_id and vn.cover_image_url = v_url;
  elsif v_media_type = 'video' then
    update public.venues vn set video_url = null where vn.id = v_venue_id and vn.video_url = v_url;
  end if;

  return query select p_media_id, false;
end;
$func$;

comment on function public.retire_venue_media(uuid) is
  'Soft delete de uma linha de venue_media (is_active=false) — nunca DELETE físico. Owner/manager ativo do venue ou admin. Limpa cover_image_url/video_url na mesma transação se a mídia retirada era a referenciada lá.';

revoke all on function public.retire_venue_media(uuid) from public;
revoke all on function public.retire_venue_media(uuid) from anon;
grant execute on function public.retire_venue_media(uuid) to authenticated;
