-- 023_allow_anonymous_user_interactions.sql
-- APLICADA — confirmada ao vivo no Supabase: user_id aceita null,
-- anonymous_id existe, a constraint user_interactions_has_identifier e a
-- policy "Anonymous visitors can log anonymous interactions" já estão
-- ativas. Este arquivo passa a existir só como registro da estrutura real,
-- para uma instalação nova poder reproduzi-la — não deve ser reaplicado
-- sem necessidade (é idempotente, mas não é preciso rodar de novo em cima
-- do banco atual).
--
-- Objetivo: permitir contar visualizações e ações comerciais (whatsapp/
-- rota/reserva) de visitantes NÃO autenticados, para métricas B2B reais no
-- dashboard do estabelecimento — hoje user_id é NOT NULL, o que torna
-- estruturalmente impossível registrar qualquer evento sem sessão.
--
-- Não altera recommendation_history, match-engine nem favorites. Não
-- remove a FK existente de user_id → auth.users (só afrouxa NOT NULL).
--
-- Este arquivo é seguro para revisar e reexecutar: toda instrução usa
-- "if not exists" / "drop policy/constraint if exists" antes de recriar,
-- então rodar mais de uma vez não falha nem duplica objetos.

-- 1) user_id passa a aceitar null — evento anônimo não tem usuário.
alter table public.user_interactions
  alter column user_id drop not null;

-- 2) Novo identificador: um UUID aleatório gerado e persistido no
-- navegador do visitante (ver src/lib/analytics/anonymous-id.ts). Nunca é
-- e-mail, nome, IP ou qualquer dado de identificação real.
alter table public.user_interactions
  add column if not exists anonymous_id text;

comment on column public.user_interactions.user_id is
  'Usuário autenticado que gerou o evento. Nulo para visitantes anônimos — nesse caso anonymous_id é obrigatório (ver constraint user_interactions_has_identifier).';
comment on column public.user_interactions.anonymous_id is
  'UUID aleatório gerado no navegador e persistido em localStorage, só para agrupar eventos do mesmo visitante não autenticado. Nunca é e-mail, IP, fingerprint ou qualquer dado pessoal. Nulo quando o evento tem user_id.';

-- 3) Toda linha precisa de pelo menos um identificador — nunca as duas
-- colunas nulas ao mesmo tempo.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'user_interactions_has_identifier'
      and conrelid = 'public.user_interactions'::regclass
  ) then
    alter table public.user_interactions
      add constraint user_interactions_has_identifier
      check (user_id is not null or anonymous_id is not null);
  end if;
end
$$;

-- 4) RLS: usuário autenticado continua exatamente como antes (a policy já
-- existente "Users can log own interactions" já exige user_id = auth.uid(),
-- então nunca aceita um insert autenticado com user_id nulo — nada muda
-- aqui, nenhuma policy é recriada).
--
-- Nova policy: visitante anônimo (role "anon") só pode inserir quando
-- user_id é nulo E anonymous_id está presente — nunca pode inserir em nome
-- de um usuário, nunca pode inserir uma linha totalmente vazia de
-- identificador (a constraint do passo 3 já bloquearia isso de qualquer
-- forma, mas a policy é explícita por clareza e defesa em profundidade).
drop policy if exists "Anonymous visitors can log anonymous interactions" on public.user_interactions;

create policy "Anonymous visitors can log anonymous interactions"
on public.user_interactions
for insert
to anon
with check (user_id is null and anonymous_id is not null);

-- IMPORTANTE: nenhuma policy de SELECT é criada para "anon" nem para
-- "authenticated" além da já existente ("Users can read own interactions",
-- self-only). Um visitante anônimo nunca ganha permissão de leitura — só
-- de inserir a própria linha. Owners continuam só enxergando números
-- agregados via public.get_venue_dashboard_stats() (022), que já ignora
-- RLS (SECURITY DEFINER) e nunca expõe user_id/anonymous_id linha a linha.

-- ============================================================================
-- ROLLBACK MANUAL desta migration (NÃO executar automaticamente).
-- Copie e rode este bloco separadamente, apenas se precisar reverter
-- especificamente a 023. Reverter para NOT NULL só é seguro se nenhuma
-- linha tiver user_id nulo nesse momento — senão o ALTER falha, o que é o
-- comportamento correto (não trunca dado).
-- ============================================================================
--
-- drop policy if exists "Anonymous visitors can log anonymous interactions" on public.user_interactions;
-- alter table public.user_interactions drop constraint if exists user_interactions_has_identifier;
-- alter table public.user_interactions drop column if exists anonymous_id;
-- alter table public.user_interactions alter column user_id set not null;
