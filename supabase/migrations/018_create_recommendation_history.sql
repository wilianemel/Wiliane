-- 018_create_recommendation_history.sql
-- APLICADA — versão reescrita em 2026-08-10 para bater com a estrutura
-- REAL confirmada ao vivo no Supabase, que diverge da versão original deste
-- arquivo. A tabela já existe em produção com este desenho (jsonb livre em
-- vez de colunas score/reasons/context separadas, e com user_feedback).
-- Este arquivo passa a existir só como registro da estrutura real, para uma
-- instalação nova poder reproduzi-la — não deve ser reaplicado sem
-- necessidade (é idempotente, mas não é preciso rodar de novo em cima do
-- banco atual).
--
-- Objetivo: memória das recomendações geradas pelo HomeMatchFlow — uma
-- linha por estabelecimento recomendado em cada execução do questionário.
-- Score, motivos e as respostas que geraram o resultado ficam todos dentro
-- de recommendation_context (jsonb) — ver src/lib/recommendations/
-- save-recommendation-history.ts, que grava { score, reasons, answers }
-- nesse campo. Distinta de user_interactions (006): aqui é o snapshot de um
-- resultado de match, não um evento de comportamento.
--
-- Este arquivo é seguro para revisar e reexecutar: toda instrução usa
-- "if not exists" / "drop policy if exists" antes de recriar, então rodar
-- mais de uma vez não falha nem duplica objetos.
--
-- Não insere nenhum dado fictício. Não altera nenhuma migration 001-017.

create table if not exists public.recommendation_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  venue_id uuid not null references public.venues (id) on delete cascade,
  recommendation_context jsonb not null,
  user_feedback text,
  created_at timestamptz not null default now()
);

comment on table public.recommendation_history is
  'Memória das recomendações do HomeMatchFlow — uma linha por estabelecimento recomendado por execução do questionário. Score, motivos e respostas ficam dentro de recommendation_context; user_feedback é preenchido depois, via RecommendationFeedbackButton.';
comment on column public.recommendation_history.recommendation_context is
  'Payload livre com o resultado da recomendação (score, reasons, answers), gravado por save-recommendation-history.ts. Validação de formato fica a cargo da aplicação, não do banco — mesma lógica já usada em user_preferences (006) e user_interactions.metadata (017).';
comment on column public.recommendation_history.user_feedback is
  'Reação do usuário a essa recomendação específica (ex.: "gostei"/"nao_gostei"), gravada via UPDATE por RecommendationFeedbackButton. Nula até o usuário dar feedback.';

-- Consulta mais provável: histórico de um usuário, mais recente primeiro.
create index if not exists idx_recommendation_history_user_created
  on public.recommendation_history (user_id, created_at desc);

alter table public.recommendation_history enable row level security;

drop policy if exists "Users can view own recommendation history" on public.recommendation_history;

create policy "Users can view own recommendation history"
on public.recommendation_history
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert own recommendation history" on public.recommendation_history;

create policy "Users can insert own recommendation history"
on public.recommendation_history
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update own recommendation feedback" on public.recommendation_history;

create policy "Users can update own recommendation feedback"
on public.recommendation_history
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- Sem policy de delete: um registro histórico não é removido pelo próprio
-- usuário nesta etapa.

-- ============================================================================
-- ROLLBACK MANUAL desta migration (NÃO executar automaticamente).
-- Copie e rode este bloco separadamente, apenas se precisar reverter
-- especificamente a 018.
-- ============================================================================
--
-- drop table if exists public.recommendation_history;
