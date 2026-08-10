-- 016_create_favorites.sql
-- APLICADA — confirmada ao vivo no Supabase em 2026-08-10: public.favorites
-- existe, com a mesma estrutura e as mesmas 3 policies (select/insert/delete
-- self-only) definidas abaixo. Este arquivo passa a existir só como registro
-- da estrutura real, para uma instalação nova poder reproduzi-la — não deve
-- ser reaplicado sem necessidade (é idempotente, mas não é preciso rodar de
-- novo em cima do banco atual).
--
-- Objetivo: favoritos reais do usuário consumidor (tabela dedicada, distinta
-- do log de eventos `user_interactions` de 006_create_user_intelligence.sql
-- — aqui é estado atual "favoritado ou não", lá é histórico de eventos
-- incluindo o tipo 'favoritou', que não é afetado por esta migration).
--
-- Este arquivo é seguro para revisar e reexecutar: toda instrução usa
-- "if not exists" / "drop policy if exists" antes de recriar, então rodar
-- mais de uma vez não falha nem duplica objetos.
--
-- Não insere nenhum dado fictício. Não altera nenhuma migration 001-015.

create table if not exists public.favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  venue_id uuid not null references public.venues (id) on delete cascade,
  created_at timestamptz not null default now(),

  constraint favorites_user_venue_unique unique (user_id, venue_id)
);

comment on table public.favorites is
  'Favoritos do usuário consumidor — estado atual (favoritado ou não), não um log de eventos. Um usuário só pode favoritar o mesmo estabelecimento uma vez (constraint unique).';

-- Índice para a consulta mais comum: listar os favoritos de um usuário,
-- mais recentes primeiro (tela /favoritos).
create index if not exists idx_favorites_user_created
  on public.favorites (user_id, created_at desc);

alter table public.favorites enable row level security;

drop policy if exists "Users can read own favorites" on public.favorites;

create policy "Users can read own favorites"
on public.favorites
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "Users can insert own favorites" on public.favorites;

create policy "Users can insert own favorites"
on public.favorites
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "Users can delete own favorites" on public.favorites;

create policy "Users can delete own favorites"
on public.favorites
for delete
to authenticated
using (user_id = auth.uid());

-- Sem policy de update: um favorito não é editado, só criado ou removido.

-- ============================================================================
-- ROLLBACK MANUAL desta migration (NÃO executar automaticamente).
-- Copie e rode este bloco separadamente, apenas se precisar reverter
-- especificamente a 016.
-- ============================================================================
--
-- drop table if exists public.favorites;
