-- 030_add_venue_verification.sql
-- NAO APLICADA - escrita em disco para revisao. Nao foi executada no
-- Supabase. Aguardando autorizacao explicita antes de qualquer aplicacao.

alter table public.venues
  add column if not exists is_verified boolean not null default false,
  add column if not exists verified_at timestamptz;

revoke update (is_verified, verified_at) on public.venues from authenticated;
revoke update (is_verified, verified_at) on public.venues from anon;

create or replace function public.set_venue_verified_status(
  target_venue_id uuid,
  p_verified boolean
)
returns table (
  venue_id uuid,
  is_verified boolean,
  verified_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_exists boolean;
begin
  if not public.is_platform_admin() then
    raise exception 'Acesso negado: apenas administradores podem alterar o selo de verificação.';
  end if;

  select exists (select 1 from public.venues where id = target_venue_id) into v_exists;

  if not v_exists then
    raise exception 'Estabelecimento não encontrado.';
  end if;

  update public.venues
  set
    is_verified = p_verified,
    verified_at = case when p_verified then now() else null end
  where id = target_venue_id;

  return query
  select v.id, v.is_verified, v.verified_at
  from public.venues v
  where v.id = target_venue_id;
end;
$$;

revoke execute on function public.set_venue_verified_status(uuid, boolean) from public;
revoke execute on function public.set_venue_verified_status(uuid, boolean) from anon;
grant execute on function public.set_venue_verified_status(uuid, boolean) to authenticated;
