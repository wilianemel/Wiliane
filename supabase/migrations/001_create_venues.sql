-- 001_create_venues.sql
-- Primeira estrutura real do banco do "Bora pra onde": tabela de estabelecimentos.
--
-- Este arquivo é seguro para revisar e reexecutar (idempotente onde razoável):
-- extensão, tabela, índices, função e policy usam "if not exists" / "or replace"
-- / "drop ... if exists" antes de recriar, então rodar mais de uma vez não
-- duplica objetos nem falha por já existirem.
--
-- Não insere dados, não cria autenticação, não mexe em RLS de outras tabelas
-- e não concede acesso administrativo ao navegador.

-- 1) Extensão necessária para gerar UUIDs automaticamente.
create extension if not exists "pgcrypto";

-- 2) Tabela principal de estabelecimentos.
create table if not exists public.venues (
  id uuid primary key default gen_random_uuid(),

  slug text not null unique,
  name text not null,
  city text not null,
  neighborhood text not null,
  address text not null,
  category text not null,
  description text not null,

  cuisine_types text[] not null default '{}'::text[],
  tags text[] not null default '{}'::text[],
  music_styles text[] not null default '{}'::text[],
  atmospheres text[] not null default '{}'::text[],
  intentions text[] not null default '{}'::text[],
  companions text[] not null default '{}'::text[],
  menu_highlights text[] not null default '{}'::text[],
  schedule text[] not null default '{}'::text[],

  price_range text,
  average_price_per_person numeric,
  average_price_for_couple numeric,

  -- Campo temporário do piloto: distância estática de demonstração.
  -- Deve ser substituído por cálculo real de geolocalização no futuro.
  distance_km numeric,

  whatsapp_number text,
  instagram_url text,
  menu_url text,
  cover_image_url text,
  video_url text,

  data_confidence integer not null default 50,
  is_published boolean not null default false,
  is_featured boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint venues_data_confidence_range check (data_confidence between 0 and 100),
  constraint venues_average_price_per_person_non_negative check (average_price_per_person >= 0),
  constraint venues_average_price_for_couple_non_negative check (average_price_for_couple >= 0),
  constraint venues_distance_km_non_negative check (distance_km >= 0)
);

comment on table public.venues is
  'Estabelecimentos (bares, restaurantes, casas de show etc.) exibidos no Bora pra onde.';
comment on column public.venues.distance_km is
  'Distância estática de demonstração usada no piloto. Substituir por cálculo real de geolocalização.';

-- 3) Índices para as buscas e filtros mais comuns.
-- "slug" já tem um índice implícito por causa da restrição unique acima,
-- então não criamos um índice duplicado para ele.
create index if not exists idx_venues_city on public.venues (city);
create index if not exists idx_venues_category on public.venues (category);
create index if not exists idx_venues_is_published on public.venues (is_published);
create index if not exists idx_venues_is_featured on public.venues (is_featured);

-- 4) Função e trigger para manter "updated_at" sempre atualizado sozinho.
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_venues_updated_at on public.venues;

create trigger set_venues_updated_at
before update on public.venues
for each row
execute function public.handle_updated_at();

-- 5) Row Level Security: liga a proteção e permite apenas leitura pública
-- de estabelecimentos já publicados. Nenhuma policy de escrita é criada,
-- então inserir, alterar ou apagar linhas continua bloqueado para o
-- navegador (anon/authenticated) até que policies específicas existam.
alter table public.venues enable row level security;

drop policy if exists "Public can read published venues" on public.venues;

create policy "Public can read published venues"
on public.venues
for select
to anon, authenticated
using (is_published = true);
