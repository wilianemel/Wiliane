-- 029_create_venue_business_hours.sql
-- NAO APLICADA - escrita em disco para revisao. Nao foi executada no
-- Supabase. Aguardando autorizacao explicita antes de qualquer aplicacao.
--
-- Cria somente a tabela public.venue_business_hours. Nao altera nenhuma
-- tabela existente, nao altera public.venues, nao altera venues.schedule,
-- nao altera venues.open_now, nao altera autenticacao.

create table if not exists public.venue_business_hours (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues(id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  opens_at time without time zone,
  closes_at time without time zone,
  is_closed boolean not null default false,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (venue_id, day_of_week)
);

create index if not exists venue_business_hours_venue_id_idx
  on public.venue_business_hours (venue_id);

drop trigger if exists set_venue_business_hours_updated_at on public.venue_business_hours;

create trigger set_venue_business_hours_updated_at
before update on public.venue_business_hours
for each row
execute function public.handle_updated_at();

alter table public.venue_business_hours enable row level security;

drop policy if exists "Public can read business hours of published venues" on public.venue_business_hours;

create policy "Public can read business hours of published venues"
on public.venue_business_hours
for select
to anon, authenticated
using (
  exists (
    select 1 from public.venues
    where venues.id = venue_business_hours.venue_id
      and venues.is_published = true
  )
);

drop policy if exists "Owners and managers can read their own business hours" on public.venue_business_hours;

create policy "Owners and managers can read their own business hours"
on public.venue_business_hours
for select
to authenticated
using (
  exists (
    select 1 from public.venue_members
    where venue_members.venue_id = venue_business_hours.venue_id
      and venue_members.user_id = auth.uid()
      and venue_members.member_role in ('owner', 'manager')
      and venue_members.is_active = true
  )
);

drop policy if exists "Owners and managers insert business hours" on public.venue_business_hours;

create policy "Owners and managers insert business hours"
on public.venue_business_hours
for insert
to authenticated
with check (
  exists (
    select 1 from public.venue_members
    where venue_members.venue_id = venue_business_hours.venue_id
      and venue_members.user_id = auth.uid()
      and venue_members.member_role in ('owner', 'manager')
      and venue_members.is_active = true
  )
);

drop policy if exists "Owners and managers update business hours" on public.venue_business_hours;

create policy "Owners and managers update business hours"
on public.venue_business_hours
for update
to authenticated
using (
  exists (
    select 1 from public.venue_members
    where venue_members.venue_id = venue_business_hours.venue_id
      and venue_members.user_id = auth.uid()
      and venue_members.member_role in ('owner', 'manager')
      and venue_members.is_active = true
  )
)
with check (
  exists (
    select 1 from public.venue_members
    where venue_members.venue_id = venue_business_hours.venue_id
      and venue_members.user_id = auth.uid()
      and venue_members.member_role in ('owner', 'manager')
      and venue_members.is_active = true
  )
);

drop policy if exists "Owners and managers delete business hours" on public.venue_business_hours;

create policy "Owners and managers delete business hours"
on public.venue_business_hours
for delete
to authenticated
using (
  exists (
    select 1 from public.venue_members
    where venue_members.venue_id = venue_business_hours.venue_id
      and venue_members.user_id = auth.uid()
      and venue_members.member_role in ('owner', 'manager')
      and venue_members.is_active = true
  )
);
