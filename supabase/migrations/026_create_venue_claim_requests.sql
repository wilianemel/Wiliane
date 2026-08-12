-- 026_create_venue_claim_requests.sql
-- APLICADA — já executada manualmente no Supabase remoto. Mantida aqui como
-- registro histórico do schema; reexecutar é seguro (if not exists / drop
-- policy if exists antes de recriar), mas não é mais necessário.
--
-- Objetivo: transformar "Sou o proprietário" (em /empresa/reivindicar) de
-- um vínculo imediato numa solicitação — o vínculo real em venue_members só
-- acontece depois que um administrador aprova, chamando
-- admin_link_venue_owner() (025) manualmente pela tela /admin/solicitacoes.
-- Esta migration não cria nenhuma função nova — só a tabela, os índices e a
-- RLS necessários para guardar e moderar essas solicitações.
--
-- Escopo estritamente aditivo: não altera create_owned_venue,
-- admin_link_venue_owner, venues, venue_members, nem nenhuma policy
-- existente em qualquer tabela.
--
-- Este arquivo é seguro para revisar e reexecutar: toda instrução usa
-- "if not exists" / "drop policy if exists" antes de recriar, então rodar
-- mais de uma vez não falha nem duplica objetos.

create table if not exists public.venue_claim_requests (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text,
  email text,
  phone text,
  message text,
  status text not null default 'pending',
  -- Origem da solicitação — 'organic' é o único valor usado hoje (o
  -- formulário em /empresa/reivindicar sempre grava isso). Os demais
  -- valores citados no pedido (junior_client, mostarda_campaign, manual)
  -- ainda não têm nenhum caminho no código que os grave — a coluna só fica
  -- pronta para uso futuro, sem inventar lógica que não existe ainda.
  source text not null default 'organic',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint venue_claim_requests_status_check
    check (status in ('pending', 'approved', 'rejected'))
);

comment on table public.venue_claim_requests is
  'Solicitações de "sou o proprietário" enviadas em /empresa/reivindicar. Não cria vínculo nenhum sozinha — um admin precisa aprovar em /admin/solicitacoes, o que dispara admin_link_venue_owner() (025) e só depois atualiza status para approved.';
comment on column public.venue_claim_requests.status is
  'pending (aguardando análise) | approved (admin já vinculou via admin_link_venue_owner) | rejected (admin recusou). Só um admin pode mudar este valor — RLS não permite update por quem não passa em is_platform_admin().';
comment on column public.venue_claim_requests.source is
  'Origem da solicitação, livre — hoje só "organic" é usado pelo formulário. Preparado para "junior_client"/"mostarda_campaign"/"manual" no futuro, sem validação de formato no banco (mesma lógica já usada em user_preferences e user_interactions.metadata).';

-- Consultas mais prováveis: solicitações de um venue, de um usuário, e a
-- fila de pendentes que a tela /admin/solicitacoes lista.
create index if not exists idx_venue_claim_requests_venue_id
  on public.venue_claim_requests (venue_id);
create index if not exists idx_venue_claim_requests_user_id
  on public.venue_claim_requests (user_id);
create index if not exists idx_venue_claim_requests_status
  on public.venue_claim_requests (status);

-- updated_at automático, reaproveitando a função genérica já criada em
-- 001_create_venues.sql (não é redefinida aqui).
drop trigger if exists set_venue_claim_requests_updated_at on public.venue_claim_requests;

create trigger set_venue_claim_requests_updated_at
before update on public.venue_claim_requests
for each row
execute function public.handle_updated_at();

alter table public.venue_claim_requests enable row level security;

-- INSERT: só a própria solicitação, sempre em nome de quem está logado.
drop policy if exists "Users can create own claim requests" on public.venue_claim_requests;

create policy "Users can create own claim requests"
on public.venue_claim_requests
for insert
to authenticated
with check (user_id = auth.uid());

-- SELECT: o próprio solicitante vê a própria solicitação; admin vê todas.
-- Nunca vê solicitação de outro usuário que não seja admin.
drop policy if exists "Users can view own claim requests or admins view all" on public.venue_claim_requests;

create policy "Users can view own claim requests or admins view all"
on public.venue_claim_requests
for select
to authenticated
using (user_id = auth.uid() or public.is_platform_admin());

-- UPDATE (aprovar/recusar): só admin — nunca o próprio solicitante,
-- mesmo pra a própria solicitação.
drop policy if exists "Admins can update claim requests" on public.venue_claim_requests;

create policy "Admins can update claim requests"
on public.venue_claim_requests
for update
to authenticated
using (public.is_platform_admin())
with check (public.is_platform_admin());

-- Sem policy de DELETE: uma solicitação nunca é apagada, só muda de status
-- (log de moderação, mesmo espírito de recommendation_history/favorites).

-- ============================================================================
-- ROLLBACK MANUAL desta migration (NÃO executar automaticamente).
-- Copie e rode este bloco separadamente, apenas se precisar reverter
-- especificamente a 026.
-- ============================================================================
--
-- drop table if exists public.venue_claim_requests;
