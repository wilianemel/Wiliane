-- 028_create_reviews.sql
-- NÃO APLICADA — escrita em disco para revisão. Não foi executada no
-- Supabase. Aguardando autorização explícita antes de qualquer aplicação.
--
-- Objetivo: arquitetura de avaliações de estabelecimentos por usuários
-- autenticados. Só a estrutura (tabela + RLS) — a UI (VenueRatingSummary,
-- VenueReviewForm) já consome este schema, mas funciona com fallback
-- gracioso enquanto esta migration não for aplicada (ver componentes).
--
-- Escopo estritamente aditivo: não altera public.venues, public.profiles,
-- auth.users nem nenhuma policy existente em qualquer tabela.
--
-- Este arquivo é seguro para revisar e reexecutar: toda instrução usa
-- "if not exists" / "drop policy if exists" antes de recriar, então rodar
-- mais de uma vez não falha nem duplica objetos.

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  rating int not null,
  comment text,
  -- 'published' é o único valor usado pelo formulário hoje (sem etapa de
  -- moderação ainda) — a coluna já existe pronta para 'hidden'/'flagged'
  -- no futuro, sem exigir nova migration quando isso for implementado.
  status text not null default 'published',
  -- Não populado por nenhuma lógica ainda — reservado para quando existir
  -- uma forma real de confirmar que o usuário esteve no estabelecimento.
  verified_visit boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint reviews_rating_range check (rating between 1 and 5),
  constraint reviews_status_check check (status in ('published', 'hidden', 'flagged')),
  -- Impede o mesmo usuário avaliar o mesmo estabelecimento mais de uma vez
  -- a nível de banco (não só de RLS/UI) — uma segunda tentativa deve virar
  -- UPDATE (upsert), nunca uma linha nova.
  constraint reviews_venue_user_unique unique (venue_id, user_id)
);

comment on table public.reviews is
  'Avaliações (nota + comentário) de estabelecimentos, escritas só por usuários autenticados. Uma avaliação por usuário por estabelecimento (constraint reviews_venue_user_unique) — reenviar edita a existente.';
comment on column public.reviews.status is
  'published (visível publicamente) | hidden | flagged — hoje só "published" é usado (sem fluxo de moderação implementado ainda). RLS pública só mostra published; o próprio autor sempre vê a própria avaliação independente do status.';
comment on column public.reviews.verified_visit is
  'Reservado para uma futura confirmação de visita real. Sempre false hoje — nenhuma lógica ainda define isso como true.';

create index if not exists idx_reviews_venue_id on public.reviews (venue_id);
create index if not exists idx_reviews_user_id on public.reviews (user_id);
create index if not exists idx_reviews_venue_status on public.reviews (venue_id, status);

-- updated_at automático, reaproveitando a função genérica já criada em
-- 001_create_venues.sql (não é redefinida aqui).
drop trigger if exists set_reviews_updated_at on public.reviews;

create trigger set_reviews_updated_at
before update on public.reviews
for each row
execute function public.handle_updated_at();

alter table public.reviews enable row level security;

-- SELECT: público vê avaliações publicadas; o autor sempre vê a própria
-- avaliação, mesmo que o status mude no futuro (moderação) — evita que o
-- próprio usuário "perca" a avaliação que ele mesmo escreveu.
drop policy if exists "Public reads published reviews, authors read own" on public.reviews;

create policy "Public reads published reviews, authors read own"
on public.reviews
for select
to anon, authenticated
using (status = 'published' or user_id = auth.uid());

-- INSERT: só autenticado, só em nome de si mesmo.
drop policy if exists "Authenticated users create own review" on public.reviews;

create policy "Authenticated users create own review"
on public.reviews
for insert
to authenticated
with check (user_id = auth.uid());

-- UPDATE: só autenticado, só a própria linha.
drop policy if exists "Authenticated users update own review" on public.reviews;

create policy "Authenticated users update own review"
on public.reviews
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- Sem policy de DELETE nesta etapa — mesma decisão já usada em
-- venue_claim_requests: histórico não se apaga por padrão. Pode ser
-- adicionada depois se o produto precisar de "remover minha avaliação".

-- ============================================================================
-- ROLLBACK MANUAL desta migration (NÃO executar automaticamente).
-- ============================================================================
--
-- drop table if exists public.reviews;
