-- 027_create_regions_and_cities.sql
-- NÃO APLICADA — escrita em disco para revisão. Não foi executada no
-- Supabase. Aguardando autorização explícita antes de qualquer aplicação.
--
-- Objetivo: estrutura escalável de cidades/regiões, pronta para um futuro
-- seletor "Região → Cidade" na Home/Header. Puramente aditiva — não altera
-- public.venues (venues.city continua texto livre por enquanto, como já
-- decidido) nem nenhuma outra tabela/policy existente.
--
-- Modelo: N:N entre cidades e regiões (city_regions), não um FK direto em
-- cities.region_id — uma cidade pode pertencer a mais de um agrupamento.
-- Nesta lista final, cada cidade pertence só a uma região geográfica (sem
-- sobreposição), mas o modelo N:N continua de propósito: deixa a porta
-- aberta para "regiões" que no futuro não sejam geográficas (ex.: "Turismo
-- romântico", "Gastronomia de inverno") ou para uma cidade voltar a
-- pertencer a mais de um agrupamento, sem precisar de nenhuma migration
-- nova quando isso acontecer — só INSERT em city_regions.
--
-- Este arquivo é seguro para revisar e reexecutar: toda instrução usa
-- "if not exists" / "on conflict ... do nothing" / "drop policy if exists"
-- antes de recriar, então rodar mais de uma vez não falha nem duplica.

-- ============================================================================
-- 1) Tabelas
-- ============================================================================

create table if not exists public.regions (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  created_at timestamptz not null default now()
);

comment on table public.regions is
  'Agrupamentos de cidades — hoje só regiões geográficas (Vale do Paraíba, Litoral Norte, Serra da Mantiqueira, São Paulo), preparado para agrupamentos temáticos futuros (ex.: "Turismo romântico") sem precisar de nova migration.';

create table if not exists public.cities (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

comment on table public.cities is
  'Cidades disponíveis para seleção — não referenciada ainda por public.venues.city (que continua texto livre nesta etapa). is_active permite desativar uma cidade sem apagar histórico.';

create table if not exists public.city_regions (
  city_id uuid not null references public.cities (id) on delete cascade,
  region_id uuid not null references public.regions (id) on delete cascade,
  created_at timestamptz not null default now(),

  primary key (city_id, region_id)
);

comment on table public.city_regions is
  'Relação N:N entre cidades e regiões — modelo preparado para uma cidade pertencer a mais de uma região/agrupamento no futuro, mesmo que a lista atual não tenha nenhuma sobreposição.';

create index if not exists idx_city_regions_region_id on public.city_regions (region_id);

-- ============================================================================
-- 2) Seed — regiões
-- ============================================================================

insert into public.regions (slug, name) values
  ('vale-do-paraiba', 'Vale do Paraíba'),
  ('litoral-norte', 'Litoral Norte'),
  ('serra-da-mantiqueira', 'Serra da Mantiqueira'),
  ('sao-paulo', 'São Paulo')
on conflict (slug) do nothing;

-- ============================================================================
-- 3) Seed — cidades
-- ============================================================================

insert into public.cities (slug, name) values
  ('sao-jose-dos-campos', 'São José dos Campos'),
  ('jacarei', 'Jacareí'),
  ('taubate', 'Taubaté'),
  ('cacapava', 'Caçapava'),
  ('pindamonhangaba', 'Pindamonhangaba'),
  ('guaratingueta', 'Guaratinguetá'),
  ('lorena', 'Lorena'),
  ('aparecida', 'Aparecida'),
  ('cruzeiro', 'Cruzeiro'),
  ('campos-do-jordao', 'Campos do Jordão'),
  ('sao-bento-do-sapucai', 'São Bento do Sapucaí'),
  ('sao-sebastiao', 'São Sebastião'),
  ('ilhabela', 'Ilhabela'),
  ('caraguatatuba', 'Caraguatatuba'),
  ('ubatuba', 'Ubatuba'),
  ('santo-antonio-do-pinhal', 'Santo Antônio do Pinhal'),
  ('monteiro-lobato', 'Monteiro Lobato'),
  ('sao-paulo', 'São Paulo')
on conflict (slug) do nothing;

-- ============================================================================
-- 4) Seed — vínculos cidade↔região
-- ============================================================================

insert into public.city_regions (city_id, region_id)
select c.id, r.id
from (values
  -- Vale do Paraíba
  ('sao-jose-dos-campos', 'vale-do-paraiba'),
  ('jacarei', 'vale-do-paraiba'),
  ('taubate', 'vale-do-paraiba'),
  ('cacapava', 'vale-do-paraiba'),
  ('pindamonhangaba', 'vale-do-paraiba'),
  ('guaratingueta', 'vale-do-paraiba'),
  ('lorena', 'vale-do-paraiba'),
  ('cruzeiro', 'vale-do-paraiba'),
  ('aparecida', 'vale-do-paraiba'),
  ('monteiro-lobato', 'vale-do-paraiba'),
  -- Litoral Norte
  ('sao-sebastiao', 'litoral-norte'),
  ('caraguatatuba', 'litoral-norte'),
  ('ubatuba', 'litoral-norte'),
  ('ilhabela', 'litoral-norte'),
  -- Serra da Mantiqueira
  ('campos-do-jordao', 'serra-da-mantiqueira'),
  ('santo-antonio-do-pinhal', 'serra-da-mantiqueira'),
  ('sao-bento-do-sapucai', 'serra-da-mantiqueira'),
  -- São Paulo
  ('sao-paulo', 'sao-paulo')
) as pair(city_slug, region_slug)
join public.cities c on c.slug = pair.city_slug
join public.regions r on r.slug = pair.region_slug
on conflict (city_id, region_id) do nothing;

-- ============================================================================
-- 5) RLS — leitura pública, sem policy de escrita (mesmo padrão de
--    business_type_catalog, migration 007: escrita só manual via SQL Editor
--    nesta etapa).
-- ============================================================================

alter table public.regions enable row level security;
alter table public.cities enable row level security;
alter table public.city_regions enable row level security;

drop policy if exists "Public can read regions" on public.regions;

create policy "Public can read regions"
on public.regions
for select
to anon, authenticated
using (true);

drop policy if exists "Public can read active cities" on public.cities;

create policy "Public can read active cities"
on public.cities
for select
to anon, authenticated
using (is_active = true);

drop policy if exists "Public can read city_regions" on public.city_regions;

create policy "Public can read city_regions"
on public.city_regions
for select
to anon, authenticated
using (true);

-- ============================================================================
-- ROLLBACK MANUAL (NÃO executar automaticamente).
-- ============================================================================
--
-- drop table if exists public.city_regions;
-- drop table if exists public.cities;
-- drop table if exists public.regions;
