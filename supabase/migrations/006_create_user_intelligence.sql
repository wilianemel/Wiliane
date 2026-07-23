-- 006_create_user_intelligence.sql
-- Estrutura de dados para inteligência do usuário: preferências declaradas
-- (user_preferences) e histórico comportamental (user_interactions), base
-- para personalização e recomendações futuras.
--
-- Escopo isolado de 005_create_marketplace_core.sql: aqui o RLS é
-- estritamente self-only (sem o bypass de is_admin() usado em
-- venue_members), porque estes dados são pessoais e sensíveis por natureza
-- (preferências e comportamento de navegação do usuário) — nenhum acesso
-- administrativo foi pedido nesta etapa, então nenhum foi criado.
--
-- Este arquivo é seguro para revisar e reexecutar: toda instrução usa
-- "if not exists" / "create or replace" / "drop ... if exists" antes de
-- recriar, então rodar mais de uma vez não falha nem duplica objetos.
--
-- Não insere nenhum dado fictício. Não altera as migrations 001-005.

-- 1) user_preferences: preferências declaradas, uma linha por usuário.
create table if not exists public.user_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  favorite_categories text[] not null default '{}'::text[],
  favorite_atmospheres text[] not null default '{}'::text[],
  preferred_companions text[] not null default '{}'::text[],
  preferred_price_range text,
  preferred_distance_km numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint user_preferences_preferred_distance_km_non_negative
    check (preferred_distance_km >= 0)
);

comment on table public.user_preferences is
  'Preferências declaradas de cada usuário (categoria, atmosfera, companhia, preço, distância), usadas para personalizar recomendações. Uma linha por usuário — sem policy administrativa nesta etapa.';
comment on column public.user_preferences.favorite_categories is
  'Categorias de estabelecimento preferidas (ex.: mesmo vocabulário livre de public.venues.category).';
comment on column public.user_preferences.favorite_atmospheres is
  'Subconjunto livre de valores; a validação contra o enum AtmosphereId do app (src/types/discovery.ts) fica a cargo da aplicação, não do banco.';
comment on column public.user_preferences.preferred_companions is
  'Subconjunto livre de valores; a validação contra o enum CompanionId do app fica a cargo da aplicação, não do banco.';
comment on column public.user_preferences.preferred_distance_km is
  'Raio de distância máximo que o usuário aceita, em quilômetros.';

-- updated_at automático, reaproveitando a função genérica já criada em
-- 001_create_venues.sql (não é redefinida aqui).
drop trigger if exists set_user_preferences_updated_at on public.user_preferences;

create trigger set_user_preferences_updated_at
before update on public.user_preferences
for each row
execute function public.handle_updated_at();

alter table public.user_preferences enable row level security;

drop policy if exists "Users can read own preferences" on public.user_preferences;

create policy "Users can read own preferences"
on public.user_preferences
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "Users can insert own preferences" on public.user_preferences;

create policy "Users can insert own preferences"
on public.user_preferences
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "Users can update own preferences" on public.user_preferences;

create policy "Users can update own preferences"
on public.user_preferences
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "Users can delete own preferences" on public.user_preferences;

create policy "Users can delete own preferences"
on public.user_preferences
for delete
to authenticated
using (user_id = auth.uid());

-- 2) Tipo enumerado dos 5 tipos de interação suportados nesta etapa.
-- Fechado por design: ao contrário de 005 (interaction_type livre), aqui o
-- vocabulário foi definido explicitamente, então o banco garante a
-- integridade em vez de deixar só a cargo da aplicação.
do $$
begin
  if to_regtype('public.interaction_type') is null then
    create type public.interaction_type as enum (
      'visualizou', 'salvou', 'favoritou', 'ignorou', 'visitou'
    );
  end if;
end
$$;

-- 3) user_interactions: histórico comportamental (log de eventos, append-only).
create table if not exists public.user_interactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  venue_id uuid not null references public.venues (id) on delete cascade,
  interaction_type public.interaction_type not null,
  created_at timestamptz not null default now()
);

comment on table public.user_interactions is
  'Histórico comportamental do usuário (visualizou/salvou/favoritou/ignorou/visitou um estabelecimento), usado para alimentar recomendações. Log de eventos: sem updated_at, sem policy de update ou delete — uma ação desfeita gera um novo registro, não uma edição do antigo.';

-- Índices pensados para as duas consultas mais prováveis em escala:
-- (a) linha do tempo de um usuário; (b) linha do tempo de um estabelecimento.
-- Um terceiro índice cobre agregações por tipo (ex.: contar favoritos de um
-- venue para pontuação/ranqueamento) sem varrer a tabela inteira.
create index if not exists idx_user_interactions_user_created
  on public.user_interactions (user_id, created_at desc);
create index if not exists idx_user_interactions_venue_created
  on public.user_interactions (venue_id, created_at desc);
create index if not exists idx_user_interactions_venue_type
  on public.user_interactions (venue_id, interaction_type);

alter table public.user_interactions enable row level security;

drop policy if exists "Users can read own interactions" on public.user_interactions;

create policy "Users can read own interactions"
on public.user_interactions
for select
to authenticated
using (user_id = auth.uid());

-- Só quem está autenticado registra interação, e só em nome de si mesmo —
-- não há suporte a rastreio anônimo nesta etapa (user_id é not null).
drop policy if exists "Users can log own interactions" on public.user_interactions;

create policy "Users can log own interactions"
on public.user_interactions
for insert
to authenticated
with check (user_id = auth.uid());

-- Sem policy de update ou delete: um log de interação não é editável nem
-- removível pelo próprio usuário nesta etapa.

-- ============================================================================
-- ROLLBACK MANUAL desta migration (NÃO executar automaticamente).
-- Copie e rode este bloco separadamente, apenas se precisar reverter
-- especificamente a 006.
-- ============================================================================
--
-- drop table if exists public.user_interactions;
-- drop type if exists public.interaction_type;
-- drop table if exists public.user_preferences;
