-- 017_extend_user_interactions_for_tracking.sql
-- APLICADA — confirmada ao vivo no Supabase em 2026-08-10: os 4 valores
-- novos (venue_view/favorite_added/favorite_removed/search) já existem no
-- enum interaction_type, e metadata jsonb já existe em user_interactions.
-- Este arquivo passa a existir só como registro da estrutura real, para uma
-- instalação nova poder reproduzi-la — não deve ser reaplicado sem
-- necessidade (é idempotente, mas não é preciso rodar de novo em cima do
-- banco atual).
--
-- Objetivo: extensão mínima e aditiva de public.user_interactions (criada
-- em 006_create_user_intelligence.sql) para suportar a nova camada de
-- tracking (src/lib/analytics/track-interaction.ts), sem tocar no caminho
-- existente que já escreve nessa tabela (register_user_interaction, RPC
-- usada hoje só por home-match-flow.tsx, com vocabulário 'visualizou' etc,
-- que continua funcionando sem nenhuma mudança).
--
-- Três ajustes, todos aditivos/afrouxamentos — nenhuma linha existente é
-- afetada, nenhuma policy muda:
--
-- 1) Novos valores no enum interaction_type (mantido fechado por design,
--    como já documentado em 006 — só estendido, não reestruturado).
-- 2) venue_id passa a aceitar null — necessário para o evento "search",
--    que não está associado a nenhum estabelecimento específico.
-- 3) Nova coluna "metadata" (jsonb, nula) — onde track-interaction.ts
--    grava o termo pesquisado, contexto, ou qualquer payload livre do
--    evento, sem precisar de uma coluna dedicada por tipo de evento.
--
-- IMPORTANTE (restrição do Postgres): um valor de enum recém-adicionado
-- não pode ser usado na mesma transação em que foi criado. Por isso este
-- arquivo só adiciona os valores — nenhum INSERT nem função que os use é
-- criado aqui. O código em src/lib/analytics/track-interaction.ts só pode
-- ser exercitado depois que esta migration for aplicada e commitada.
--
-- Este arquivo é seguro para revisar e reexecutar: toda instrução usa
-- "if not exists" antes de criar, então rodar mais de uma vez não falha.

alter type public.interaction_type add value if not exists 'venue_view';
alter type public.interaction_type add value if not exists 'favorite_added';
alter type public.interaction_type add value if not exists 'favorite_removed';
alter type public.interaction_type add value if not exists 'search';

alter table public.user_interactions
  alter column venue_id drop not null;

alter table public.user_interactions
  add column if not exists metadata jsonb;

comment on column public.user_interactions.venue_id is
  'Estabelecimento relacionado ao evento. Nulo para eventos sem estabelecimento associado (ex.: "search").';
comment on column public.user_interactions.metadata is
  'Payload livre por evento (ex.: termo pesquisado e contexto do evento "search"). Nulo quando o evento não precisa de dado extra. Validação de formato fica a cargo da aplicação, não do banco — mesma lógica já usada em user_preferences (006).';

-- ============================================================================
-- ROLLBACK MANUAL desta migration (NÃO executar automaticamente).
-- Copie e rode este bloco separadamente, apenas se precisar reverter
-- especificamente a 017. Não é possível remover valores de um enum no
-- Postgres — o rollback do enum exigiria recriar o tipo do zero, o que foi
-- deliberadamente deixado de fora deste bloco por ser destrutivo demais
-- para um rollback simples.
-- ============================================================================
--
-- alter table public.user_interactions drop column if exists metadata;
-- alter table public.user_interactions alter column venue_id set not null;
