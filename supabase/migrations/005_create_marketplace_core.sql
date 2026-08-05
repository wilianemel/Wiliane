-- 005_create_marketplace_core.sql
-- Base do marketplace: vínculo usuário↔estabelecimento (venue_members) e os
-- campos de geolocalização e de conta ativa que faltavam em public.venues.
--
-- user_preferences e user_interactions foram extraídas para
-- 006_create_user_intelligence.sql (escopo próprio, com RLS estritamente
-- self-only, sem o bypass de is_admin() usado aqui em venue_members).
--
-- Este arquivo é seguro para revisar e reexecutar: toda instrução usa
-- "if not exists" / "create or replace" / "drop ... if exists" antes de
-- recriar, então rodar mais de uma vez não falha nem duplica objetos.
--
-- Não insere nenhum dado fictício. Não altera as migrations 001-004.
--
-- IMPORTANTE sobre public.venues: essa tabela já existe desde
-- 001_create_venues.sql, com uma estrutura bem mais rica do que a lista
-- original deste pedido (neighborhood, tags, schedule, is_published etc.).
-- Em vez de tentar "criar" venues de novo — o que seria um no-op silencioso
-- com "create table if not exists", ou destrutivo com um drop — esta
-- migration só ADICIONA as colunas genuinamente novas (latitude, longitude,
-- website, is_active) à tabela real. "whatsapp" não ganha uma coluna nova:
-- a tabela já tem "whatsapp_number", que deve ser reaproveitada.
--
-- Seção de rollback manual (não executada automaticamente) no final do
-- arquivo, para reverter esta migration especificamente se necessário.

-- 1) Novas colunas em public.venues.
alter table public.venues
  add column if not exists latitude numeric,
  add column if not exists longitude numeric,
  add column if not exists website text,
  add column if not exists is_active boolean not null default true;

comment on column public.venues.latitude is
  'Latitude real do estabelecimento. Enquanto nula, o app continua usando distance_km como aproximação estática.';
comment on column public.venues.longitude is
  'Longitude real do estabelecimento. Enquanto nula, o app continua usando distance_km como aproximação estática.';
comment on column public.venues.website is
  'Site oficial do estabelecimento, opcional.';
comment on column public.venues.is_active is
  'Conta do estabelecimento ativa no marketplace (parceria vigente), independente de is_published (visibilidade do conteúdo) e de open_now (aberto neste momento). Um venue pode ficar is_active = false ao encerrar a parceria, mesmo que já tenha sido publicado um dia.';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'venues_latitude_range' and conrelid = 'public.venues'::regclass
  ) then
    alter table public.venues
      add constraint venues_latitude_range check (latitude between -90 and 90);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'venues_longitude_range' and conrelid = 'public.venues'::regclass
  ) then
    alter table public.venues
      add constraint venues_longitude_range check (longitude between -180 and 180);
  end if;
end
$$;

-- Com is_active agora existindo, um estabelecimento com parceria encerrada
-- não deve mais aparecer publicamente, mesmo que is_published continue true.
-- Redeclarar a policy (não editar 001_create_venues.sql) é a forma correta
-- de evoluir uma regra já existente. Hoje is_active é sempre true por
-- padrão, então isso não muda nada até alguém desativar um venue.
drop policy if exists "Public can read published venues" on public.venues;

create policy "Public can read published venues"
on public.venues
for select
to anon, authenticated
using (is_published = true and is_active = true);

-- 2) Função auxiliar de RLS: evita repetir a mesma subconsulta em cada
-- policy administrativa das tabelas novas desta migration.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

comment on function public.is_admin() is
  'Retorna true quando o usuário autenticado atual é admin. Uso interno em policies de RLS.';

-- 3) venue_members: relaciona usuários a estabelecimentos.
create table if not exists public.venue_members (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'owner' check (role in ('owner', 'manager')),
  created_at timestamptz not null default now(),

  unique (venue_id, user_id)
);

comment on table public.venue_members is
  'Vínculo entre usuários e os estabelecimentos que eles administram. Um usuário pode ter vários vínculos; um estabelecimento pode ter vários responsáveis.';
comment on column public.venue_members.role is
  'Papel dentro do estabelecimento: "owner" (responsável principal) ou "manager" (gestor autorizado). Não confundir com public.profiles.role, que é o papel global do usuário na plataforma.';

create index if not exists idx_venue_members_venue_id on public.venue_members (venue_id);
create index if not exists idx_venue_members_user_id on public.venue_members (user_id);

alter table public.venue_members enable row level security;

drop policy if exists "Members can read own memberships" on public.venue_members;

create policy "Members can read own memberships"
on public.venue_members
for select
to authenticated
using (user_id = auth.uid() or public.is_admin());

-- Vínculo é sempre mediado por admin nesta etapa (convite/desligamento);
-- um owner não pode se auto-vincular a um estabelecimento.
drop policy if exists "Admins can add venue members" on public.venue_members;

create policy "Admins can add venue members"
on public.venue_members
for insert
to authenticated
with check (public.is_admin());

drop policy if exists "Admins can update venue members" on public.venue_members;

create policy "Admins can update venue members"
on public.venue_members
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins can remove venue members" on public.venue_members;

create policy "Admins can remove venue members"
on public.venue_members
for delete
to authenticated
using (public.is_admin());

-- ============================================================================
-- ROLLBACK MANUAL desta migration (NÃO executar automaticamente).
-- Copie e rode este bloco separadamente, apenas se precisar reverter
-- especificamente a 005. Ordem importa: a policy de venues precisa voltar
-- ao estado da migration 001 antes de dropar a coluna is_active de que ela
-- depende.
-- ============================================================================
--
-- drop policy if exists "Public can read published venues" on public.venues;
-- create policy "Public can read published venues"
--   on public.venues for select to anon, authenticated
--   using (is_published = true);
--
-- drop table if exists public.venue_members;
-- drop function if exists public.is_admin();
--
-- alter table public.venues drop constraint if exists venues_longitude_range;
-- alter table public.venues drop constraint if exists venues_latitude_range;
-- alter table public.venues
--   drop column if exists is_active,
--   drop column if exists website,
--   drop column if exists longitude,
--   drop column if exists latitude;
