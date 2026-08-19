-- 20260818220256_simplify_existing_venue_onboarding.sql
-- NÃO APLICADA — nome gerado via `npx supabase migration new
-- simplify_existing_venue_onboarding` (CLI oficial, não inventado).
--
-- ============================================================================
-- OBJETIVO (CORREÇÃO — decisão final do fluxo empresarial: SEM aprovação
-- administrativa, ver SEÇÃO 5)
-- ============================================================================
-- Dois fluxos empresariais autônomos, sem intervenção de administrador:
--
-- FLUXO 1 — estabelecimento já cadastrado: busca pública (sem login),
-- seleção, criação de conta/login (sem confirmação de e-mail, sem CPF —
-- só nome/e-mail/WhatsApp/senha), preenchimento em RASCUNHO PRIVADO
-- (nunca altera o venue público antes da conclusão), e conclusão
-- automática via complete_existing_venue_onboarding() — uma RPC única,
-- transacional e idempotente que valida tudo, aplica o rascunho, vincula
-- o próprio usuário como owner e publica. Sem código de usuário, sem UUID
-- copiado manualmente, sem vínculo manual, sem admin.
--
-- FLUXO 2 — novo estabelecimento: criação de conta/login, dados iniciais
-- via create_owned_venue() (nasce como rascunho, is_published=false, com
-- checagem de duplicata por nome+cidade/endereço normalizados), o
-- proprietário completa tudo pelo próprio painel e conclui via
-- complete_new_venue_onboarding() — mesma checklist de completude do
-- Fluxo 1, mesma publicação automática.
--
-- approve_venue_claim()/reject_venue_claim() (fluxo administrativo antigo)
-- continuam existindo, intactas, só como caminho histórico/de emergência
-- — o frontend não as chama mais. Detalhes completos na SEÇÃO 5.
--
-- ============================================================================
-- AUDITORIA PRÉVIA (leitura ao vivo, somente leitura, feita antes de
-- escrever este arquivo — nada abaixo foi alterado no banco)
-- ============================================================================
-- - public.venue_media JÁ EXISTE ao vivo (id, venue_id, url, media_type,
--   is_featured, created_at, title, thumbnail_url) mas não está em NENHUMA
--   migration rastreada — mesmo tipo de deriva já visto em venues.logo_url.
--   Tabela vazia (0 linhas), sem nenhum código no projeto lendo/escrevendo
--   nela ainda. Esta migration formaliza sua estrutura (create table if not
--   exists, no-op se já existir), adiciona RLS e a unique constraint
--   (venue_id, url) necessária para o merge idempotente. CORREÇÃO
--   (auditoria 3ª rodada): NENHUM GRANT de INSERT/UPDATE/DELETE existe
--   para authenticated/anon nesta tabela — toda escrita (capa, vídeo,
--   galeria, retirada, consolidação do rascunho) passa exclusivamente por
--   RPCs SECURITY DEFINER (replace_featured_venue_media, retire_venue_media,
--   set_venue_media_featured, add_venue_gallery_media, approve_venue_claim),
--   que não dependem de GRANT de tabela porque rodam com o privilégio do
--   dono da função. anon/authenticated só têm SELECT, sempre sob RLS.
-- - public.venues.logo_url também já existe ao vivo, fora de qualquer
--   migration — reconciliado aqui com um `add column if not exists`.
-- - public.venue_members usa `member_role` + `is_active` (confirmado ao
--   vivo) — NÃO `role` como a definição original em 005 sugere; 009 já
--   documentou essa reconciliação. Este arquivo usa member_role/is_active
--   em tudo, nunca `role`.
-- - public.is_platform_admin() já existe ao vivo (fora de qualquer
--   migration rastreada, assim como venue_media) — reaproveitado em toda
--   função nova aqui, nunca redefinido.
-- - public.can_manage_venue_registration(target_venue_id uuid) já existe ao
--   vivo com esse nome de parâmetro exato (confirmado via introspecção do
--   PostgREST) — não é redefinida aqui.
-- - public.admin_link_venue_owner(p_venue_id uuid, p_user_id uuid),
--   public.publish_owned_venue(target_venue_id uuid),
--   public.create_owned_venue(...), public.set_venue_verified_status(...),
--   public.venue_claim_requests, public.venue_business_hours e
--   public.venues.is_verified/verified_at já existem ao vivo, apesar de
--   alguns desses arquivos de migration estarem marcados "NÃO APLICADA" —
--   os cabeçalhos de status não refletem mais o estado real do banco
--   (mesmo padrão já documentado em 009). Nenhum desses é redefinido aqui,
--   exceto search_claimable_venues (criada há pouco, ainda exige login —
--   é exatamente o que este arquivo corrige) e a policy de INSERT de
--   venue_claim_requests (endurecida, ver seção 2).
--
-- CORREÇÃO (revisão pós-auditoria do usuário, mesma migration, ainda NÃO
-- APLICADA): a primeira versão deste arquivo afirmava, incorretamente, que
-- não existia conceito de plano no banco. Auditoria confirmou o contrário:
-- public.venue_plans JÁ EXISTE ao vivo, com duas linhas-modelo
-- (plan_type='free', venue_id=null, click_limit=100) e
-- (plan_type='partner', venue_id=null, click_limit=999999, expires_at
-- preenchido) — confirmado por introspecção de colunas via PostgREST
-- (id, venue_id, plan_type, click_limit, click_count, started_at,
-- expires_at, created_at; NÃO tem status, video_limit, updated_at ainda).
-- Este arquivo agora cria public.venue_plan_definitions (catálogo de
-- planos: click_limit, video_limit, preços) e migra com segurança as duas
-- linhas-modelo pra lá antes de removê-las de venue_plans (ver SEÇÃO 5).
-- venue_plans passa a representar só contratações reais (venue_id
-- obrigatório).
--
-- Também corrigido: o bucket "venue-media" é PÚBLICO (leitura sem policy,
-- confirmado em 010_create_owned_venue_and_storage_policies.sql). O path
-- separado usado pela mídia de rascunho (<venue_id>/claim-draft/<...>/...)
-- NÃO torna o arquivo privado — só impede que a aplicação pública
-- consulte/exiba esse caminho antes da aprovação. Qualquer comentário
-- neste arquivo que mencione "privado"/"arquivo privado" sobre essa mídia
-- está descrevendo isolamento de consulta, nunca controle de acesso ao
-- byte do arquivo em si.
--
-- ============================================================================
-- PRÉ-VERIFICAÇÕES A RODAR MANUALMENTE ANTES DE APLICAR (leitura, nenhum
-- comando destrutivo automático baseado em suposição está incluído nesta
-- migration para os casos abaixo — se algum retornar linha, resolva à mão
-- antes de aplicar; a migration em si tem guardas que abortam a transação
-- se os formatos abaixo não forem exatamente os esperados)
-- ============================================================================
--
-- 1) Solicitações ativas duplicadas por estabelecimento — a própria
--    migration já resolve isso sozinha (SEÇÃO 2 marca 'pending' e
--    duplicatas de draft/submitted como 'superseded' antes de criar o
--    índice único), esta consulta é só para conferir o resultado depois:
--   select venue_id, count(*) from public.venue_claim_requests
--   where status in ('draft','submitted')
--   group by venue_id having count(*) > 1;
--
-- 2) Duplicidade em venue_media que impediria a unique (venue_id, url) da
--    SEÇÃO 0 (tabela está vazia hoje, mas confira antes de aplicar):
--   select venue_id, url, count(*) from public.venue_media
--   group by venue_id, url having count(*) > 1;
--
-- 3) Planos reais (venue_id preenchido) já existentes em venue_plans —
--    devem sobreviver intactos; a migration só remove linhas com
--    venue_id is null:
--   select * from public.venue_plans where venue_id is not null;
--
-- 4) Vídeos ativos duplicados por venue em venue_media (relevante para as
--    regras de limite de vídeo da SEÇÃO 6):
--   select venue_id, url, count(*) from public.venue_media
--   where media_type = 'video' group by venue_id, url having count(*) > 1;
--
-- 5) Nomes de policy que colidiriam com os criados aqui (todos usam
--    "drop policy if exists" antes de recriar, então colisão de NOME não
--    quebra — isto é só para revisão humana de policies com efeito
--    equivalente e nome diferente):
--   select schemaname, tablename, policyname from pg_policies
--   where tablename in ('venue_media','venue_claim_requests',
--     'venue_claim_drafts','venue_claim_draft_media','venue_plans',
--     'venue_plan_definitions') or (schemaname = 'storage' and
--     policyname ilike '%claim draft%');
--
-- 6) Sintaxe SQL completa: revisada manualmente linha a linha (parênteses e
--    marcadores $func$/$$ contados programaticamente, batendo com o número
--    de funções/blocos), e `npx supabase db lint --local` foi tentado
--    neste ambiente e falhou por falta de Docker (sem Postgres local
--    disponível para rodar). NÃO foi executada contra nenhum Postgres
--    real — SQL AINDA NÃO EXECUTADO NEM COMPROVADO PELO POSTGRESQL. Só a
--    aplicação real (supabase db push, fora desta tarefa) comprova a
--    sintaxe de fato.
--
-- 7) venue_media.venue_id nulo (bloquearia o NOT NULL da SEÇÃO 3E-2):
--   select count(*) from public.venue_media where venue_id is null;
--
-- 8) Imagem destacada ativa duplicada por venue/rascunho (bloquearia os
--    índices únicos parciais novos da SEÇÃO 0/3B):
--   select venue_id, count(*) from public.venue_media
--   where media_type = 'image' and is_featured = true and is_active = true
--   group by venue_id having count(*) > 1;
--   select draft_id, count(*) from public.venue_claim_draft_media
--   where media_type = 'image' and is_featured = true and is_active = true
--   group by draft_id having count(*) > 1;
--
-- Não apaga tabelas, funções, policies ou dados existentes (exceto as duas
-- linhas-modelo de venue_plans com venue_id null, e só depois de copiadas
-- para venue_plan_definitions — ver SEÇÃO 5). Idempotente em tudo que é
-- seguro ser idempotente (create/alter ... if not exists, drop
-- policy/constraint if exists antes de recriar, on conflict nos upserts).
--
-- ============================================================================
-- EXECUÇÃO MANUAL (CORREÇÃO — auditoria 3ª rodada): este arquivo será
-- colado inteiro no SQL Editor do Supabase, não aplicado via CLI/migração
-- automática. begin/commit abaixo envolvem TODO o SQL executável — se
-- qualquer comando falhar no meio, nada do que já rodou antes fica
-- aplicado (rollback automático da transação inteira). Nenhum comando
-- neste arquivo é incompatível com bloco de transação (sem CONCURRENTLY,
-- sem ALTER TYPE ... ADD VALUE, sem VACUUM/CREATE DATABASE/ALTER SYSTEM).
-- ============================================================================

begin;

-- ============================================================================
-- SEÇÃO 0 — Reconciliação de deriva de schema (venue_media, logo_url)
-- ============================================================================

alter table public.venues
  add column if not exists logo_url text;

comment on column public.venues.logo_url is
  'Logo do estabelecimento (distinto de cover_image_url) — já existia ao vivo fora de qualquer migration rastreada; reconciliado aqui.';

create table if not exists public.venue_media (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues (id) on delete cascade,
  url text not null,
  media_type text not null check (media_type in ('image', 'video')),
  title text,
  thumbnail_url text,
  is_featured boolean not null default false,
  created_at timestamptz not null default now()
);

comment on table public.venue_media is
  'Tabela canônica de mídia de um estabelecimento — já existia ao vivo fora de qualquer migration rastreada (reconciliado aqui, mesmas colunas). Fonte principal para capa/vídeo/galeria no perfil público (venue-repository.ts), unida com venues.cover_image_url/video_url/logo_url e com a listagem antiga de Storage enquanto a migração para cá não estiver completa. Escrita exclusivamente por RPCs SECURITY DEFINER: approve_venue_claim() (consolidação do rascunho), replace_featured_venue_media()/retire_venue_media()/set_venue_media_featured() (capa e vídeo do painel) e add_venue_gallery_media() (galeria do painel) — nenhuma delas depende de GRANT de tabela para authenticated/anon, que só têm SELECT (ver SEÇÃO 6B). Sujeita às regras de limite de vídeo por plano (SEÇÃO 3E).';

-- is_active/retired_at: retirada suave de vídeo (nunca DELETE físico) para
-- respeitar o limite por plano sem perder histórico — ver SEÇÃO 6.
alter table public.venue_media
  add column if not exists is_active boolean not null default true,
  add column if not exists retired_at timestamptz;

comment on column public.venue_media.is_active is
  'false = retirado de exibição (limite de vídeos do plano excedido, ou removido pelo dono) — nunca apagado fisicamente. Toda consulta pública/galeria/contagem deve filtrar is_active = true.';
comment on column public.venue_media.retired_at is
  'Quando is_active virou false. Null enquanto ativo.';

create index if not exists idx_venue_media_venue_id on public.venue_media (venue_id);
create index if not exists idx_venue_media_venue_active
  on public.venue_media (venue_id, media_type)
  where is_active = true;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'venue_media_venue_id_url_key'
      and conrelid = 'public.venue_media'::regclass
  ) then
    alter table public.venue_media
      add constraint venue_media_venue_id_url_key unique (venue_id, url);
  end if;
end
$$;

alter table public.venue_media enable row level security;

drop policy if exists "Public can read media of published venues" on public.venue_media;

create policy "Public can read media of published venues"
on public.venue_media
for select
to anon, authenticated
using (
  is_active = true
  and exists (
    select 1 from public.venues v
    where v.id = venue_media.venue_id and v.is_published = true
  )
);

drop policy if exists "Owners and managers can read their own venue media" on public.venue_media;

create policy "Owners and managers can read their own venue media"
on public.venue_media
for select
to authenticated
using (
  exists (
    select 1 from public.venue_members vm
    where vm.venue_id = venue_media.venue_id
      and vm.user_id = auth.uid()
      and vm.member_role in ('owner', 'manager')
      and vm.is_active = true
  )
);

-- CORREÇÃO (auditoria 3ª rodada): removidas as policies diretas de
-- INSERT/UPDATE de owner/manager — o painel /empresa/painel/[venueId]/midias
-- não escreve mais em venue_media diretamente, só via RPCs SECURITY
-- DEFINER (replace_featured_venue_media, retire_venue_media,
-- set_venue_media_featured, add_venue_gallery_media — ver SEÇÃO 3F), que
-- já validam o mesmo vínculo owner/manager por dentro e não dependem de
-- nenhuma policy de escrita aqui. Sem GRANT de INSERT/UPDATE/DELETE para
-- authenticated/anon nesta tabela (ver SEÇÃO 6B) e sem policy de escrita
-- alguma: mesmo que um GRANT existisse por engano, não haveria policy
-- para RLS liberar a operação. drop policy if exists é mantido aqui só
-- para tornar a migration idempotente contra um estado anterior desta
-- mesma tabela (rodada 2) que chegou a criar essas policies.
drop policy if exists "Owners and managers can add venue media" on public.venue_media;
drop policy if exists "Owners and managers can update venue media" on public.venue_media;
drop policy if exists "Owners and managers can delete venue media" on public.venue_media;

-- Capa (imagem) e destaque de vídeo são conceitos separados (CORREÇÃO):
-- só UMA imagem ativa pode ser a capa de cada venue; vídeos têm destaque
-- independente uns dos outros, podendo vários estar destacados ao mesmo
-- tempo (relevante para o plano partner, com até 20 vídeos). O índice
-- único parcial abaixo só restringe imagem — nunca vídeo. Confere
-- duplicidade antes de criar; aborta com mensagem clara se encontrar mais
-- de uma imagem destacada ativa pro mesmo venue (não resolve sozinho).
do $$
declare
  v_dup_count integer;
begin
  select count(*) into v_dup_count
  from (
    select venue_id
    from public.venue_media
    where media_type = 'image' and is_featured = true and is_active = true
    group by venue_id
    having count(*) > 1
  ) dups;

  if v_dup_count > 0 then
    raise exception
      'venue_media: % estabelecimento(s) com mais de uma imagem ativa destacada. Abortando — resolva manualmente antes de aplicar.',
      v_dup_count;
  end if;
end
$$;

create unique index if not exists idx_venue_media_one_featured_image_per_venue
  on public.venue_media (venue_id)
  where media_type = 'image' and is_featured = true and is_active = true;

-- ============================================================================
-- SEÇÃO 1 — search_claimable_venues: busca pública, sem exigir login
-- ============================================================================
-- Substitui a versão anterior (exigia auth.uid()) por uma que aceita
-- anon e authenticated — mesmas 6 colunas, mesmo limite de 20, mesmo
-- mínimo de 2 caracteres, sem SQL dinâmico. Passa a excluir também
-- venues com uma solicitação ATIVA além dos que já têm venue_members
-- ativo — "sem proprietário ativo e sem outra solicitação ativa", como
-- pedido. CORREÇÃO (fluxo automático, sem aprovação manual): "ativa"
-- agora é só draft/submitted — 'pending' (fluxo manual antigo) e
-- 'rejected' (não existe mais rejeição manual) nunca bloqueiam uma busca
-- nova; 'superseded' (processos duplicados/antigos neutralizados) também
-- nunca bloqueia.
create or replace function public.search_claimable_venues(search_query text)
returns table (
  id uuid,
  name text,
  category text,
  city text,
  neighborhood text,
  cover_image_url text
)
language plpgsql
security definer
set search_path = ''
as $func$
declare
  v_query text;
begin
  v_query := trim(coalesce(search_query, ''));
  if length(v_query) < 2 then
    raise exception 'Digite ao menos 2 caracteres para buscar.';
  end if;

  return query
    select v.id, v.name, v.category, v.city, v.neighborhood, v.cover_image_url
    from public.venues v
    where v.name ilike '%' || v_query || '%'
      and not exists (
        select 1 from public.venue_members vm
        where vm.venue_id = v.id and vm.is_active = true
      )
      and not exists (
        -- CORREÇÃO (fluxo automático): só draft/submitted bloqueiam —
        -- pending (fluxo manual antigo) e rejected (rejeição manual não
        -- existe mais) nunca reservam o estabelecimento; superseded
        -- (duplicata neutralizada) também nunca bloqueia.
        select 1 from public.venue_claim_requests cr
        where cr.venue_id = v.id and cr.status in ('draft', 'submitted')
      )
      -- CORREÇÃO (auditoria final): nunca mostra pra quem foi removido
      -- como proprietário deste venue e ainda está bloqueado — auth.uid()
      -- é null para anon, então esta condição nunca exclui nada pra quem
      -- não está logado.
      and not exists (
        -- CORREÇÃO (auditoria final 2): filtra pelos snapshots (identidade
        -- permanente, not null) — não mais venue_id/blocked_user_id, que
        -- podem virar null via ON DELETE SET NULL.
        select 1 from public.venue_owner_reclaim_blocks b
        where b.venue_id_snapshot = v.id and b.blocked_user_id_snapshot = auth.uid() and b.is_active = true
      )
    order by v.name
    limit 20;
end;
$func$;

comment on function public.search_claimable_venues(text) is
  'Busca pública (anon ou authenticated) de estabelecimentos publicados ou não, sem proprietário ativo, sem solicitação ativa (draft/submitted) e sem bloqueio ativo para quem está buscando (venue_owner_reclaim_blocks) — para quem quer reivindicar um estabelecimento antes de criar conta. Nunca cria vínculo, nunca expõe dado fora das 6 colunas declaradas. Exige 2+ caracteres, limita a 20 resultados.';

revoke all on function public.search_claimable_venues(text) from public;
grant execute on function public.search_claimable_venues(text) to anon;
grant execute on function public.search_claimable_venues(text) to authenticated;

-- ============================================================================
-- SEÇÃO 2 — venue_claim_requests: novos status, motivo de recusa, revisão,
-- um único processo ativo por estabelecimento
-- ============================================================================

alter table public.venue_claim_requests
  add column if not exists reject_reason text,
  add column if not exists reviewed_by uuid references auth.users (id),
  add column if not exists reviewed_at timestamptz,
  add column if not exists requester_name text,
  add column if not exists requester_email text,
  add column if not exists completed_at timestamptz;

comment on column public.venue_claim_requests.reject_reason is
  'Motivo de uma recusa manual antiga (fluxo administrativo descontinuado — ver SEÇÃO 5) — mantido só como histórico das linhas já rejeitadas antes desta mudança. Nenhum caminho novo grava aqui.';
comment on column public.venue_claim_requests.requester_name is
  'Snapshot do nome do solicitante no momento da criação — vem do próprio cliente autenticado (user_metadata.full_name), nunca de uma consulta a auth.users dentro da função. Só para exibição/histórico; nunca usado para autorização.';
comment on column public.venue_claim_requests.requester_email is
  'Snapshot do e-mail do solicitante. CORREÇÃO (fluxo automático): criado com o que o cliente enviar em start_or_resume_venue_claim (só para exibição precoce), mas SEMPRE sobrescrito com auth.users.email (via auth.uid(), nunca user_metadata) no momento em que complete_existing_venue_onboarding() conclui o processo — ver SEÇÃO 5. Nunca usado para autorização.';
comment on column public.venue_claim_requests.completed_at is
  'Quando complete_existing_venue_onboarding() concluiu e publicou este processo automaticamente (SEÇÃO 5) — substitui o antigo reviewed_at/reviewed_by de aprovação manual para o caminho novo. Null enquanto não concluído.';

-- Status do fluxo de rascunho (CORREÇÃO — fluxo automático, sem aprovação
-- manual): draft (preenchendo) → completed (publicado automaticamente
-- pelo próprio usuário, via complete_existing_venue_onboarding — SEÇÃO 5).
-- "submitted"/"approved"/"rejected" continuam aceitos pelo CHECK só para
-- não quebrar linhas históricas do fluxo antigo (approve_venue_claim/
-- reject_venue_claim continuam existindo em SEÇÃO 4, sem uso pelo
-- frontend) — nenhum caminho novo produz "approved"/"rejected"/"pending".
-- "superseded" é o novo status para processos antigos/duplicados
-- neutralizados (nunca apagados, nunca retomáveis, nunca vinculam
-- ninguém) — ver backfill logo abaixo.
alter table public.venue_claim_requests drop constraint if exists venue_claim_requests_status_check;

alter table public.venue_claim_requests
  add constraint venue_claim_requests_status_check
  check (status in ('pending', 'draft', 'submitted', 'approved', 'rejected', 'completed', 'superseded'));

-- ----------------------------------------------------------------------------
-- Backfill de status ANTES do índice único (CORREÇÃO — auditoria de
-- duplicatas): nunca escolhe automaticamente qual solicitação duplicada
-- "vence" — evita adivinhar qual conta/e-mail é a certa quando duas
-- solicitações existem pro mesmo estabelecimento (caso real observado).
-- ----------------------------------------------------------------------------

-- 1) Todo "pending" (fluxo manual antigo, formulário descontinuado) vira
--    superseded — nunca mais bloqueia nem aparece como processo ativo.
update public.venue_claim_requests
set status = 'superseded', updated_at = now()
where status = 'pending';

-- 2) Duplicatas remanescentes: qualquer venue_id com mais de um processo
--    editável (draft/submitted) tem TODOS os processos daquele venue
--    marcados como superseded — nunca mantém "o mais recente" ativo
--    automaticamente. Cada usuário afetado (histórico preservado, nada
--    apagado) precisa iniciar uma tentativa nova depois desta migration,
--    entrando com a conta que realmente pretende usar.
update public.venue_claim_requests
set status = 'superseded', updated_at = now()
where status in ('draft', 'submitted')
  and venue_id in (
    select venue_id from public.venue_claim_requests
    where status in ('draft', 'submitted')
    group by venue_id
    having count(*) > 1
  );

-- Só uma solicitação EDITÁVEL por estabelecimento — é isto que impede duas
-- pessoas (ou duas abas/duplo clique da mesma pessoa) de reivindicarem o
-- mesmo estabelecimento ao mesmo tempo, e que faz start_or_resume_venue_
-- claim() saber quando retomar em vez de criar um novo processo. Cobre
-- também "só um processo por venue_id + user_id" — com no máximo uma
-- linha ativa por venue_id, nunca pode existir mais de uma para o mesmo
-- par (venue_id, user_id) (um índice mais estrito seria redundante).
-- CORREÇÃO (fluxo automático): 'pending'/'rejected' saíram do predicado —
-- não existe mais rejeição manual, e pending é status legado; só
-- draft/submitted contam como "em andamento". Backfill acima já garante
-- que a criação deste índice nunca falha por dado real duplicado.
drop index if exists public.idx_venue_claim_requests_active_per_venue;

create unique index if not exists idx_venue_claim_requests_active_per_venue
  on public.venue_claim_requests (venue_id)
  where status in ('draft', 'submitted');

-- Endurece o INSERT direto (antes aceitava qualquer status vindo do
-- cliente): agora só permite recriar o comportamento antigo (status
-- "pending" via o formulário legado, se algum dia for usado de novo).
-- "draft" só nasce por dentro de start_or_resume_venue_claim (SECURITY
-- DEFINER, contorna RLS) — nunca por INSERT direto do cliente.
drop policy if exists "Users can create own claim requests" on public.venue_claim_requests;

create policy "Users can create own claim requests"
on public.venue_claim_requests
for insert
to authenticated
with check (user_id = auth.uid() and status = 'pending');

-- ============================================================================
-- SEÇÃO 3 — venue_claim_drafts: rascunho privado ligado à solicitação
-- ============================================================================

create table if not exists public.venue_claim_drafts (
  id uuid primary key default gen_random_uuid(),
  claim_request_id uuid not null unique references public.venue_claim_requests (id) on delete cascade,
  venue_id uuid not null references public.venues (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  -- Todos os campos editáveis de EDITABLE_VENUE_FIELDS (venue-owner.ts),
  -- guardados como JSON em vez de 20+ colunas soltas — validado e
  -- filtrado por whitelist explícita em save_venue_claim_draft(), nunca
  -- aceito cru do cliente.
  venue_data jsonb not null default '{}'::jsonb,
  -- Array de {day_of_week, opens_at, closes_at, is_closed, note} — mesmo
  -- formato de linha de public.venue_business_hours.
  business_hours jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.venue_claim_drafts is
  'Rascunho privado de uma solicitação de reivindicação — nunca altera public.venues diretamente. Só vira dado público de fato quando approve_venue_claim() aplica o rascunho ao venue real. Acessível só pelo próprio usuário (venue_claim_requests.user_id) e por administradores.';

create index if not exists idx_venue_claim_drafts_claim_request_id
  on public.venue_claim_drafts (claim_request_id);
create index if not exists idx_venue_claim_drafts_venue_id
  on public.venue_claim_drafts (venue_id);
create index if not exists idx_venue_claim_drafts_user_id
  on public.venue_claim_drafts (user_id);

drop trigger if exists set_venue_claim_drafts_updated_at on public.venue_claim_drafts;

create trigger set_venue_claim_drafts_updated_at
before update on public.venue_claim_drafts
for each row
execute function public.handle_updated_at();

alter table public.venue_claim_drafts enable row level security;

drop policy if exists "Draft owner or admin can view draft" on public.venue_claim_drafts;

create policy "Draft owner or admin can view draft"
on public.venue_claim_drafts
for select
to authenticated
using (user_id = auth.uid() or public.is_platform_admin());

-- Sem policy de INSERT/UPDATE/DELETE para authenticated/anon de propósito:
-- toda escrita passa por start_or_resume_venue_claim()/save_venue_claim_draft()
-- (SECURITY DEFINER, seção 4).

-- ============================================================================
-- SEÇÃO 3B — venue_claim_draft_media: mídia do rascunho, área temporária
-- só para o processo de aprovação (não é uma segunda tabela definitiva —
-- vira linha em venue_media só na aprovação; venue_media continua sendo a
-- única fonte canônica depois disso).
-- ============================================================================

create table if not exists public.venue_claim_draft_media (
  id uuid primary key default gen_random_uuid(),
  draft_id uuid not null references public.venue_claim_drafts (id) on delete cascade,
  url text not null,
  storage_path text not null,
  media_type text not null check (media_type in ('image', 'video')),
  title text,
  thumbnail_url text,
  is_featured boolean not null default false,
  -- Retirada suave por limite de vídeo do plano (SEÇÃO 3E) — nunca DELETE
  -- físico, mesma convenção de public.venue_media.
  is_active boolean not null default true,
  retired_at timestamptz,
  created_at timestamptz not null default now(),

  -- Reenvio do mesmo arquivo (mesmo storage_path) nunca duplica a linha.
  unique (draft_id, storage_path)
);

comment on table public.venue_claim_draft_media is
  'Mídia enviada durante o preenchimento do rascunho — arquivos ficam em storage.objects, path <venue_id>/claim-draft/<claim_request_id>/... (nunca nas pastas cover/logo/video/gallery usadas pelo dono já aprovado, para nunca sobrescrever mídia pública existente antes da aprovação). O bucket venue-media continua público (leitura sem policy, ver 010) — as mídias do rascunho ficam em um caminho separado e não são consultadas nem exibidas pela plataforma pública antes da aprovação, mas o arquivo em si não vira privado. Consolidada em public.venue_media só por approve_venue_claim().';

create index if not exists idx_venue_claim_draft_media_draft_id
  on public.venue_claim_draft_media (draft_id);

-- Mesma proteção de venue_media: só uma imagem ativa pode ser a capa do
-- rascunho; vídeos têm destaque independente entre si. Confere
-- duplicidade antes de criar; aborta com mensagem clara se encontrar mais
-- de uma imagem destacada ativa no mesmo rascunho.
do $$
declare
  v_dup_count integer;
begin
  select count(*) into v_dup_count
  from (
    select draft_id
    from public.venue_claim_draft_media
    where media_type = 'image' and is_featured = true and is_active = true
    group by draft_id
    having count(*) > 1
  ) dups;

  if v_dup_count > 0 then
    raise exception
      'venue_claim_draft_media: % rascunho(s) com mais de uma imagem ativa destacada. Abortando — resolva manualmente antes de aplicar.',
      v_dup_count;
  end if;
end
$$;

create unique index if not exists idx_claim_draft_media_one_featured_image_per_draft
  on public.venue_claim_draft_media (draft_id)
  where media_type = 'image' and is_featured = true and is_active = true;

-- Funções auxiliares (não expostas via API, ver revoke abaixo): centralizam
-- a validação de propriedade/formato de path/existência do objeto, usadas
-- pelas policies de INSERT/UPDATE/DELETE logo abaixo. Nunca fazem ::uuid a
-- partir de texto não validado antes — split_part() nunca lança erro,
-- mesmo com um storage_path malformado.
create or replace function public._claim_draft_media_owned_and_editable(p_draft_id uuid)
returns boolean
language sql
stable
set search_path = ''
as $func$
  select exists (
    select 1
    from public.venue_claim_drafts d
    join public.venue_claim_requests r on r.id = d.claim_request_id
    where d.id = p_draft_id
      and d.user_id = auth.uid()
      -- CORREÇÃO (auditoria final): 'submitted' também é editável no
      -- fluxo novo — não existe mais um estado intermediário travado
      -- aguardando aprovação; só 'completed' encerra a edição de verdade.
      and r.status in ('draft', 'submitted', 'rejected')
  );
$func$;

comment on function public._claim_draft_media_owned_and_editable(uuid) is
  'True só quando o rascunho pertence a auth.uid() e a solicitação está num estado editável (draft/submitted/rejected) — usada nas policies de UPDATE/DELETE de venue_claim_draft_media para permissão sobre a linha já existente.';

-- CORREÇÃO: RLS avalia a expressão da policy como o papel de quem está
-- conectado (authenticated) — sem EXECUTE pra esse papel, toda tentativa
-- de UPDATE/DELETE em venue_claim_draft_media falharia com "permission
-- denied for function", mesmo com auth.uid() correto. Não é SECURITY
-- DEFINER (função language sql simples, sem elevar privilégio) — as
-- checagens internas continuam por auth.uid(), e a tabela consultada
-- (venue_claim_drafts) já tem RLS própria que só deixa o dono ler a
-- própria linha, então não há nada exposto além do que authenticated já
-- enxergaria de qualquer forma.
revoke all on function public._claim_draft_media_owned_and_editable(uuid) from public;
revoke all on function public._claim_draft_media_owned_and_editable(uuid) from anon;
grant execute on function public._claim_draft_media_owned_and_editable(uuid) to authenticated;

create or replace function public._claim_draft_media_write_allowed(
  p_draft_id uuid,
  p_storage_path text,
  p_url text
)
returns boolean
language sql
stable
set search_path = ''
as $func$
  select exists (
    select 1
    from public.venue_claim_drafts d
    join public.venue_claim_requests r on r.id = d.claim_request_id
    where d.id = p_draft_id
      and d.user_id = auth.uid()
      -- CORREÇÃO (auditoria final): 'submitted' também é editável no
      -- fluxo novo — não existe mais um estado intermediário travado
      -- aguardando aprovação; só 'completed' encerra a edição de verdade.
      and r.status in ('draft', 'submitted', 'rejected')
      -- storage_path precisa ser EXATAMENTE <venue_id>/claim-draft/<claim_request_id>/<arquivo>
      -- (venue_id e claim_request_id vindo do próprio rascunho, nunca do
      -- texto enviado pelo cliente) — split_part nunca lança erro, então
      -- isto é seguro mesmo com um path completamente arbitrário.
      and split_part(p_storage_path, '/', 4) <> ''
      and split_part(p_storage_path, '/', 5) = ''
      and p_storage_path = d.venue_id::text || '/claim-draft/' || r.id::text || '/' || split_part(p_storage_path, '/', 4)
      -- A URL declarada precisa apontar pro mesmo objeto do storage_path —
      -- nunca aceita uma URL solta sem relação com o path.
      and p_url like ('%' || p_storage_path)
      -- E o objeto precisa realmente existir no bucket, no path exato —
      -- nunca cria a linha "no escuro", só depois do upload real.
      and exists (
        select 1 from storage.objects so
        where so.bucket_id = 'venue-media' and so.name = p_storage_path
      )
  );
$func$;

comment on function public._claim_draft_media_write_allowed(uuid, text, text) is
  'True só quando: o rascunho pertence a auth.uid() e está editável; storage_path é exatamente <venue_id>/claim-draft/<claim_request_id>/<arquivo> (venue_id/claim_request_id vêm do próprio rascunho, não do cliente); a URL aponta pro mesmo path; e o objeto realmente existe em storage.objects. Usada em INSERT e UPDATE de venue_claim_draft_media — nunca confia só na validação do frontend.';

-- Mesmo motivo do EXECUTE acima: chamada de dentro de RLS, avaliada como
-- authenticated. language sql simples (sem SECURITY DEFINER) — as
-- checagens de posse/formato continuam de auth.uid() e das colunas do
-- próprio rascunho, nunca de entrada do cliente sem validar.
revoke all on function public._claim_draft_media_write_allowed(uuid, text, text) from public;
revoke all on function public._claim_draft_media_write_allowed(uuid, text, text) from anon;
grant execute on function public._claim_draft_media_write_allowed(uuid, text, text) to authenticated;

alter table public.venue_claim_draft_media enable row level security;

-- SELECT: dono do rascunho a qualquer momento; admin só até a decisão
-- (submitted é o único estado em que uma solicitação está "aguardando
-- decisão" — depois de approved/rejected não há mais nada a decidir, mas
-- a leitura continua liberada para admin revisar o histórico; a ação de
-- ESCREVER nunca é liberada para admin em nenhum estado, ver INSERT/
-- UPDATE/DELETE abaixo, que não têm nenhuma policy para admin).
drop policy if exists "Draft owner or admin can view draft media" on public.venue_claim_draft_media;

create policy "Draft owner or admin can view draft media"
on public.venue_claim_draft_media
for select
to authenticated
using (
  public.is_platform_admin()
  or exists (
    select 1 from public.venue_claim_drafts d
    where d.id = draft_id and d.user_id = auth.uid()
  )
);

-- INSERT/UPDATE/DELETE: só o próprio dono do rascunho, e só enquanto a
-- solicitação está num estado editável (draft, submitted ou rejected —
-- CORREÇÃO: 'submitted' incluída porque não existe mais aprovação manual
-- que trave a edição nesse estado; só 'completed' encerra de verdade).
-- Nenhuma das três tem policy para admin: admin nunca escreve mídia de
-- rascunho de ninguém, só visualiza (policy acima).
drop policy if exists "Draft owner can add draft media while editable" on public.venue_claim_draft_media;

create policy "Draft owner can add draft media while editable"
on public.venue_claim_draft_media
for insert
to authenticated
with check (public._claim_draft_media_write_allowed(draft_id, storage_path, url));

drop policy if exists "Draft owner can update draft media while editable" on public.venue_claim_draft_media;

create policy "Draft owner can update draft media while editable"
on public.venue_claim_draft_media
for update
to authenticated
using (public._claim_draft_media_owned_and_editable(draft_id))
with check (public._claim_draft_media_write_allowed(draft_id, storage_path, url));

-- Sem policy de DELETE (CORREÇÃO): a remoção de mídia do rascunho agora é
-- sempre soft delete (is_active=false, retired_at=now(), via UPDATE —
-- policy já criada acima), nunca DELETE físico. Sem policy de DELETE,
-- RLS nega a operação inteira para authenticated/anon.

-- Destaca/remove destaque de uma mídia do RASCUNHO em uma única
-- transação (CORREÇÃO: antes o cliente fazia dois UPDATEs separados —
-- limpar todos os destaques, depois marcar um — o que deixava uma janela
-- sem nenhuma capa se o segundo UPDATE falhasse). Mesma regra de
-- set_venue_media_featured: imagem só desmarca a anterior (nunca
-- desativa), vídeo nunca mexe em outro.
create or replace function public.set_venue_claim_draft_media_featured(p_media_id uuid, p_featured boolean)
returns table (
  id uuid,
  is_featured boolean
)
language plpgsql
security definer
set search_path = ''
as $func$
declare
  v_draft_id uuid;
  v_media_type text;
begin
  if auth.uid() is null then
    raise exception 'É necessário estar autenticado.';
  end if;

  select m.draft_id, m.media_type into v_draft_id, v_media_type
  from public.venue_claim_draft_media m
  where m.id = p_media_id and m.is_active = true;

  if v_draft_id is null then
    raise exception 'Mídia não encontrada ou não está ativa.';
  end if;

  if not public._claim_draft_media_owned_and_editable(v_draft_id) then
    raise exception 'Você não tem permissão para editar esta mídia, ou o cadastro não está mais editável.';
  end if;

  perform pg_advisory_xact_lock(hashtext('claim_draft_media_featured:' || v_draft_id::text)::bigint);

  -- CORREÇÃO (investigação real do erro 42P01): esta função nunca tinha
  -- sido tocada pelas correções anteriores, mas tem o MESMO bug de
  -- coluna ambígua — "id"/"is_featured" sem qualificador colidem com os
  -- parâmetros de saída de RETURNS TABLE (id uuid, is_featured boolean)
  -- desta própria função. Qualificado com o alias vcdm em ambos os
  -- UPDATEs.
  if v_media_type = 'image' and p_featured then
    update public.venue_claim_draft_media vcdm
    set is_featured = false
    where vcdm.draft_id = v_draft_id
      and vcdm.media_type = 'image'
      and vcdm.is_active = true
      and vcdm.is_featured = true
      and vcdm.id <> p_media_id;
  end if;

  update public.venue_claim_draft_media vcdm
  set is_featured = p_featured
  where vcdm.id = p_media_id;

  return query select p_media_id, p_featured;
end;
$func$;

comment on function public.set_venue_claim_draft_media_featured(uuid, boolean) is
  'Destaca/remove destaque de uma mídia do rascunho numa única transação — imagem só desmarca a anterior (nunca desativa), vídeo nunca mexe em outro. Só o dono do rascunho, só enquanto editável (draft/submitted/rejected).';

revoke all on function public.set_venue_claim_draft_media_featured(uuid, boolean) from public;
revoke all on function public.set_venue_claim_draft_media_featured(uuid, boolean) from anon;
grant execute on function public.set_venue_claim_draft_media_featured(uuid, boolean) to authenticated;

-- ============================================================================
-- SEÇÃO 3C — Storage: policies para o path de rascunho
-- <venue_id>/claim-draft/<claim_request_id>/...
-- Nunca reaproveita cover/logo/video/gallery (010) — path completamente
-- separado, então nenhum upload de rascunho pode colidir com ou sobrescrever
-- mídia pública já existente antes da aprovação. Leitura não precisa de
-- policy nova: o bucket venue-media já é público (010).
-- ============================================================================

drop policy if exists "qual_e_a_boa claim draft insert media" on storage.objects;

create policy "qual_e_a_boa claim draft insert media"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'venue-media'
  and (storage.foldername(name))[2] = 'claim-draft'
  and (storage.foldername(name))[1] ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
  and (storage.foldername(name))[3] ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
  and exists (
    select 1
    from public.venue_claim_requests r
    -- Comparação como TEXTO, nunca ::uuid no conteúdo do path: o
    -- PostgreSQL não garante avaliação estritamente esquerda->direita de
    -- AND, então o cast podia ser avaliado antes da regex de formato e
    -- lançar erro em vez da policy simplesmente negar. r.id/r.venue_id são
    -- uuid de verdade (vêm da tabela) — só eles são convertidos ::text
    -- pra comparar, nunca o texto do path é convertido ::uuid.
    where r.id::text = (storage.foldername(name))[3]
      and r.venue_id::text = (storage.foldername(name))[1]
      and r.user_id = auth.uid()
      -- CORREÇÃO (auditoria final): 'submitted' também é editável no
      -- fluxo novo — não existe mais um estado intermediário travado
      -- aguardando aprovação; só 'completed' encerra a edição de verdade.
      and r.status in ('draft', 'submitted', 'rejected')
  )
);

-- UPDATE e DELETE precisam da MESMA validação de formato UUID que o
-- INSERT já tinha. Nenhuma das três faz ::uuid no conteúdo do path — o
-- PostgreSQL não garante avaliação estritamente esquerda->direita de AND,
-- então mesmo com a regex antes, um ::uuid no texto do path podia em
-- tese ser avaliado primeiro e lançar erro em vez de a policy
-- simplesmente negar. Comparação é sempre como texto (r.id::text = ...,
-- nunca o inverso) — RLS deve sempre resolver para true/false, nunca
-- depender de um cast não explodir primeiro.
drop policy if exists "qual_e_a_boa claim draft update media" on storage.objects;

create policy "qual_e_a_boa claim draft update media"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'venue-media'
  and (storage.foldername(name))[2] = 'claim-draft'
  and (storage.foldername(name))[1] ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
  and (storage.foldername(name))[3] ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
  and exists (
    select 1
    from public.venue_claim_requests r
    -- Comparação como TEXTO, nunca ::uuid no conteúdo do path: o
    -- PostgreSQL não garante avaliação estritamente esquerda->direita de
    -- AND, então o cast podia ser avaliado antes da regex de formato e
    -- lançar erro em vez da policy simplesmente negar. r.id/r.venue_id são
    -- uuid de verdade (vêm da tabela) — só eles são convertidos ::text
    -- pra comparar, nunca o texto do path é convertido ::uuid.
    where r.id::text = (storage.foldername(name))[3]
      and r.venue_id::text = (storage.foldername(name))[1]
      and r.user_id = auth.uid()
      -- CORREÇÃO (auditoria final): 'submitted' também é editável no
      -- fluxo novo — não existe mais um estado intermediário travado
      -- aguardando aprovação; só 'completed' encerra a edição de verdade.
      and r.status in ('draft', 'submitted', 'rejected')
  )
)
with check (
  bucket_id = 'venue-media'
  and (storage.foldername(name))[2] = 'claim-draft'
  and (storage.foldername(name))[1] ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
  and (storage.foldername(name))[3] ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
  and exists (
    select 1
    from public.venue_claim_requests r
    -- Comparação como TEXTO, nunca ::uuid no conteúdo do path: o
    -- PostgreSQL não garante avaliação estritamente esquerda->direita de
    -- AND, então o cast podia ser avaliado antes da regex de formato e
    -- lançar erro em vez da policy simplesmente negar. r.id/r.venue_id são
    -- uuid de verdade (vêm da tabela) — só eles são convertidos ::text
    -- pra comparar, nunca o texto do path é convertido ::uuid.
    where r.id::text = (storage.foldername(name))[3]
      and r.venue_id::text = (storage.foldername(name))[1]
      and r.user_id = auth.uid()
      -- CORREÇÃO (auditoria final): 'submitted' também é editável no
      -- fluxo novo — não existe mais um estado intermediário travado
      -- aguardando aprovação; só 'completed' encerra a edição de verdade.
      and r.status in ('draft', 'submitted', 'rejected')
  )
);

drop policy if exists "qual_e_a_boa claim draft delete media" on storage.objects;

create policy "qual_e_a_boa claim draft delete media"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'venue-media'
  and (storage.foldername(name))[2] = 'claim-draft'
  and (storage.foldername(name))[1] ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
  and (storage.foldername(name))[3] ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
  and exists (
    select 1
    from public.venue_claim_requests r
    -- Comparação como TEXTO, nunca ::uuid no conteúdo do path: o
    -- PostgreSQL não garante avaliação estritamente esquerda->direita de
    -- AND, então o cast podia ser avaliado antes da regex de formato e
    -- lançar erro em vez da policy simplesmente negar. r.id/r.venue_id são
    -- uuid de verdade (vêm da tabela) — só eles são convertidos ::text
    -- pra comparar, nunca o texto do path é convertido ::uuid.
    where r.id::text = (storage.foldername(name))[3]
      and r.venue_id::text = (storage.foldername(name))[1]
      and r.user_id = auth.uid()
      -- CORREÇÃO (auditoria final): 'submitted' também é editável no
      -- fluxo novo — não existe mais um estado intermediário travado
      -- aguardando aprovação; só 'completed' encerra a edição de verdade.
      and r.status in ('draft', 'submitted', 'rejected')
  )
);

-- ============================================================================
-- SEÇÃO 3D — Planos por estabelecimento
-- ============================================================================
-- public.venue_plans JÁ EXISTE ao vivo (confirmado por auditoria: id,
-- venue_id, plan_type, click_limit, click_count, started_at, expires_at,
-- created_at) com duas linhas-modelo (venue_id is null): plan_type='free'
-- (click_limit=100) e plan_type='partner' (click_limit=999999,
-- expires_at preenchido). Essas linhas eram usadas como catálogo dentro da
-- própria tabela de contratações — o bloco abaixo separa isso em duas
-- tabelas: venue_plan_definitions (catálogo) e venue_plans (só
-- contratações reais, venue_id obrigatório).

create table if not exists public.venue_plan_definitions (
  plan_type text primary key,
  click_limit integer not null check (click_limit >= 0),
  video_limit integer not null check (video_limit >= 0),
  introductory_price_cents integer check (introductory_price_cents >= 0),
  introductory_months integer check (introductory_months >= 0),
  regular_price_cents integer not null check (regular_price_cents >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.venue_plan_definitions is
  'Catálogo de planos comerciais (free/partner) — definições, não contratações. A contratação real de cada estabelecimento fica em public.venue_plans (venue_id obrigatório). Sem cobrança automática/Stripe aqui — só estrutura e regras.';

drop trigger if exists set_venue_plan_definitions_updated_at on public.venue_plan_definitions;

create trigger set_venue_plan_definitions_updated_at
before update on public.venue_plan_definitions
for each row
execute function public.handle_updated_at();

alter table public.venue_plan_definitions enable row level security;

-- Leitura pública: preços/limites não são dado sensível, e telas como
-- /para-empresas podem querer exibi-los no futuro sem precisar de sessão.
drop policy if exists "Public can read plan definitions" on public.venue_plan_definitions;

create policy "Public can read plan definitions"
on public.venue_plan_definitions
for select
to anon, authenticated
using (true);

drop policy if exists "Admins can manage plan definitions" on public.venue_plan_definitions;

create policy "Admins can manage plan definitions"
on public.venue_plan_definitions
for all
to authenticated
using (public.is_platform_admin())
with check (public.is_platform_admin());

-- Migração segura das duas linhas-modelo: só grava as definições DEPOIS de
-- confirmar o formato exato esperado (2 linhas, plan_type free/partner) —
-- se o formato real for diferente disso, a migration inteira aborta (a
-- transação da migration desfaz tudo) em vez de adivinhar. Idempotente:
-- rodar de novo depois que as linhas-modelo já sumiram não falha (só não
-- faz nada, count = 0).
do $$
declare
  v_model_row_count integer;
  v_free_click_limit integer;
  v_partner_click_limit integer;
begin
  select count(*) into v_model_row_count
  from public.venue_plans
  where venue_id is null;

  if v_model_row_count = 0 then
    -- Já migrado numa execução anterior, ou nunca existiram — nada a fazer.
    null;
  else
    if v_model_row_count <> 2 then
      raise exception
        'venue_plans: esperado exatamente 2 linhas-modelo (venue_id is null), encontrado %. Abortando esta migration — confira manualmente antes de aplicar (ver pré-verificação #3 no topo do arquivo).',
        v_model_row_count;
    end if;

    select click_limit into v_free_click_limit
    from public.venue_plans where venue_id is null and plan_type = 'free';

    select click_limit into v_partner_click_limit
    from public.venue_plans where venue_id is null and plan_type = 'partner';

    if v_free_click_limit is null or v_partner_click_limit is null then
      raise exception
        'venue_plans: as 2 linhas-modelo não têm exatamente plan_type ''free'' e ''partner''. Abortando esta migration — confira manualmente antes de aplicar.';
    end if;

    -- click_limit vem das linhas-modelo reais (nunca hardcoded); video_limit
    -- e preços são os valores comerciais confirmados nesta tarefa — não
    -- existiam em venue_plans antes, então não há de onde "copiar" isso.
    insert into public.venue_plan_definitions
      (plan_type, click_limit, video_limit, introductory_price_cents, introductory_months, regular_price_cents)
    values
      ('free', v_free_click_limit, 1, null, null, 0),
      ('partner', v_partner_click_limit, 20, 9900, 6, 19900)
    on conflict (plan_type) do update set
      click_limit = excluded.click_limit,
      video_limit = excluded.video_limit,
      introductory_price_cents = excluded.introductory_price_cents,
      introductory_months = excluded.introductory_months,
      regular_price_cents = excluded.regular_price_cents,
      updated_at = now();

    -- Só remove as linhas-modelo depois de confirmado que as definições já
    -- foram gravadas com sucesso acima — mesma transação: se qualquer
    -- coisa falhar antes daqui, nada é commitado, as linhas-modelo
    -- continuam intactas.
    delete from public.venue_plans where venue_id is null;
  end if;
end
$$;

-- Reconcilia a estrutura de venue_plans para representar só contratações
-- reais: adiciona "status" (não existia), garante venue_id/plan_type/
-- status obrigatórios, FK de plan_type para o catálogo, e um único plano
-- ativo por estabelecimento. Cada alteração estrutural checa o dado real
-- antes — aborta com mensagem clara em vez de apagar/adivinhar se algo
-- não bater com o esperado.
alter table public.venue_plans
  add column if not exists status text;

update public.venue_plans set status = 'active' where status is null;

alter table public.venue_plans alter column status set default 'active';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'venue_plans_status_check' and conrelid = 'public.venue_plans'::regclass
  ) then
    alter table public.venue_plans
      add constraint venue_plans_status_check check (status in ('active', 'expired', 'canceled'));
  end if;
end
$$;

-- plan_type/status NOT NULL — plan_type já era esperado sempre presente
-- (coluna original), mas confere antes de forçar, mesmo espírito de
-- venue_id abaixo.
do $$
declare
  v_null_plan_type integer;
  v_null_status integer;
begin
  select count(*) into v_null_plan_type from public.venue_plans where plan_type is null;
  if v_null_plan_type > 0 then
    raise exception
      'venue_plans: % linha(s) com plan_type nulo. Abortando — resolva manualmente antes de aplicar.',
      v_null_plan_type;
  end if;

  select count(*) into v_null_status from public.venue_plans where status is null;
  if v_null_status > 0 then
    raise exception
      'venue_plans: % linha(s) com status nulo mesmo após o backfill acima. Abortando.',
      v_null_status;
  end if;
end
$$;

alter table public.venue_plans alter column plan_type set not null;
alter table public.venue_plans alter column status set not null;

do $$
begin
  if not exists (select 1 from public.venue_plans where venue_id is null) then
    alter table public.venue_plans alter column venue_id set not null;
  end if;
end
$$;

-- FK de plan_type para o catálogo — confere que não existe plan_type
-- órfão (sem definição correspondente) antes de adicionar a constraint,
-- já que um plan_type inválido bloquearia a criação da FK de qualquer
-- forma; a mensagem de erro aqui é mais clara que a do Postgres sozinho.
do $$
declare
  v_orphan_count integer;
begin
  select count(*) into v_orphan_count
  from public.venue_plans p
  where not exists (
    select 1 from public.venue_plan_definitions d where d.plan_type = p.plan_type
  );

  if v_orphan_count > 0 then
    raise exception
      'venue_plans: % linha(s) com plan_type sem definição correspondente em venue_plan_definitions. Abortando — resolva manualmente antes de aplicar.',
      v_orphan_count;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'venue_plans_plan_type_fkey' and conrelid = 'public.venue_plans'::regclass
  ) then
    alter table public.venue_plans
      add constraint venue_plans_plan_type_fkey foreign key (plan_type)
      references public.venue_plan_definitions (plan_type);
  end if;
end
$$;

-- click_limit nulo num plano real (venue_id preenchido) — preenche a
-- partir da definição do mesmo plan_type; nunca deixa null num plano
-- real. Seguro rodar depois da FK acima, que já garante plan_type válido.
update public.venue_plans p
set click_limit = d.click_limit
from public.venue_plan_definitions d
where d.plan_type = p.plan_type
  and p.click_limit is null;

-- Um único plano ATIVO por estabelecimento — confere duplicidade antes de
-- criar o índice único parcial (não resolve sozinho, decisão manual).
do $$
declare
  v_dup_count integer;
begin
  select count(*) into v_dup_count
  from (
    select venue_id from public.venue_plans
    where status = 'active'
    group by venue_id having count(*) > 1
  ) dups;

  if v_dup_count > 0 then
    raise exception
      'venue_plans: % estabelecimento(s) com mais de um plano ativo. Abortando — resolva manualmente antes de aplicar (ver pré-verificação no topo deste arquivo).',
      v_dup_count;
  end if;
end
$$;

create unique index if not exists idx_venue_plans_one_active_per_venue
  on public.venue_plans (venue_id)
  where status = 'active';

comment on column public.venue_plans.status is
  'active (plano vigente, no máximo um por estabelecimento — ver índice único parcial) | expired | canceled. Novo — não existia antes desta migration.';

alter table public.venue_plans enable row level security;

drop policy if exists "Owners and managers can read their own venue plan" on public.venue_plans;

create policy "Owners and managers can read their own venue plan"
on public.venue_plans
for select
to authenticated
using (
  exists (
    select 1 from public.venue_members vm
    where vm.venue_id = venue_plans.venue_id
      and vm.user_id = auth.uid()
      and vm.member_role in ('owner', 'manager')
      and vm.is_active = true
  )
);

drop policy if exists "Admins can manage venue plans" on public.venue_plans;

create policy "Admins can manage venue plans"
on public.venue_plans
for all
to authenticated
using (public.is_platform_admin())
with check (public.is_platform_admin());

-- Cria o plano free automaticamente na aprovação quando o estabelecimento
-- ainda não tem nenhum plano ativo — idempotente (só insere se não existir
-- linha com status='active' para esse venue_id), nunca duplica, nunca
-- toca num plano real já existente (preserva click_count).
create or replace function public._ensure_venue_plan(p_venue_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $func$
begin
  -- click_limit vem da definição free no momento da criação (snapshot do
  -- contrato — se a definição mudar depois, planos já criados mantêm o
  -- limite com que começaram, mesma lógica de qualquer contrato real).
  insert into public.venue_plans (venue_id, plan_type, click_limit, click_count, started_at, status)
  select p_venue_id, 'free', d.click_limit, 0, now(), 'active'
  from public.venue_plan_definitions d
  where d.plan_type = 'free'
    and not exists (
      select 1 from public.venue_plans where venue_id = p_venue_id and status = 'active'
    );
end;
$func$;

comment on function public._ensure_venue_plan(uuid) is
  'Garante um plano ativo para o estabelecimento — cria free se não houver nenhum, com click_limit copiado da definição free (nunca null). Idempotente: chamar de novo com um plano já ativo não faz nada (nunca duplica, nunca reseta click_count/click_limit). Usada por approve_venue_claim().';

revoke all on function public._ensure_venue_plan(uuid) from public, anon, authenticated;

-- Limite de vídeo efetivo do estabelecimento — plano ativo real, ou o
-- limite do plano free como padrão (rascunho ainda sem plano específico é
-- tratado como free, ver CORREÇÃO 5).
create or replace function public._venue_effective_video_limit(p_venue_id uuid)
returns integer
language sql
stable
set search_path = ''
as $func$
  select coalesce(
    (
      select d.video_limit
      from public.venue_plans p
      join public.venue_plan_definitions d on d.plan_type = p.plan_type
      where p.venue_id = p_venue_id and p.status = 'active'
      limit 1
    ),
    (select video_limit from public.venue_plan_definitions where plan_type = 'free'),
    1
  );
$func$;

comment on function public._venue_effective_video_limit(uuid) is
  'Limite de vídeos ativos do estabelecimento: video_limit do plano ativo real, ou do plano free se não houver plano ainda (rascunho sem plano = tratado como free), ou 1 como último fallback se nem a definição free existir.';

revoke all on function public._venue_effective_video_limit(uuid) from public, anon, authenticated;

-- ============================================================================
-- SEÇÃO 3E — Regras de vídeo por plano, aplicadas no banco (não só na
-- tela): plano free trava no 1º vídeo; plano partner permite 20 e, ao
-- inserir o 21º, retira de exibição (is_active = false, nunca DELETE) o
-- vídeo ativo NÃO destacado mais antigo — nunca um destacado. Se todos os
-- ativos estiverem destacados, bloqueia o novo envio. Imagens nunca entram
-- nessa contagem. Mesma função de limite (SEÇÃO 3D) usada nos dois
-- gatilhos abaixo, para venue_claim_draft_media (durante o rascunho) e
-- venue_media (canônica, inclusive quando approve_venue_claim consolida).
--
-- CORREÇÃO: os gatilhos agora disparam em INSERT *e* UPDATE — antes só
-- INSERT era coberto, então um UPDATE que reativasse (is_active=true) ou
-- transformasse uma linha em vídeo (media_type='video') contornava o
-- limite. A trava por advisory lock (por venue_id/draft_id) serializa
-- uploads/reativações concorrentes antes da contagem, e a comparação
-- "era vídeo ativo antes vs. é vídeo ativo depois" evita contar a própria
-- linha sendo atualizada duas vezes.
-- ============================================================================

create or replace function public._enforce_draft_media_video_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $func$
declare
  v_venue_id uuid;
  v_becomes_active_video boolean;
  v_was_active_video boolean;
  v_limit integer;
  v_active_count integer;
  v_oldest_id uuid;
begin
  v_becomes_active_video := (new.media_type = 'video' and new.is_active = true);

  if tg_op = 'UPDATE' then
    v_was_active_video := (old.media_type = 'video' and old.is_active = true and old.draft_id = new.draft_id);
  else
    v_was_active_video := false;
  end if;

  -- Nada relevante mudou em relação à contagem (ex.: update de title, ou
  -- um vídeo ativo continua ativo no mesmo rascunho) — passa direto.
  if v_becomes_active_video = v_was_active_video then
    return new;
  end if;

  -- Deixou de contar como vídeo ativo (desativado, virou imagem, ou mudou
  -- de rascunho) — nunca precisa checar limite pra isso.
  if not v_becomes_active_video then
    return new;
  end if;

  -- A partir daqui: a linha está se tornando um vídeo ativo neste rascunho
  -- (insert novo, reativação, mudança de media_type, ou mudança de
  -- draft_id) — precisa respeitar o limite do plano.
  select venue_id into v_venue_id from public.venue_claim_drafts where id = new.draft_id;

  -- Serializa concorrência: dois uploads simultâneos pro mesmo rascunho
  -- nunca contam o espaço livre ao mesmo tempo e ultrapassam o limite.
  perform pg_advisory_xact_lock(hashtext('draft_media_video_limit:' || new.draft_id::text)::bigint);

  v_limit := public._venue_effective_video_limit(v_venue_id);

  select count(*) into v_active_count
  from public.venue_claim_draft_media
  where draft_id = new.draft_id
    and media_type = 'video'
    and is_active = true
    and id <> new.id;

  if v_active_count < v_limit then
    return new;
  end if;

  if v_limit <= 1 then
    raise exception 'Seu plano atual permite só 1 vídeo. Remova o vídeo atual antes de enviar outro.';
  end if;

  select id into v_oldest_id
  from public.venue_claim_draft_media
  where draft_id = new.draft_id
    and media_type = 'video'
    and is_active = true
    and is_featured = false
    and id <> new.id
  order by created_at asc
  limit 1;

  if v_oldest_id is null then
    raise exception 'Limite de % vídeos atingido e todos estão destacados. Remova o destaque de algum antes de enviar outro.', v_limit;
  end if;

  update public.venue_claim_draft_media
  set is_active = false, retired_at = now()
  where id = v_oldest_id;

  return new;
end;
$func$;

comment on function public._enforce_draft_media_video_limit() is
  'Trigger BEFORE INSERT OR UPDATE em venue_claim_draft_media: aplica o limite de vídeos do plano efetivo (SEÇÃO 3D) sempre que a linha PASSA A CONTAR como vídeo ativo (insert, reativação, mudança de media_type ou de draft_id) — updates que não mudam esse estado (ex.: só title) passam direto, sem recontar. Serializado por advisory lock por rascunho. No limite, plano com limite 1 bloqueia; planos com limite maior retiram (soft delete) o vídeo ativo não destacado mais antigo, ou bloqueiam se todos estiverem destacados. Imagens nunca entram nessa contagem.';

-- CORREÇÃO (auditoria final): revoke explícito — funções novas recebem
-- EXECUTE de PUBLIC por padrão no Postgres; funções trigger só podem ser
-- chamadas pelo próprio mecanismo de trigger (Postgres rejeita chamada
-- direta), mas o revoke explícito documenta a intenção e fecha a lacuna
-- de qualquer forma, sem depender só desse comportamento implícito.
revoke all on function public._enforce_draft_media_video_limit() from public, anon, authenticated;

-- Remove os dois nomes possíveis (o antigo, só-INSERT, e o novo) antes de
-- criar — reexecutar este arquivo contra um banco de teste (ex.: já rodou
-- uma vez com o nome novo) nunca falha por trigger duplicado.
drop trigger if exists enforce_video_limit_before_insert on public.venue_claim_draft_media;
drop trigger if exists enforce_video_limit_before_insert_or_update on public.venue_claim_draft_media;

create trigger enforce_video_limit_before_insert_or_update
before insert or update on public.venue_claim_draft_media
for each row
execute function public._enforce_draft_media_video_limit();

create or replace function public._enforce_venue_media_video_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $func$
declare
  v_becomes_active_video boolean;
  v_was_active_video boolean;
  v_limit integer;
  v_active_count integer;
  v_oldest_id uuid;
begin
  v_becomes_active_video := (new.media_type = 'video' and new.is_active = true);

  if tg_op = 'UPDATE' then
    v_was_active_video := (old.media_type = 'video' and old.is_active = true and old.venue_id = new.venue_id);
  else
    v_was_active_video := false;
  end if;

  if v_becomes_active_video = v_was_active_video then
    return new;
  end if;

  if not v_becomes_active_video then
    return new;
  end if;

  perform pg_advisory_xact_lock(hashtext('venue_media_video_limit:' || new.venue_id::text)::bigint);

  v_limit := public._venue_effective_video_limit(new.venue_id);

  select count(*) into v_active_count
  from public.venue_media
  where venue_id = new.venue_id
    and media_type = 'video'
    and is_active = true
    and id <> new.id;

  if v_active_count < v_limit then
    return new;
  end if;

  if v_limit <= 1 then
    raise exception 'Este estabelecimento já tem 1 vídeo ativo (limite do plano). Remova o vídeo atual antes de enviar outro.';
  end if;

  select id into v_oldest_id
  from public.venue_media
  where venue_id = new.venue_id
    and media_type = 'video'
    and is_active = true
    and is_featured = false
    and id <> new.id
  order by created_at asc
  limit 1;

  if v_oldest_id is null then
    raise exception 'Limite de % vídeos atingido e todos estão destacados. Remova o destaque de algum antes de enviar outro.', v_limit;
  end if;

  update public.venue_media
  set is_active = false, retired_at = now()
  where id = v_oldest_id;

  return new;
end;
$func$;

comment on function public._enforce_venue_media_video_limit() is
  'Mesma regra de _enforce_draft_media_video_limit(), aplicada em venue_media (canônica) — vale tanto para o painel do dono escrevendo/reativando via RPC (replace_featured_venue_media, SEÇÃO 3F) quanto para approve_venue_claim() consolidando o rascunho. BEFORE INSERT OR UPDATE, advisory lock por venue_id.';

-- CORREÇÃO (auditoria final): revoke explícito, mesmo motivo de
-- _enforce_draft_media_video_limit() acima.
revoke all on function public._enforce_venue_media_video_limit() from public, anon, authenticated;

drop trigger if exists enforce_video_limit_before_insert on public.venue_media;
drop trigger if exists enforce_video_limit_before_insert_or_update on public.venue_media;

create trigger enforce_video_limit_before_insert_or_update
before insert or update on public.venue_media
for each row
execute function public._enforce_venue_media_video_limit();

-- ============================================================================
-- SEÇÃO 3E-2 — Backfill idempotente de venue_media a partir das colunas
-- antigas (CORREÇÃO: a versão anterior desta migration criava a tabela e
-- as regras, mas nunca migrava dado real pra dentro dela). Roda depois da
-- unique (venue_id, url) e do gatilho de limite de vídeo já existirem —
-- passa pelas mesmas regras que qualquer escrita normal passaria.
-- Nunca apaga cover_image_url/video_url/description nem qualquer outra
-- coluna de public.venues — só espelha o que já existe lá em venue_media
-- também. Idempotente: reexecutar não duplica (on conflict) nem perde o
-- que já estava lá.
-- ============================================================================

-- Capa (cover_image_url -> image, destacada). Cada venue contribui no
-- máximo 1 linha aqui, então nunca colide consigo mesma no índice único
-- parcial de "uma imagem destacada por venue" (todas as linhas desta
-- consulta são de venue_id diferentes entre si).
insert into public.venue_media (venue_id, url, media_type, is_featured, is_active)
select v.id, v.cover_image_url, 'image', true, true
from public.venues v
where v.cover_image_url is not null and trim(v.cover_image_url) <> ''
on conflict (venue_id, url) do update set
  is_featured = true,
  is_active = true,
  retired_at = null;

-- Vídeo (video_url -> video, destacado). No máximo 1 vídeo por venue
-- nesta origem — sempre respeita qualquer limite de plano (até o free,
-- que permite 1), então o gatilho de limite nunca bloqueia nem evita
-- nada durante este backfill especificamente.
insert into public.venue_media (venue_id, url, media_type, is_featured, is_active)
select v.id, v.video_url, 'video', true, true
from public.venues v
where v.video_url is not null and trim(v.video_url) <> ''
on conflict (venue_id, url) do update set
  is_featured = true,
  is_active = true,
  retired_at = null;

-- venue_id NOT NULL: só depois de confirmar que não existe nenhuma linha
-- inválida — aborta com mensagem clara em vez de apagar ou adivinhar.
-- (create table if not exists já declarava "not null" no texto, mas isso
-- é ignorado pelo Postgres quando a tabela já existe ao vivo — como é o
-- caso aqui — então o alter explícito abaixo é o que de fato aplica a
-- restrição contra o schema real.)
do $$
declare
  v_null_count integer;
begin
  select count(*) into v_null_count from public.venue_media where venue_id is null;
  if v_null_count > 0 then
    raise exception
      'venue_media: % linha(s) com venue_id nulo. Abortando — não é seguro apagar ou adivinhar o venue_id correto; resolva manualmente antes de aplicar (ver pré-verificação no topo deste arquivo).',
      v_null_count;
  end if;
end
$$;

do $$
begin
  if not exists (select 1 from public.venue_media where venue_id is null) then
    alter table public.venue_media alter column venue_id set not null;
  end if;
end
$$;

-- ============================================================================
-- SEÇÃO 3F — Substituição segura de mídia canônica (CORREÇÃO 3ª RODADA):
-- a versão da 2ª rodada já inseria a mídia nova sempre com is_featured=false
-- no INSERT, mas o ON CONFLICT DO UPDATE (reativação de uma linha retirada)
-- não zerava is_featured — uma capa antiga retirada, ainda com
-- is_featured=true, podia ser reativada mantendo essa flag e colidir com o
-- índice único parcial se outra imagem já estivesse ativa+destacada nesse
-- momento. Agora: 1) trava por advisory lock; 2) insere/reativa a mídia
-- nova SEMPRE com is_featured=false (INSERT e ON CONFLICT); 3) só depois de
-- confirmada (linha existe, ativa) retira o destaque da capa antiga; 4) só
-- então marca a nova como destacada; 5) sincroniza cover_image_url/
-- video_url na MESMA transação (nunca duas gravações separadas do
-- cliente). Se qualquer passo falhar, a capa antiga continua ativa e
-- destacada — nada é desfeito às cegas. Inclui também add_venue_gallery_media,
-- RPC dedicada para a galeria (imagens nunca destacadas, sempre
-- is_featured=false), consolidando a galeria em venue_media como fonte
-- canônica em vez de só Storage.
-- ============================================================================

create or replace function public.replace_featured_venue_media(
  p_venue_id uuid,
  p_media_type text,
  p_url text,
  p_is_featured boolean default true,
  p_title text default null,
  p_thumbnail_url text default null
)
returns table (
  id uuid,
  url text,
  media_type text,
  is_featured boolean
)
language plpgsql
security definer
set search_path = ''
as $func$
declare
  v_user_id uuid;
  v_can_manage boolean;
  v_new_id uuid;
  v_clean_url text;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'É necessário estar autenticado.';
  end if;

  if p_media_type not in ('image', 'video') then
    raise exception 'Tipo de mídia inválido.';
  end if;

  v_clean_url := trim(coalesce(p_url, ''));
  if v_clean_url = '' then
    raise exception 'URL da mídia é obrigatória.';
  end if;

  select
    public.is_platform_admin()
    or exists (
      select 1 from public.venue_members vm
      where vm.venue_id = p_venue_id
        and vm.user_id = v_user_id
        and vm.member_role in ('owner', 'manager')
        and vm.is_active = true
    )
  into v_can_manage;

  if not v_can_manage then
    raise exception 'Você não tem permissão para gerenciar a mídia deste estabelecimento.';
  end if;

  -- Serializa trocas concorrentes de mídia pro mesmo venue — evita duas
  -- chamadas quase simultâneas disputando o mesmo slot de capa/vídeo ou
  -- colidindo no índice único parcial de imagem destacada.
  perform pg_advisory_xact_lock(hashtext('venue_media_replace:' || p_venue_id::text)::bigint);

  -- 1) Insere ou reativa a mídia NOVA primeiro, sempre com
  --    is_featured=false neste passo (mesmo se p_is_featured=true foi
  --    pedido) — a capa/mídia ANTIGA continua ativa e destacada até
  --    aqui, então marcar a nova como destacada já neste INSERT colidiria
  --    com o índice único parcial de imagem destacada. Reenvio da mesma
  --    URL reativa em vez de duplicar (on conflict). CORREÇÃO (auditoria
  --    3ª rodada): o ON CONFLICT precisa forçar is_featured=false também
  --    na reativação — uma linha antiga retirada pode ter ficado com
  --    is_featured=true (ex.: era a capa quando foi retirada); reativá-la
  --    sem zerar essa flag, enquanto outra imagem já está ativa e
  --    destacada, colide direto com idx_venue_media_one_featured_image_per_venue.
  --    Forçar false aqui é sempre seguro porque o passo 3 é o único lugar
  --    que marca destaque de verdade, sempre depois de a capa antiga já
  --    ter sido retirada no passo 2.
  insert into public.venue_media (venue_id, url, media_type, title, thumbnail_url, is_featured, is_active)
  values (p_venue_id, v_clean_url, p_media_type, p_title, p_thumbnail_url, false, true)
  on conflict (venue_id, url) do update set
    media_type = excluded.media_type,
    title = excluded.title,
    thumbnail_url = excluded.thumbnail_url,
    is_featured = false,
    is_active = true,
    retired_at = null
  returning id into v_new_id;

  -- 2) Só agora, com a mídia nova já confirmada (linha existe e está
  --    ativa), retira o destaque da capa anterior — nunca antes do passo
  --    1 ter sucesso, e nunca a própria linha recém-(re)ativada
  --    (id <> v_new_id). Só se aplica a IMAGEM virando capa: imagem só
  --    pode ter uma ativa destacada por vez. Vídeo nunca retira outro
  --    aqui — vários podem estar destacados ao mesmo tempo (plano
  --    partner); só o gatilho de limite retira por conta própria quando
  --    o teto do plano é excedido.
  if p_media_type = 'image' and p_is_featured then
    update public.venue_media
    set is_active = false, retired_at = now()
    where venue_id = p_venue_id
      and media_type = 'image'
      and is_active = true
      and is_featured = true
      and id <> v_new_id;
  end if;

  -- 3) Só por último marca a mídia nova como destacada de fato — agora
  --    que a antiga já não está mais ativa+destacada, não colide com o
  --    índice único parcial. Update de is_featured sozinho não reconta
  --    limite de vídeo (o gatilho só age quando a linha PASSA A CONTAR
  --    como vídeo ativo, o que já aconteceu no passo 1).
  if p_is_featured then
    update public.venue_media
    set is_featured = true
    where id = v_new_id;
  end if;

  -- 4) Sincroniza cover_image_url/video_url na MESMA transação — nunca
  --    duas gravações separadas do cliente. Vídeo só atualiza video_url
  --    quando também está sendo destacado (mesma semântica do slot único
  --    antigo, que só tinha um vídeo). Se qualquer passo acima já tiver
  --    lançado exceção, esta linha nunca executa — nenhuma referência do
  --    estabelecimento muda.
  if p_is_featured then
    if p_media_type = 'image' then
      update public.venues set cover_image_url = v_clean_url where id = p_venue_id;
    elsif p_media_type = 'video' then
      update public.venues set video_url = v_clean_url where id = p_venue_id;
    end if;
  end if;

  return query
  select v.id, v.url, v.media_type, v.is_featured
  from public.venue_media v
  where v.id = v_new_id;
end;
$func$;

comment on function public.replace_featured_venue_media(uuid, text, text, boolean, text, text) is
  'Único caminho para o painel escrever a capa/vídeo em venue_media: exige owner/manager ativo ou admin, trava por advisory lock, insere/reativa a mídia nova com is_featured=false primeiro (inclusive na reativação via ON CONFLICT, que zera is_featured explicitamente — nunca herda um destaque antigo de quando a linha foi retirada), só depois retira o destaque da capa anterior (só para imagem — vídeo nunca retira outro aqui) e só então marca a nova como destacada, sincronizando cover_image_url/video_url na mesma transação. Se qualquer passo falhar, a mídia anterior continua ativa e nenhuma coluna de venues muda. Sujeita ao limite de vídeo do plano via gatilho.';

revoke all on function public.replace_featured_venue_media(uuid, text, text, boolean, text, text) from public;
revoke all on function public.replace_featured_venue_media(uuid, text, text, boolean, text, text) from anon;
grant execute on function public.replace_featured_venue_media(uuid, text, text, boolean, text, text) to authenticated;

-- Retira (soft delete) uma mídia canônica específica — dono/gestor ou
-- admin, nunca DELETE físico (mesma regra do painel via RLS de UPDATE,
-- mas centralizada aqui para uso do painel de vídeos). Sincroniza
-- cover_image_url/video_url na mesma transação quando a mídia retirada
-- era a referenciada lá — nunca deixa a coluna antiga apontando pra uma
-- linha/arquivo inativo.
create or replace function public.retire_venue_media(p_media_id uuid)
returns table (
  id uuid,
  is_active boolean
)
language plpgsql
security definer
set search_path = ''
as $func$
declare
  v_user_id uuid;
  v_venue_id uuid;
  v_media_type text;
  v_url text;
  v_can_manage boolean;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'É necessário estar autenticado.';
  end if;

  -- CORREÇÃO (investigação real do erro 42P01 — mesma classe de bug
  -- encontrada em outras 3 funções durante a auditoria): "id" sem
  -- qualificador aqui é ambíguo — colide com o parâmetro de saída "id"
  -- de RETURNS TABLE desta própria função, em QUALQUER tabela (venue_media
  -- OU venues, as duas têm coluna id). Qualificado com alias em todo o
  -- corpo.
  select vmed.venue_id, vmed.media_type, vmed.url into v_venue_id, v_media_type, v_url
  from public.venue_media vmed where vmed.id = p_media_id;

  if v_venue_id is null then
    raise exception 'Mídia não encontrada.';
  end if;

  select
    public.is_platform_admin()
    or exists (
      select 1 from public.venue_members vm
      where vm.venue_id = v_venue_id
        and vm.user_id = v_user_id
        and vm.member_role in ('owner', 'manager')
        and vm.is_active = true
    )
  into v_can_manage;

  if not v_can_manage then
    raise exception 'Você não tem permissão para gerenciar a mídia deste estabelecimento.';
  end if;

  update public.venue_media vmed
  set is_active = false, retired_at = now()
  where vmed.id = p_media_id;

  if v_media_type = 'image' then
    update public.venues vn set cover_image_url = null where vn.id = v_venue_id and vn.cover_image_url = v_url;
  elsif v_media_type = 'video' then
    update public.venues vn set video_url = null where vn.id = v_venue_id and vn.video_url = v_url;
  end if;

  return query select p_media_id, false;
end;
$func$;

comment on function public.retire_venue_media(uuid) is
  'Soft delete de uma linha de venue_media (is_active=false) — nunca DELETE físico. Owner/manager ativo do venue ou admin. Limpa cover_image_url/video_url na mesma transação se a mídia retirada era a referenciada lá.';

revoke all on function public.retire_venue_media(uuid) from public;
revoke all on function public.retire_venue_media(uuid) from anon;
grant execute on function public.retire_venue_media(uuid) to authenticated;

-- Alterna o destaque (is_featured) de uma mídia canônica já existente —
-- imagem: retira o destaque de outra imagem ativa antes (só uma capa por
-- vez); vídeo: nunca mexe em outro vídeo (vários podem estar destacados).
create or replace function public.set_venue_media_featured(p_media_id uuid, p_featured boolean)
returns table (
  id uuid,
  is_featured boolean
)
language plpgsql
security definer
set search_path = ''
as $func$
declare
  v_user_id uuid;
  v_venue_id uuid;
  v_media_type text;
  v_url text;
  v_can_manage boolean;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'É necessário estar autenticado.';
  end if;

  -- CORREÇÃO (investigação real do erro 42P01 — mesma classe de bug):
  -- "id"/"is_featured" sem qualificador colidem com os parâmetros de
  -- saída (id, is_featured) desta própria função. Qualificado com alias
  -- em todo o corpo abaixo.
  select vmed.venue_id, vmed.media_type, vmed.url into v_venue_id, v_media_type, v_url
  from public.venue_media vmed where vmed.id = p_media_id and vmed.is_active = true;

  if v_venue_id is null then
    raise exception 'Mídia não encontrada ou não está ativa.';
  end if;

  select
    public.is_platform_admin()
    or exists (
      select 1 from public.venue_members vm
      where vm.venue_id = v_venue_id
        and vm.user_id = v_user_id
        and vm.member_role in ('owner', 'manager')
        and vm.is_active = true
    )
  into v_can_manage;

  if not v_can_manage then
    raise exception 'Você não tem permissão para gerenciar a mídia deste estabelecimento.';
  end if;

  perform pg_advisory_xact_lock(hashtext('venue_media_replace:' || v_venue_id::text)::bigint);

  -- CORREÇÃO: a versão anterior "retirava" (is_active=false) a imagem
  -- antiga em vez de só desmarcar o destaque — ela sumia da galeria por
  -- engano. Agora só desmarca is_featured (nunca desativa), e sempre
  -- ANTES de marcar a nova como destacada — clear-then-set em dois UPDATE
  -- separados nunca deixa duas linhas destacadas+ativas ao mesmo tempo
  -- quando o índice único parcial é conferido (checado por statement).
  if v_media_type = 'image' and p_featured then
    update public.venue_media vmed
    set is_featured = false
    where vmed.venue_id = v_venue_id
      and vmed.media_type = 'image'
      and vmed.is_active = true
      and vmed.is_featured = true
      and vmed.id <> p_media_id;
  end if;

  update public.venue_media vmed
  set is_featured = p_featured
  where vmed.id = p_media_id;

  -- Sincroniza cover_image_url/video_url na mesma transação.
  if v_media_type = 'image' then
    if p_featured then
      update public.venues vn set cover_image_url = v_url where vn.id = v_venue_id;
    else
      update public.venues vn set cover_image_url = null where vn.id = v_venue_id and vn.cover_image_url = v_url;
    end if;
  elsif v_media_type = 'video' then
    if p_featured then
      update public.venues vn set video_url = v_url where vn.id = v_venue_id;
    else
      update public.venues vn set video_url = null where vn.id = v_venue_id and vn.video_url = v_url;
    end if;
  end if;

  return query select p_media_id, p_featured;
end;
$func$;

comment on function public.set_venue_media_featured(uuid, boolean) is
  'Destaca/remove destaque de uma mídia ativa. Imagem: só uma capa ativa por vez (desmarca a anterior, sem desativá-la — continua na galeria). Vídeo: nunca mexe em outro vídeo — vários podem estar destacados ao mesmo tempo (plano partner). Sincroniza cover_image_url/video_url na mesma transação.';

revoke all on function public.set_venue_media_featured(uuid, boolean) from public;
revoke all on function public.set_venue_media_featured(uuid, boolean) from anon;
grant execute on function public.set_venue_media_featured(uuid, boolean) to authenticated;

-- Registra/reativa uma imagem de GALERIA em venue_media (CORREÇÃO —
-- consolidação: a galeria era gerida só no Storage, sem linha canônica
-- nenhuma). Nunca destaca a linha (galeria e capa são conceitos
-- separados: capa é gerida só por replace_featured_venue_media/
-- set_venue_media_featured). Único caminho de escrita permitido para a
-- galeria a partir do painel — nunca INSERT direto do cliente. Também
-- usada para "adotar" uma imagem antiga que só existia no Storage (path
-- <venue_id>/gallery/...), na primeira vez que o dono tenta removê-la:
-- cria a linha aqui e, em seguida, retire_venue_media() faz o soft
-- delete — nunca apagando o arquivo do Storage.
create or replace function public.add_venue_gallery_media(
  p_venue_id uuid,
  p_url text,
  p_title text default null,
  p_thumbnail_url text default null
)
returns table (
  id uuid,
  url text,
  media_type text,
  is_featured boolean
)
language plpgsql
security definer
set search_path = ''
as $func$
declare
  v_user_id uuid;
  v_can_manage boolean;
  v_new_id uuid;
  v_clean_url text;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'É necessário estar autenticado.';
  end if;

  v_clean_url := trim(coalesce(p_url, ''));
  if v_clean_url = '' then
    raise exception 'URL da imagem é obrigatória.';
  end if;

  select
    public.is_platform_admin()
    or exists (
      select 1 from public.venue_members vm
      where vm.venue_id = p_venue_id
        and vm.user_id = v_user_id
        and vm.member_role in ('owner', 'manager')
        and vm.is_active = true
    )
  into v_can_manage;

  if not v_can_manage then
    raise exception 'Você não tem permissão para gerenciar a mídia deste estabelecimento.';
  end if;

  perform pg_advisory_xact_lock(hashtext('venue_media_gallery:' || p_venue_id::text)::bigint);

  -- Nunca deixa esta RPC desmarcar a capa atual por acidente: se a URL
  -- informada já é a imagem ativa+destacada do venue, quem chamou está
  -- confundindo galeria com capa — recusa em vez de silenciosamente
  -- reativar/reescrever a linha com is_featured=false mais abaixo.
  if exists (
    select 1 from public.venue_media
    where venue_id = p_venue_id and url = v_clean_url and is_active = true and is_featured = true
  ) then
    raise exception 'Esta imagem já é a capa atual do estabelecimento — gerencie pela capa, não pela galeria.';
  end if;

  -- Insere ou reativa sempre com is_featured=false — mesma lógica de
  -- segurança do ON CONFLICT de replace_featured_venue_media (SEÇÃO 3F):
  -- uma linha de galeria retirada nunca deve reativar carregando um
  -- destaque antigo.
  insert into public.venue_media (venue_id, url, media_type, title, thumbnail_url, is_featured, is_active)
  values (p_venue_id, v_clean_url, 'image', p_title, p_thumbnail_url, false, true)
  on conflict (venue_id, url) do update set
    title = coalesce(excluded.title, public.venue_media.title),
    thumbnail_url = coalesce(excluded.thumbnail_url, public.venue_media.thumbnail_url),
    is_featured = false,
    is_active = true,
    retired_at = null
  returning id into v_new_id;

  return query
  select v.id, v.url, v.media_type, v.is_featured
  from public.venue_media v
  where v.id = v_new_id;
end;
$func$;

comment on function public.add_venue_gallery_media(uuid, text, text, text) is
  'Registra/reativa uma imagem de galeria (sempre is_featured=false, inclusive na reativação via ON CONFLICT) em venue_media. Recusa se a URL já é a capa ativa do venue (gerenciar pela capa, não pela galeria). Único caminho de escrita direta permitido do painel para a galeria — nunca INSERT direto do cliente. Também usada para adotar imagens antigas que só existiam no Storage, antes de retire_venue_media() fazer o soft delete.';

revoke all on function public.add_venue_gallery_media(uuid, text, text, text) from public;
revoke all on function public.add_venue_gallery_media(uuid, text, text, text) from anon;
grant execute on function public.add_venue_gallery_media(uuid, text, text, text) to authenticated;

-- ============================================================================
-- SEÇÃO 4 — RPCs
-- ============================================================================

-- Funções internas (sem SECURITY DEFINER — herdam o contexto de quem
-- chama; só existem para não duplicar os mesmos dois blocos de
-- jsonb_build_object em start_or_resume_venue_claim). Não expostas via
-- API: revogadas de public/anon/authenticated logo abaixo.
create or replace function public._venue_claim_editable_fields_snapshot(p_venue_id uuid)
returns jsonb
language sql
stable
set search_path = ''
as $func$
  select jsonb_build_object(
    'name', v.name,
    'category', v.category,
    'description', v.description,
    'city', v.city,
    'neighborhood', v.neighborhood,
    'address', v.address,
    'cuisine_types', to_jsonb(coalesce(v.cuisine_types, '{}'::text[])),
    'tags', to_jsonb(coalesce(v.tags, '{}'::text[])),
    'music_styles', to_jsonb(coalesce(v.music_styles, '{}'::text[])),
    'atmospheres', to_jsonb(coalesce(v.atmospheres, '{}'::text[])),
    'intentions', to_jsonb(coalesce(v.intentions, '{}'::text[])),
    'companions', to_jsonb(coalesce(v.companions, '{}'::text[])),
    'menu_highlights', to_jsonb(coalesce(v.menu_highlights, '{}'::text[])),
    'schedule', to_jsonb(coalesce(v.schedule, '{}'::text[])),
    'price_range', v.price_range,
    'average_price_per_person', v.average_price_per_person,
    'average_price_for_couple', v.average_price_for_couple,
    'whatsapp_number', v.whatsapp_number,
    'whatsapp', v.whatsapp,
    'whatsapp_url', v.whatsapp_url,
    'instagram_url', v.instagram_url,
    'website', v.website,
    'menu_url', v.menu_url,
    'reservation_url', v.reservation_url
  )
  from public.venues v
  where v.id = p_venue_id;
$func$;

create or replace function public._venue_claim_business_hours_snapshot(p_venue_id uuid)
returns jsonb
language sql
stable
set search_path = ''
as $func$
  select coalesce(
    (
      select jsonb_agg(
        jsonb_build_object(
          'day_of_week', h.day_of_week,
          'opens_at', h.opens_at,
          'closes_at', h.closes_at,
          'is_closed', h.is_closed,
          'note', h.note
        )
        order by h.day_of_week
      )
      from public.venue_business_hours h
      where h.venue_id = p_venue_id
    ),
    '[]'::jsonb
  );
$func$;

revoke all on function public._venue_claim_editable_fields_snapshot(uuid) from public, anon, authenticated;
revoke all on function public._venue_claim_business_hours_snapshot(uuid) from public, anon, authenticated;

-- ----------------------------------------------------------------------------
-- start_or_resume_venue_claim: idempotente por (venue_id, usuário) — cria a
-- solicitação + rascunho pré-preenchido na primeira vez, ou devolve o
-- processo já em andamento do próprio usuário nas chamadas seguintes
-- (clique duplo, duas abas, atualizar a página sempre retomam a mesma
-- linha). Nunca aceita user_id do cliente — só auth.uid(). Serializa
-- concorrência com um advisory lock por venue_id: dois usuários (ou duplo
-- clique do mesmo usuário) disputando o mesmo venue nunca criam duas
-- solicitações ativas para ele — reforçado pelo índice único parcial
-- idx_venue_claim_requests_active_per_venue (SEÇÃO 2), que faz a criação
-- falhar mesmo numa corrida hipotética que escapasse do advisory lock.
-- ----------------------------------------------------------------------------
create or replace function public.start_or_resume_venue_claim(
  p_venue_id uuid,
  p_requester_name text default null,
  p_requester_email text default null
)
returns table (
  claim_request_id uuid,
  draft_id uuid,
  status text
)
language plpgsql
security definer
set search_path = ''
as $func$
declare
  v_user_id uuid;
  v_auth_email text;
  v_venue_exists boolean;
  v_has_active_owner boolean;
  v_existing public.venue_claim_requests%rowtype;
  v_draft_id uuid;
  v_new_request_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'É necessário estar autenticado para reivindicar um estabelecimento.';
  end if;

  -- E-mail sempre de auth.users via auth.uid() — nunca do p_requester_email
  -- enviado pelo cliente (que ainda é aceito no parâmetro só por
  -- compatibilidade de assinatura, mas o valor gravado é sempre este).
  -- Não exige email_confirmed_at.
  select email into v_auth_email from auth.users where id = v_user_id;

  select exists (select 1 from public.venues where id = p_venue_id) into v_venue_exists;
  if not v_venue_exists then
    raise exception 'Estabelecimento não encontrado.';
  end if;

  -- Serializa qualquer chamada concorrente para este venue_id — a trava é
  -- liberada sozinha ao fim da transação (xact_lock), sem limpeza manual.
  perform pg_advisory_xact_lock(hashtext('venue_claim:' || p_venue_id::text)::bigint);

  select exists (
    select 1 from public.venue_members
    where venue_id = p_venue_id and is_active = true
  ) into v_has_active_owner;

  if v_has_active_owner then
    raise exception 'Este estabelecimento já tem um proprietário ativo.';
  end if;

  -- CORREÇÃO (auditoria final): usuário removido por um admin
  -- (admin_remove_venue_owner) não pode simplesmente reivindicar o mesmo
  -- estabelecimento de novo — só um admin libera, via
  -- admin_release_venue_owner_block().
  -- CORREÇÃO (auditoria final 2): filtra pelos snapshots (identidade
  -- permanente, not null), não mais venue_id/blocked_user_id.
  if exists (
    select 1 from public.venue_owner_reclaim_blocks
    where venue_id_snapshot = p_venue_id and blocked_user_id_snapshot = v_user_id and is_active = true
  ) then
    raise exception 'Você não pode reivindicar este estabelecimento novamente. Fale com nossa equipe se precisar de ajuda.';
  end if;

  -- CORREÇÃO (fluxo automático): draft/submitted contam como "em
  -- andamento" e bloqueiam outra conta (não reservam mais 'pending'
  -- nem 'rejected' — SEÇÃO 2). Um 'rejected' legado, porém, só é
  -- retomado se for do PRÓPRIO usuário (nunca bloqueia ninguém, mas
  -- também nunca fragmenta o histórico dele criando um segundo processo
  -- pro mesmo venue quando ele volta a tentar).
  -- CORREÇÃO (erro real no Supabase: 42P01 "relation v_draft_id does not
  -- exist"): venue_claim_requests qualificada com o alias cr — sem isso,
  -- "status"/"venue_id"/"user_id"/"created_at" ficam ambíguos contra os
  -- parâmetros de saída de RETURNS TABLE desta função (claim_request_id,
  -- draft_id, status), e o Postgres real rejeita a função ao aplicar.
  select cr.*
  into v_existing
  from public.venue_claim_requests cr
  where cr.venue_id = p_venue_id
    and (
      cr.status in ('draft', 'submitted')
      or (cr.status = 'rejected' and cr.user_id = v_user_id)
    )
  order by case when cr.status in ('draft', 'submitted') then 0 else 1 end, cr.created_at desc
  limit 1;

  if found then
    if v_existing.status in ('draft', 'submitted') and v_existing.user_id <> v_user_id then
      raise exception 'Este estabelecimento já está em processo de atualização por outra conta.';
    end if;

    -- CORREÇÃO (investigação real do erro 42P01): "claim_request_id" sem
    -- qualificador aqui é ambíguo — colide com o parâmetro de saída
    -- claim_request_id desta própria função (RETURNS TABLE). Este ponto
    -- tinha ficado de fora da correção anterior (só a query de
    -- venue_claim_requests, mais acima, tinha sido qualificada).
    select vcd.id into v_draft_id
    from public.venue_claim_drafts vcd
    where vcd.claim_request_id = v_existing.id;

    if v_draft_id is null then
      insert into public.venue_claim_drafts (claim_request_id, venue_id, user_id, venue_data, business_hours)
      values (
        v_existing.id,
        p_venue_id,
        v_user_id,
        public._venue_claim_editable_fields_snapshot(p_venue_id),
        public._venue_claim_business_hours_snapshot(p_venue_id)
      )
      returning id into v_draft_id;
    end if;

    -- Mantém o e-mail em dia com auth.users mesmo ao só retomar (ex.: se
    -- mudou desde a criação da solicitação).
    update public.venue_claim_requests
    set requester_email = coalesce(v_auth_email, requester_email)
    where id = v_existing.id;

    -- CORREÇÃO (mesmo erro 42P01): RETURN QUERY SELECT com expressões
    -- escalares soltas (sem FROM) é a forma que disparava o erro real no
    -- Postgres — troca por atribuição direta aos parâmetros de saída
    -- (claim_request_id/draft_id/status) + RETURN NEXT, padrão robusto de
    -- RETURNS TABLE que nunca depende de resolução de identificador em
    -- SELECT sem FROM.
    claim_request_id := v_existing.id;
    draft_id := v_draft_id;
    status := v_existing.status;
    return next;
    return;
  end if;

  insert into public.venue_claim_requests
    (venue_id, user_id, status, source, requester_name, requester_email)
  values (
    p_venue_id, v_user_id, 'draft', 'claim_flow',
    nullif(trim(coalesce(p_requester_name, '')), ''),
    v_auth_email
  )
  returning id into v_new_request_id;

  insert into public.venue_claim_drafts (claim_request_id, venue_id, user_id, venue_data, business_hours)
  values (
    v_new_request_id,
    p_venue_id,
    v_user_id,
    public._venue_claim_editable_fields_snapshot(p_venue_id),
    public._venue_claim_business_hours_snapshot(p_venue_id)
  )
  returning id into v_draft_id;

  -- CORREÇÃO (mesmo erro 42P01): mesma troca de RETURN QUERY SELECT
  -- escalar por atribuição + RETURN NEXT.
  claim_request_id := v_new_request_id;
  draft_id := v_draft_id;
  status := 'draft'::text;
  return next;
  return;
end;
$func$;

comment on function public.start_or_resume_venue_claim(uuid, text, text) is
  'Cria ou retoma, de forma idempotente, o processo de reivindicação do usuário autenticado para um estabelecimento — clique duplo, duas abas ou atualizar a página sempre retomam a mesma linha (nunca dependem de estado React). Nunca aceita user_id externo — auth.uid() é a única fonte de identidade. E-mail sempre de auth.users (nunca de user_metadata/p_requester_email do cliente); p_requester_name é só um snapshot de exibição, preenchido pelo cliente a partir da própria sessão, nunca usado para autorização. Bloqueia com mensagem amigável se outro usuário já tem processo ativo para o mesmo venue. Serializado por advisory lock + reforçado pelo índice único parcial de solicitação ativa por venue.';

revoke all on function public.start_or_resume_venue_claim(uuid, text, text) from public;
revoke all on function public.start_or_resume_venue_claim(uuid, text, text) from anon;
grant execute on function public.start_or_resume_venue_claim(uuid, text, text) to authenticated;

-- ----------------------------------------------------------------------------
-- save_venue_claim_draft: só o próprio dono, só enquanto editável
-- (draft/submitted/rejected). Whitelist explícita de chaves — nunca aceita campos
-- administrativos (id, is_published, is_featured, is_verified,
-- verified_at, data_confidence) mesmo que estejam no JSON enviado.
-- ----------------------------------------------------------------------------
create or replace function public.save_venue_claim_draft(
  p_claim_request_id uuid,
  p_venue_data jsonb,
  p_business_hours jsonb
)
returns table (
  draft_id uuid,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $func$
declare
  v_user_id uuid;
  v_request public.venue_claim_requests%rowtype;
  v_clean_data jsonb;
  v_draft_id uuid;
  v_updated_at timestamptz;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'É necessário estar autenticado.';
  end if;

  select * into v_request from public.venue_claim_requests where id = p_claim_request_id;
  if not found then
    raise exception 'Solicitação não encontrada.';
  end if;

  if v_request.user_id <> v_user_id then
    raise exception 'Você não tem permissão para editar este rascunho.';
  end if;

  -- CORREÇÃO (auditoria final): 'submitted' também é editável — o
  -- frontend permite retomar/editar rascunhos com esse status (não existe
  -- mais aprovação manual que o trave), então o banco precisa aceitar o
  -- mesmo conjunto, senão save_venue_claim_draft falhava silenciosamente
  -- pra quem tinha uma solicitação 'submitted' legada.
  if v_request.status not in ('draft', 'submitted', 'rejected') then
    raise exception 'Este cadastro não pode mais ser editado no momento.';
  end if;

  v_clean_data := jsonb_build_object(
    'name', p_venue_data->>'name',
    'category', p_venue_data->>'category',
    'description', p_venue_data->>'description',
    'city', p_venue_data->>'city',
    'neighborhood', p_venue_data->>'neighborhood',
    'address', p_venue_data->>'address',
    'cuisine_types', coalesce(p_venue_data->'cuisine_types', '[]'::jsonb),
    'tags', coalesce(p_venue_data->'tags', '[]'::jsonb),
    'music_styles', coalesce(p_venue_data->'music_styles', '[]'::jsonb),
    'atmospheres', coalesce(p_venue_data->'atmospheres', '[]'::jsonb),
    'intentions', coalesce(p_venue_data->'intentions', '[]'::jsonb),
    'companions', coalesce(p_venue_data->'companions', '[]'::jsonb),
    'menu_highlights', coalesce(p_venue_data->'menu_highlights', '[]'::jsonb),
    'schedule', coalesce(p_venue_data->'schedule', '[]'::jsonb),
    'price_range', p_venue_data->>'price_range',
    'average_price_per_person', nullif(p_venue_data->>'average_price_per_person', '')::numeric,
    'average_price_for_couple', nullif(p_venue_data->>'average_price_for_couple', '')::numeric,
    'whatsapp_number', p_venue_data->>'whatsapp_number',
    'whatsapp', p_venue_data->>'whatsapp',
    'whatsapp_url', p_venue_data->>'whatsapp_url',
    'instagram_url', p_venue_data->>'instagram_url',
    'website', p_venue_data->>'website',
    'menu_url', p_venue_data->>'menu_url',
    'reservation_url', p_venue_data->>'reservation_url'
  );

  update public.venue_claim_drafts
  set venue_data = v_clean_data,
      business_hours = coalesce(p_business_hours, '[]'::jsonb),
      updated_at = now()
  where claim_request_id = p_claim_request_id
  returning id, venue_claim_drafts.updated_at into v_draft_id, v_updated_at;

  if v_draft_id is null then
    raise exception 'Rascunho não encontrado.';
  end if;

  -- CORREÇÃO (mesmo erro 42P01 relatado pelo Supabase): RETURN QUERY
  -- SELECT escalar trocado por atribuição aos parâmetros de saída
  -- (draft_id/updated_at) + RETURN NEXT.
  draft_id := v_draft_id;
  updated_at := v_updated_at;
  return next;
  return;
end;
$func$;

comment on function public.save_venue_claim_draft(uuid, jsonb, jsonb) is
  'Salva o preenchimento do rascunho do próprio usuário — nunca altera public.venues. Whitelist explícita de campos, sempre os mesmos de EDITABLE_VENUE_FIELDS (venue-owner.ts). Só funciona enquanto a solicitação está em draft, submitted ou rejected.';

revoke all on function public.save_venue_claim_draft(uuid, jsonb, jsonb) from public;
revoke all on function public.save_venue_claim_draft(uuid, jsonb, jsonb) from anon;
grant execute on function public.save_venue_claim_draft(uuid, jsonb, jsonb) to authenticated;

-- ----------------------------------------------------------------------------
-- submit_venue_claim_draft: exige os mesmos requisitos mínimos de
-- publish_owned_venue() (nome, descrição, categoria, ao menos um
-- atmosphere) mais ao menos uma mídia no rascunho. Nunca chama
-- publish_owned_venue nem toca is_published — só muda o status da
-- solicitação para 'submitted'.
-- ----------------------------------------------------------------------------
create or replace function public.submit_venue_claim_draft(p_claim_request_id uuid)
returns table (
  claim_request_id uuid,
  status text
)
language plpgsql
security definer
set search_path = ''
as $func$
declare
  v_user_id uuid;
  v_request public.venue_claim_requests%rowtype;
  v_draft public.venue_claim_drafts%rowtype;
  v_has_media boolean;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'É necessário estar autenticado.';
  end if;

  select * into v_request from public.venue_claim_requests where id = p_claim_request_id;
  if not found then
    raise exception 'Solicitação não encontrada.';
  end if;

  if v_request.user_id <> v_user_id then
    raise exception 'Você não tem permissão para enviar este cadastro.';
  end if;

  if v_request.status not in ('draft', 'rejected') then
    raise exception 'Este cadastro já foi enviado ou já foi processado.';
  end if;

  -- CORREÇÃO (investigação real do erro 42P01 — mesma classe de bug):
  -- "claim_request_id" sem qualificador é ambíguo — colide com o
  -- parâmetro de saída claim_request_id desta própria função.
  select vcd.* into v_draft from public.venue_claim_drafts vcd where vcd.claim_request_id = p_claim_request_id;
  if not found then
    raise exception 'Rascunho não encontrado.';
  end if;

  if trim(coalesce(v_draft.venue_data->>'name', '')) = '' then
    raise exception 'O nome do estabelecimento é obrigatório.';
  end if;
  if trim(coalesce(v_draft.venue_data->>'description', '')) = '' then
    raise exception 'A descrição é obrigatória.';
  end if;
  if trim(coalesce(v_draft.venue_data->>'category', '')) = '' then
    raise exception 'A categoria é obrigatória.';
  end if;
  if jsonb_array_length(coalesce(v_draft.venue_data->'atmospheres', '[]'::jsonb)) = 0 then
    raise exception 'Escolha pelo menos um ambiente antes de enviar para aprovação.';
  end if;

  -- Mesma regra de approve_venue_claim: pelo menos uma imagem ATIVA —
  -- vídeo sozinho não é suficiente, e mídia já retirada (is_active=false,
  -- ex.: evitada pelo limite de vídeo) não conta. Checar aqui além de na
  -- aprovação avisa o dono na hora, em vez de só a aprovação falhar depois.
  select exists (
    select 1 from public.venue_claim_draft_media
    where draft_id = v_draft.id and media_type = 'image' and is_active = true
  ) into v_has_media;

  if not v_has_media then
    raise exception 'Adicione ao menos uma imagem ativa (vídeo sozinho não é suficiente) antes de enviar para aprovação.';
  end if;

  update public.venue_claim_requests
  set status = 'submitted',
      reject_reason = null,
      updated_at = now()
  where id = p_claim_request_id;

  return query select p_claim_request_id, 'submitted'::text;
end;
$func$;

comment on function public.submit_venue_claim_draft(uuid) is
  'CORREÇÃO (decisão final do fluxo empresarial + auditoria final): fluxo administrativo descontinuado — o frontend não chama mais esta função, e authenticated não tem mais EXECUTE (revogado abaixo). Diferente de approve_venue_claim/reject_venue_claim (que continuam chamáveis só por quem passa em is_platform_admin() internamente), esta função nunca teve checagem de admin — era self-service por design, então a ÚNICA forma de impedir um usuário comum de recriar o estado "submitted" manual é revogar o EXECUTE por completo. Definição mantida intacta só como registro histórico; ninguém, nem admin, consegue mais chamá-la via RPC.';

revoke all on function public.submit_venue_claim_draft(uuid) from public;
revoke all on function public.submit_venue_claim_draft(uuid) from anon;
revoke all on function public.submit_venue_claim_draft(uuid) from authenticated;

-- ----------------------------------------------------------------------------
-- approve_venue_claim: CORREÇÃO (decisão final do fluxo empresarial) —
-- fluxo administrativo descontinuado; o frontend não chama mais esta
-- função nem reject_venue_claim (ver SEÇÃO 5, complete_existing_venue_
-- onboarding substitui as duas para o caminho novo, sem admin nenhum).
-- Mantida intacta como caminho histórico/de emergência, ainda gated por
-- is_platform_admin(). Transacional (corpo de função = uma transação
-- implícita; qualquer exceção desfaz tudo) e idempotente (reaprovar uma
-- solicitação já aprovada só confirma o estado, não repete os efeitos).
-- Passos de aplicar rascunho/mesclar horários/consolidar mídia agora
-- chamam os mesmos helpers de SEÇÃO 5 usados por complete_existing_venue_
-- onboarding — comportamento desta função não mudou em nada, só deixou
-- de duplicar aquele código.
-- ----------------------------------------------------------------------------
create or replace function public.approve_venue_claim(p_claim_request_id uuid)
returns table (
  venue_id uuid,
  status text
)
language plpgsql
security definer
set search_path = ''
as $func$
declare
  v_request public.venue_claim_requests%rowtype;
  v_draft public.venue_claim_drafts%rowtype;
  v_has_active_image boolean;
begin
  if not public.is_platform_admin() then
    raise exception 'Acesso negado: apenas administradores podem autorizar publicação.';
  end if;

  -- Bloqueia a SOLICITAÇÃO durante a decisão — impede duas chamadas
  -- concorrentes (dois admins clicando aprovar quase ao mesmo tempo) de
  -- processarem a mesma solicitação em paralelo.
  select * into v_request
  from public.venue_claim_requests
  where id = p_claim_request_id
  for update;

  if not found then
    raise exception 'Solicitação não encontrada.';
  end if;

  if v_request.status = 'approved' then
    return query select v_request.venue_id, 'approved'::text;
    return;
  end if;

  if v_request.status <> 'submitted' then
    raise exception 'Esta solicitação não está aguardando aprovação.';
  end if;

  select * into v_draft from public.venue_claim_drafts where claim_request_id = p_claim_request_id;
  if not found then
    raise exception 'Rascunho não encontrado para esta solicitação.';
  end if;

  -- Bloqueia o VENUE também — impede uma segunda aprovação simultânea de
  -- outra solicitação para o mesmo estabelecimento (não deveria existir,
  -- dado o índice único parcial de solicitação ativa, mas a trava aqui é
  -- defesa em profundidade, sem custo).
  perform 1 from public.venues where id = v_draft.venue_id for update;

  -- Revalida os requisitos mínimos contra o rascunho no momento exato da
  -- aprovação — mesmo que submit_venue_claim_draft já tenha validado isso
  -- no envio, o estado não muda entre submitted e aqui (RLS bloqueia
  -- edição nesse intervalo), mas a checagem de novo é barata e evita
  -- confiar cegamente num estado passado.
  if trim(coalesce(v_draft.venue_data->>'name', '')) = '' then
    raise exception 'O nome do estabelecimento é obrigatório.';
  end if;
  if trim(coalesce(v_draft.venue_data->>'description', '')) = '' then
    raise exception 'A descrição é obrigatória.';
  end if;
  if trim(coalesce(v_draft.venue_data->>'category', '')) = '' then
    raise exception 'A categoria é obrigatória.';
  end if;
  if jsonb_array_length(coalesce(v_draft.venue_data->'atmospheres', '[]'::jsonb)) = 0 then
    raise exception 'Escolha pelo menos um ambiente antes de aprovar.';
  end if;

  -- Pelo menos uma imagem ATIVA — vídeo sozinho nunca satisfaz o
  -- requisito de capa/imagem (mesmo espírito de publish_owned_venue, que
  -- exige capa ou galeria, nunca só vídeo).
  select exists (
    select 1 from public.venue_claim_draft_media
    where draft_id = v_draft.id and media_type = 'image' and is_active = true
  ) into v_has_active_image;

  if not v_has_active_image then
    raise exception 'É necessário pelo menos uma imagem ativa (vídeo sozinho não é suficiente) antes de aprovar.';
  end if;

  -- CORREÇÃO (extração para SEÇÃO 5): os passos 1/2/4/4b abaixo agora
  -- chamam os helpers _apply_venue_claim_fields_to_venue/_apply_venue_
  -- claim_hours_to_venue/_consolidate_venue_claim_media (mesmo corpo
  -- exato de antes, só movido para funções reaproveitadas também por
  -- complete_existing_venue_onboarding) — comportamento desta função não
  -- muda em nada.

  -- 1) Aplica os campos editáveis do rascunho ao venue real e publica.
  --    Nunca toca id, is_featured, is_verified, verified_at ou
  --    data_confidence. Campos ausentes do JSON preservam o valor atual
  --    (coalesce); string vazia é um valor válido (limpa o campo), só
  --    chave ausente ou JSON null preserva o que já existia.
  perform public._apply_venue_claim_fields_to_venue(v_draft.venue_id, v_draft.venue_data);

  -- 2) Mescla horários — upsert por dia da semana; um rascunho sem
  --    horários (array vazio) não apaga nenhum dia já cadastrado.
  perform public._apply_venue_claim_hours_to_venue(v_draft.venue_id, v_draft.business_hours);

  -- 3) Garante um plano ativo (free por padrão) ANTES de consolidar mídia
  --    — o gatilho de limite de vídeo de venue_media (SEÇÃO 3E) precisa de
  --    um plano real pra saber o limite certo; idempotente, nunca duplica
  --    nem reseta um plano já existente.
  perform public._ensure_venue_plan(v_draft.venue_id);

  -- 4) Consolida mídia ATIVA do rascunho em venue_media (nunca duplica
  --    pela chave venue_id+url, sujeita ao gatilho de limite de vídeo do
  --    plano) e sincroniza cover_image_url/video_url por compatibilidade.
  perform public._consolidate_venue_claim_media(v_draft.id, v_draft.venue_id);

  -- 5) Vincula o usuário como owner ativo — reaproveita admin_link_venue_owner
  --    (025, já auditada e idempotente via on conflict) em vez de duplicar
  --    a mesma lógica aqui. auth.uid() dentro dela continua resolvendo
  --    para o admin que está chamando approve_venue_claim agora (SECURITY
  --    DEFINER não muda o JWT da sessão, só o papel de execução) — a
  --    checagem de is_platform_admin() dela é redundante com a linha acima,
  --    não um jeito de contorná-la.
  perform public.admin_link_venue_owner(v_draft.venue_id, v_request.user_id);

  -- 6) Marca a solicitação como aprovada.
  update public.venue_claim_requests
  set status = 'approved',
      reviewed_by = auth.uid(),
      reject_reason = null,
      reviewed_at = now(),
      updated_at = now()
  where id = p_claim_request_id;

  return query select v_draft.venue_id, 'approved'::text;
end;
$func$;

comment on function public.approve_venue_claim(uuid) is
  'CORREÇÃO (decisão final do fluxo empresarial): caminho administrativo histórico/de emergência para aprovar uma solicitação — sem uso pelo frontend, que agora publica automaticamente via complete_existing_venue_onboarding() (SEÇÃO 5). Confirma admin, bloqueia solicitação e venue durante a decisão, revalida campos obrigatórios e ao menos uma imagem ativa, aplica os dados do rascunho ao venue real (helpers de SEÇÃO 5, mesma lógica de complete_existing_venue_onboarding), mescla horários sem apagar os existentes, garante um plano ativo (free por padrão, idempotente), consolida mídia em venue_media sem duplicar e sujeita ao limite de vídeo do plano, vincula o owner via admin_link_venue_owner() e publica. Transacional (uma função = uma transação, qualquer erro desfaz tudo) e idempotente (reaprovar uma solicitação já aprovada não repete nenhum efeito — nem owner, nem plano, nem horários, nem mídia).';

revoke all on function public.approve_venue_claim(uuid) from public;
revoke all on function public.approve_venue_claim(uuid) from anon;
grant execute on function public.approve_venue_claim(uuid) to authenticated;

-- ----------------------------------------------------------------------------
-- reject_venue_claim: CORREÇÃO (decisão final do fluxo empresarial) —
-- fluxo administrativo descontinuado; sem uso pelo frontend (não existe
-- mais botão "Recusar" nem rejeição manual no caminho novo). Mantida
-- intacta como caminho histórico/de emergência. Nunca apaga nada — só
-- marca rejected com o motivo, preservando rascunho e mídia intactos.
-- ----------------------------------------------------------------------------
create or replace function public.reject_venue_claim(p_claim_request_id uuid, p_reason text default null)
returns table (
  claim_request_id uuid,
  status text
)
language plpgsql
security definer
set search_path = ''
as $func$
declare
  v_request public.venue_claim_requests%rowtype;
begin
  if not public.is_platform_admin() then
    raise exception 'Acesso negado: apenas administradores podem recusar publicação.';
  end if;

  select * into v_request
  from public.venue_claim_requests
  where id = p_claim_request_id
  for update;

  if not found then
    raise exception 'Solicitação não encontrada.';
  end if;

  if v_request.status <> 'submitted' then
    raise exception 'Esta solicitação não está aguardando aprovação.';
  end if;

  update public.venue_claim_requests
  set status = 'rejected',
      reject_reason = nullif(trim(coalesce(p_reason, '')), ''),
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      updated_at = now()
  where id = p_claim_request_id;

  return query select p_claim_request_id, 'rejected'::text;
end;
$func$;

comment on function public.reject_venue_claim(uuid, text) is
  'CORREÇÃO (decisão final do fluxo empresarial): fluxo administrativo descontinuado, sem uso pelo frontend — mantida só como caminho histórico/de emergência. Recusa uma solicitação enviada para aprovação — nunca apaga conta, rascunho, mídia ou dados.';

revoke all on function public.reject_venue_claim(uuid, text) from public;
revoke all on function public.reject_venue_claim(uuid, text) from anon;
grant execute on function public.reject_venue_claim(uuid, text) to authenticated;

-- ============================================================================
-- SEÇÃO 5 — Publicação automática (SEM aprovação manual), prevenção de
-- duplicatas e remoção administrativa de proprietário (CORREÇÃO — decisão
-- final do fluxo empresarial). approve_venue_claim()/reject_venue_claim()
-- (SEÇÃO 4, acima) continuam existindo intactas como caminho administrativo
-- histórico/de emergência — sem uso pelo frontend a partir de agora; nenhum
-- caminho novo desta seção depende delas.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- _normalize_text: normalização de texto para comparação de duplicatas
-- (nome/cidade/endereço de estabelecimento) — minúsculas, acentos comuns em
-- português removidos via translate() (sem depender da extensão unaccent,
-- não confirmada como instalada — mesma razão já documentada em
-- create_owned_venue desde 012), espaços duplicados colapsados, aparado.
-- Uso interno só de comparação — nunca grava nem exibe o resultado.
-- ----------------------------------------------------------------------------
create or replace function public._normalize_text(p_text text)
returns text
language sql
immutable
set search_path = ''
as $func$
  select trim(
    regexp_replace(
      translate(
        lower(coalesce(p_text, '')),
        'áàãâäéèêëíìîïóòõôöúùûüçñ',
        'aaaaaeeeeiiiiooooouuuucn'
      ),
      '\s+', ' ', 'g'
    )
  );
$func$;

revoke all on function public._normalize_text(text) from public, anon, authenticated;

-- ----------------------------------------------------------------------------
-- _normalize_phone: só dígitos — pra comparar WhatsApp/telefone como
-- evidência forte de duplicata em create_owned_venue(), sem se importar
-- com "+", espaços, parênteses ou hífen usados de formas diferentes.
-- ----------------------------------------------------------------------------
create or replace function public._normalize_phone(p_phone text)
returns text
language sql
immutable
set search_path = ''
as $func$
  select regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g');
$func$;

revoke all on function public._normalize_phone(text) from public, anon, authenticated;

-- ----------------------------------------------------------------------------
-- _venue_hours_jsonb_is_complete: horário "preenchido" para fins de
-- publicação — array não vazio, PELO MENOS UM dia marcado como aberto
-- (nunca os 7 dias fechados por padrão, sem terem sido tocados de
-- verdade), e nenhum dia aberto com opens_at ou closes_at em branco.
-- CORREÇÃO: a primeira versão só checava "nenhum dia aberto sem horário",
-- o que deixava passar um rascunho/venue com os 7 dias no valor padrão
-- (is_closed=true, nunca configurado) como se o horário estivesse
-- preenchido — agora exige pelo menos um dia realmente aberto. Usada
-- tanto sobre o jsonb do rascunho (venue_claim_drafts.business_hours)
-- quanto sobre o snapshot ao vivo de venue_business_hours (via
-- _venue_claim_business_hours_snapshot, SEÇÃO 4) — mesma regra para os
-- dois fluxos.
-- ----------------------------------------------------------------------------
create or replace function public._venue_hours_jsonb_is_complete(p_business_hours jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $func$
  select
    jsonb_typeof(p_business_hours) = 'array'
    and jsonb_array_length(p_business_hours) > 0
    and exists (
      select 1
      from jsonb_to_recordset(p_business_hours)
        as x(day_of_week smallint, opens_at time, closes_at time, is_closed boolean, note text)
      where coalesce(x.is_closed, false) = false
    )
    and not exists (
      select 1
      from jsonb_to_recordset(p_business_hours)
        as x(day_of_week smallint, opens_at time, closes_at time, is_closed boolean, note text)
      where coalesce(x.is_closed, false) = false
        and (x.opens_at is null or x.closes_at is null)
    );
$func$;

revoke all on function public._venue_hours_jsonb_is_complete(jsonb) from public, anon, authenticated;

-- ----------------------------------------------------------------------------
-- _venue_publish_checklist / _venue_publish_missing_summary: REGRA ÚNICA de
-- completude para publicar um estabelecimento — mesmos 6 grupos mostrados
-- no checklist do painel (Dados básicos, Categoria e experiência, Horários,
-- Foto de capa, Vídeo, Contato). Usada por complete_existing_venue_
-- onboarding() (sobre o rascunho) e complete_new_venue_onboarding() (sobre
-- o venue/venue_media/venue_business_hours ao vivo), para as duas nunca
-- divergirem. site/Instagram/link de cardápio/reserva propositalmente NÃO
-- entram aqui — continuam opcionais, como já eram.
-- ----------------------------------------------------------------------------
create or replace function public._venue_publish_checklist(
  p_name text,
  p_category text,
  p_description text,
  p_city text,
  p_neighborhood text,
  p_address text,
  p_price_range text,
  p_average_price_per_person numeric,
  p_whatsapp_number text,
  p_whatsapp text,
  p_whatsapp_url text,
  p_atmospheres text[],
  p_intentions text[],
  p_companions text[],
  p_hours_ok boolean,
  p_has_cover boolean,
  p_has_video boolean
)
returns jsonb
language sql
immutable
set search_path = ''
as $func$
  with flags as (
    select
      (
        trim(coalesce(p_name, '')) <> ''
        and trim(coalesce(p_category, '')) <> ''
        and trim(coalesce(p_description, '')) <> ''
        and trim(coalesce(p_city, '')) <> ''
        and trim(coalesce(p_neighborhood, '')) <> ''
        and trim(coalesce(p_address, '')) <> ''
        and trim(coalesce(p_price_range, '')) <> ''
        and coalesce(p_average_price_per_person, 0) > 0
      ) as basic_data,
      (
        coalesce(array_length(p_atmospheres, 1), 0) > 0
        and coalesce(array_length(p_intentions, 1), 0) > 0
        and coalesce(array_length(p_companions, 1), 0) > 0
      ) as category_experience,
      coalesce(p_hours_ok, false) as hours,
      coalesce(p_has_cover, false) as cover_photo,
      coalesce(p_has_video, false) as video,
      (
        trim(coalesce(p_whatsapp_number, '')) <> ''
        or trim(coalesce(p_whatsapp, '')) <> ''
        or trim(coalesce(p_whatsapp_url, '')) <> ''
      ) as contact
  )
  select jsonb_build_object(
    'basic_data', basic_data,
    'category_experience', category_experience,
    'hours', hours,
    'cover_photo', cover_photo,
    'video', video,
    'contact', contact,
    'complete', basic_data and category_experience and hours and cover_photo and video and contact
  )
  from flags;
$func$;

create or replace function public._venue_publish_missing_summary(p_checklist jsonb)
returns text
language sql
immutable
set search_path = ''
as $func$
  select nullif(
    array_to_string(
      array_remove(
        array[
          case when not coalesce((p_checklist->>'basic_data')::boolean, false) then 'Dados básicos' end,
          case when not coalesce((p_checklist->>'category_experience')::boolean, false) then 'Categoria e experiência' end,
          case when not coalesce((p_checklist->>'hours')::boolean, false) then 'Horários' end,
          case when not coalesce((p_checklist->>'cover_photo')::boolean, false) then 'Foto de capa' end,
          case when not coalesce((p_checklist->>'video')::boolean, false) then 'Vídeo' end,
          case when not coalesce((p_checklist->>'contact')::boolean, false) then 'Contato' end
        ],
        null
      ),
      ', '
    ),
    ''
  );
$func$;

revoke all on function public._venue_publish_checklist(text, text, text, text, text, text, text, numeric, text, text, text, text[], text[], text[], boolean, boolean, boolean) from public, anon, authenticated;
revoke all on function public._venue_publish_missing_summary(jsonb) from public, anon, authenticated;

-- ----------------------------------------------------------------------------
-- Helpers extraídos de approve_venue_claim() (SEÇÃO 4) nesta correção, para
-- serem reaproveitados também por complete_existing_venue_onboarding() sem
-- duplicar a lógica (mesmo corpo exato, só parametrizado). approve_venue_
-- claim() foi atualizada logo abaixo para chamá-los em vez do código
-- inline que tinha antes — comportamento idêntico, nada mudou nela.
-- ----------------------------------------------------------------------------

create or replace function public._apply_venue_claim_fields_to_venue(p_venue_id uuid, p_venue_data jsonb)
returns void
language plpgsql
set search_path = ''
as $func$
begin
  update public.venues
  set
    name = coalesce(p_venue_data->>'name', name),
    category = coalesce(p_venue_data->>'category', category),
    description = coalesce(p_venue_data->>'description', description),
    city = coalesce(p_venue_data->>'city', city),
    neighborhood = coalesce(p_venue_data->>'neighborhood', neighborhood),
    address = coalesce(p_venue_data->>'address', address),
    cuisine_types = case
      when p_venue_data ? 'cuisine_types' and (p_venue_data->'cuisine_types') is not null
        then coalesce((select array_agg(elem) from jsonb_array_elements_text(p_venue_data->'cuisine_types') as elem), '{}'::text[])
      else cuisine_types
    end,
    tags = case
      when p_venue_data ? 'tags' and (p_venue_data->'tags') is not null
        then coalesce((select array_agg(elem) from jsonb_array_elements_text(p_venue_data->'tags') as elem), '{}'::text[])
      else tags
    end,
    music_styles = case
      when p_venue_data ? 'music_styles' and (p_venue_data->'music_styles') is not null
        then coalesce((select array_agg(elem) from jsonb_array_elements_text(p_venue_data->'music_styles') as elem), '{}'::text[])
      else music_styles
    end,
    atmospheres = case
      when p_venue_data ? 'atmospheres' and (p_venue_data->'atmospheres') is not null
        then coalesce((select array_agg(elem) from jsonb_array_elements_text(p_venue_data->'atmospheres') as elem), '{}'::text[])
      else atmospheres
    end,
    intentions = case
      when p_venue_data ? 'intentions' and (p_venue_data->'intentions') is not null
        then coalesce((select array_agg(elem) from jsonb_array_elements_text(p_venue_data->'intentions') as elem), '{}'::text[])
      else intentions
    end,
    companions = case
      when p_venue_data ? 'companions' and (p_venue_data->'companions') is not null
        then coalesce((select array_agg(elem) from jsonb_array_elements_text(p_venue_data->'companions') as elem), '{}'::text[])
      else companions
    end,
    menu_highlights = case
      when p_venue_data ? 'menu_highlights' and (p_venue_data->'menu_highlights') is not null
        then coalesce((select array_agg(elem) from jsonb_array_elements_text(p_venue_data->'menu_highlights') as elem), '{}'::text[])
      else menu_highlights
    end,
    schedule = case
      when p_venue_data ? 'schedule' and (p_venue_data->'schedule') is not null
        then coalesce((select array_agg(elem) from jsonb_array_elements_text(p_venue_data->'schedule') as elem), '{}'::text[])
      else schedule
    end,
    price_range = coalesce(p_venue_data->>'price_range', price_range),
    average_price_per_person = coalesce(nullif(p_venue_data->>'average_price_per_person', '')::numeric, average_price_per_person),
    average_price_for_couple = coalesce(nullif(p_venue_data->>'average_price_for_couple', '')::numeric, average_price_for_couple),
    whatsapp_number = coalesce(p_venue_data->>'whatsapp_number', whatsapp_number),
    whatsapp = coalesce(p_venue_data->>'whatsapp', whatsapp),
    whatsapp_url = coalesce(p_venue_data->>'whatsapp_url', whatsapp_url),
    instagram_url = coalesce(p_venue_data->>'instagram_url', instagram_url),
    website = coalesce(p_venue_data->>'website', website),
    menu_url = coalesce(p_venue_data->>'menu_url', menu_url),
    reservation_url = coalesce(p_venue_data->>'reservation_url', reservation_url),
    is_published = true,
    updated_at = now()
  where id = p_venue_id;
end;
$func$;

comment on function public._apply_venue_claim_fields_to_venue(uuid, jsonb) is
  'Aplica os campos editáveis de um rascunho (mesma whitelist de EDITABLE_VENUE_FIELDS) ao venue real e publica (is_published=true). Nunca toca id/is_featured/is_verified/verified_at/data_confidence. Chave ausente no JSON preserva o valor atual; string vazia limpa o campo.';

revoke all on function public._apply_venue_claim_fields_to_venue(uuid, jsonb) from public, anon, authenticated;

create or replace function public._apply_venue_claim_hours_to_venue(p_venue_id uuid, p_business_hours jsonb)
returns void
language plpgsql
set search_path = ''
as $func$
declare
  v_hour record;
begin
  if jsonb_typeof(p_business_hours) = 'array' and jsonb_array_length(p_business_hours) > 0 then
    for v_hour in
      select *
      from jsonb_to_recordset(p_business_hours)
        as x(day_of_week smallint, opens_at time, closes_at time, is_closed boolean, note text)
    loop
      if v_hour.day_of_week is not null and v_hour.day_of_week between 0 and 6 then
        insert into public.venue_business_hours
          (venue_id, day_of_week, opens_at, closes_at, is_closed, note)
        values (
          p_venue_id, v_hour.day_of_week, v_hour.opens_at, v_hour.closes_at,
          coalesce(v_hour.is_closed, false), v_hour.note
        )
        on conflict (venue_id, day_of_week)
        do update set
          opens_at = excluded.opens_at,
          closes_at = excluded.closes_at,
          is_closed = excluded.is_closed,
          note = excluded.note,
          updated_at = now();
      end if;
    end loop;
  end if;
end;
$func$;

comment on function public._apply_venue_claim_hours_to_venue(uuid, jsonb) is
  'Mescla horários do rascunho em venue_business_hours (upsert por dia da semana). Um rascunho sem horários (array vazio) nunca apaga um dia já cadastrado.';

revoke all on function public._apply_venue_claim_hours_to_venue(uuid, jsonb) from public, anon, authenticated;

create or replace function public._consolidate_venue_claim_media(p_draft_id uuid, p_venue_id uuid)
returns void
language plpgsql
set search_path = ''
as $func$
begin
  insert into public.venue_media (venue_id, url, media_type, title, thumbnail_url, is_featured, created_at)
  select p_venue_id, m.url, m.media_type, m.title, m.thumbnail_url, m.is_featured, m.created_at
  from public.venue_claim_draft_media m
  where m.draft_id = p_draft_id and m.is_active = true
  order by m.created_at asc
  on conflict (venue_id, url) do update set
    media_type = excluded.media_type,
    title = excluded.title,
    thumbnail_url = excluded.thumbnail_url,
    is_featured = excluded.is_featured,
    is_active = true,
    retired_at = null;

  update public.venues v
  set cover_image_url = coalesce(
    (
      select m.url from public.venue_media m
      where m.venue_id = p_venue_id and m.media_type = 'image' and m.is_active = true
      order by m.is_featured desc, m.created_at asc
      limit 1
    ),
    v.cover_image_url
  ),
  video_url = coalesce(
    (
      select m.url from public.venue_media m
      where m.venue_id = p_venue_id and m.media_type = 'video' and m.is_active = true and m.is_featured = true
      order by m.created_at asc
      limit 1
    ),
    v.video_url
  )
  where v.id = p_venue_id;
end;
$func$;

comment on function public._consolidate_venue_claim_media(uuid, uuid) is
  'Consolida mídia ATIVA de um rascunho em venue_media (nunca duplica pela chave venue_id+url, sujeita ao gatilho de limite de vídeo do plano) e sincroniza cover_image_url/video_url por compatibilidade.';

revoke all on function public._consolidate_venue_claim_media(uuid, uuid) from public, anon, authenticated;

-- ----------------------------------------------------------------------------
-- venue_members: no máximo um OWNER ativo por venue_id. Managers não
-- entram nesta restrição (índice filtra member_role='owner'). Pré-checagem
-- primeiro, mesmo padrão do resto do arquivo — aborta com mensagem clara
-- em vez de deixar o create index falhar com um erro genérico.
-- ----------------------------------------------------------------------------
do $$
declare
  v_dup_count integer;
begin
  select count(*) into v_dup_count
  from (
    select venue_id
    from public.venue_members
    where member_role = 'owner' and is_active = true
    group by venue_id
    having count(*) > 1
  ) dups;

  if v_dup_count > 0 then
    raise exception
      'venue_members: % estabelecimento(s) com mais de um owner ativo. Abortando — resolva manualmente antes de aplicar.',
      v_dup_count;
  end if;
end
$$;

create unique index if not exists idx_venue_members_one_active_owner_per_venue
  on public.venue_members (venue_id)
  where member_role = 'owner' and is_active = true;

-- ----------------------------------------------------------------------------
-- complete_existing_venue_onboarding: RPC transacional e idempotente que
-- SUBSTITUI submit_venue_claim_draft + approve_venue_claim para o fluxo
-- novo — o próprio usuário conclui e publica, sem passar por nenhum admin.
-- ----------------------------------------------------------------------------
create or replace function public.complete_existing_venue_onboarding(p_claim_request_id uuid)
returns table (
  venue_id uuid,
  status text,
  completed_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $func$
declare
  v_user_id uuid;
  v_email text;
  v_request public.venue_claim_requests%rowtype;
  v_draft public.venue_claim_drafts%rowtype;
  v_checklist jsonb;
  v_missing text;
  v_has_cover boolean;
  v_has_video boolean;
  v_hours_ok boolean;
  v_completed_at timestamptz;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'É necessário estar autenticado.';
  end if;

  select * into v_request from public.venue_claim_requests where id = p_claim_request_id for update;
  if not found then
    raise exception 'Solicitação não encontrada.';
  end if;

  if v_request.user_id <> v_user_id then
    raise exception 'Esta solicitação não pertence à sua conta.';
  end if;

  -- Idempotente: repetir a chamada depois de já concluído devolve o mesmo
  -- sucesso, sem repetir nenhum efeito (owner, plano, mídia, horário).
  if v_request.status = 'completed' then
    return query select v_request.venue_id, v_request.status, v_request.completed_at;
    return;
  end if;

  -- 'rejected' aceito de propósito: sem rejeição manual no fluxo novo,
  -- uma linha legada com esse status nunca deve ficar travada sem
  -- caminho pra frente — o próprio dono pode completá-la normalmente,
  -- assim que a checklist passar.
  if v_request.status not in ('draft', 'submitted', 'rejected') then
    raise exception 'Este cadastro não pode mais ser concluído (status atual: %).', v_request.status;
  end if;

  -- Serializa por venue_id — mesma trava usada por start_or_resume_venue_
  -- claim e pelas RPCs de mídia canônica: nenhuma outra chamada para o
  -- mesmo estabelecimento (concluir de novo, remover proprietário, etc.)
  -- roda em paralelo com esta.
  perform pg_advisory_xact_lock(hashtext('venue_claim_complete:' || v_request.venue_id::text)::bigint);

  -- Bloqueia o VENUE e o RASCUNHO durante a conclusão — defesa em
  -- profundidade além do advisory lock.
  perform 1 from public.venues where id = v_request.venue_id for update;

  select * into v_draft from public.venue_claim_drafts where claim_request_id = p_claim_request_id for update;
  if not found then
    raise exception 'Rascunho não encontrado para esta solicitação.';
  end if;

  -- E-mail sempre de auth.users via auth.uid() — nunca de user_metadata.
  -- Não exige email_confirmed_at: se "Confirm email" estiver ligado no
  -- Supabase, o próprio login já bloqueia antes de chegar aqui; esta
  -- função não faz essa checagem de novo (ver relatório final).
  select email into v_email from auth.users where id = v_user_id;

  -- CORREÇÃO (auditoria final): defesa em profundidade — mesmo que o
  -- rascunho já existisse antes de um bloqueio ser criado (ex.: admin
  -- removeu o owner enquanto esta pessoa ainda estava com o rascunho
  -- aberto), a conclusão nunca é permitida enquanto o bloqueio estiver
  -- ativo. start_or_resume_venue_claim já nega a criação/retomada, esta é
  -- só a segunda trava.
  -- CORREÇÃO (auditoria final 2): filtra pelos snapshots (identidade
  -- permanente, not null), não mais venue_id/blocked_user_id.
  if exists (
    select 1 from public.venue_owner_reclaim_blocks
    where venue_id_snapshot = v_request.venue_id and blocked_user_id_snapshot = v_user_id and is_active = true
  ) then
    raise exception 'Você não pode concluir este cadastro. Fale com nossa equipe se precisar de ajuda.';
  end if;

  -- Confirma que não existe outro owner ativo — repetir a chamada com o
  -- MESMO usuário que já é o owner ativo é sucesso idempotente (o INSERT
  -- ... ON CONFLICT abaixo trata isso); outro usuário tentando assumir um
  -- venue já ocupado é bloqueado aqui, além do índice único parcial de
  -- owner ativo (defesa final).
  -- CORREÇÃO (investigação real do erro 42P01): "venue_id" sem qualificador
  -- aqui é ambíguo — colide com o parâmetro de saída venue_id desta própria
  -- função (RETURNS TABLE). Qualificado com o alias vm.
  if exists (
    select 1 from public.venue_members vm
    where vm.venue_id = v_request.venue_id
      and vm.member_role = 'owner'
      and vm.is_active = true
      and vm.user_id <> v_user_id
  ) then
    raise exception 'Este estabelecimento já tem um proprietário ativo.';
  end if;

  -- Validação de completude — mesma regra usada no frontend (checklist) e
  -- em complete_new_venue_onboarding(), via _venue_publish_checklist.
  v_hours_ok := public._venue_hours_jsonb_is_complete(v_draft.business_hours);

  select exists (
    select 1 from public.venue_claim_draft_media
    where draft_id = v_draft.id and media_type = 'image' and is_active = true and is_featured = true
  ) into v_has_cover;

  select exists (
    select 1 from public.venue_claim_draft_media
    where draft_id = v_draft.id and media_type = 'video' and is_active = true
  ) into v_has_video;

  v_checklist := public._venue_publish_checklist(
    v_draft.venue_data->>'name',
    v_draft.venue_data->>'category',
    v_draft.venue_data->>'description',
    v_draft.venue_data->>'city',
    v_draft.venue_data->>'neighborhood',
    v_draft.venue_data->>'address',
    v_draft.venue_data->>'price_range',
    nullif(v_draft.venue_data->>'average_price_per_person', '')::numeric,
    v_draft.venue_data->>'whatsapp_number',
    v_draft.venue_data->>'whatsapp',
    v_draft.venue_data->>'whatsapp_url',
    coalesce((select array_agg(elem) from jsonb_array_elements_text(coalesce(v_draft.venue_data->'atmospheres', '[]'::jsonb)) as elem), '{}'::text[]),
    coalesce((select array_agg(elem) from jsonb_array_elements_text(coalesce(v_draft.venue_data->'intentions', '[]'::jsonb)) as elem), '{}'::text[]),
    coalesce((select array_agg(elem) from jsonb_array_elements_text(coalesce(v_draft.venue_data->'companions', '[]'::jsonb)) as elem), '{}'::text[]),
    v_hours_ok,
    v_has_cover,
    v_has_video
  );

  if not (v_checklist->>'complete')::boolean then
    v_missing := public._venue_publish_missing_summary(v_checklist);
    raise exception 'Cadastro incompleto — falta: %.', v_missing;
  end if;

  -- Aplica o rascunho ao venue real, mescla horários, garante plano,
  -- consolida mídia — mesmos helpers compartilhados com approve_venue_
  -- claim() (fluxo administrativo antigo, mantido só como caminho
  -- histórico/de emergência, sem uso pelo frontend).
  perform public._apply_venue_claim_fields_to_venue(v_draft.venue_id, v_draft.venue_data);
  perform public._apply_venue_claim_hours_to_venue(v_draft.venue_id, v_draft.business_hours);
  perform public._ensure_venue_plan(v_draft.venue_id);
  perform public._consolidate_venue_claim_media(v_draft.id, v_draft.venue_id);

  -- Vincula auth.uid() como owner ativo — nunca via admin_link_venue_owner
  -- (exige is_platform_admin(), incompatível com um fluxo self-service).
  -- Idempotente via on conflict na unique (venue_id, user_id) de 005.
  insert into public.venue_members (venue_id, user_id, member_role, is_active)
  values (v_request.venue_id, v_user_id, 'owner', true)
  on conflict (venue_id, user_id) do update set
    member_role = 'owner',
    is_active = true;

  v_completed_at := now();

  -- CORREÇÃO (decisão comercial — exceção legada): conclusão bem-sucedida
  -- da checklist completa desativa qualquer exceção legada ativa deste
  -- venue — a partir daqui ele passa a seguir a regra rígida
  -- permanentemente (perder qualquer requisito depois disso despublica
  -- automaticamente, sem exceção). No-op se nunca existiu exceção.
  update public.venue_legacy_completeness_waivers
  set is_active = false, completed_at = v_completed_at
  where venue_id_snapshot = v_request.venue_id and is_active = true;

  update public.venue_claim_requests
  set status = 'completed',
      completed_at = v_completed_at,
      requester_email = coalesce(v_email, requester_email),
      updated_at = v_completed_at
  where id = p_claim_request_id;

  return query select v_request.venue_id, 'completed'::text, v_completed_at;
end;
$func$;

comment on function public.complete_existing_venue_onboarding(uuid) is
  'Conclui e publica automaticamente o cadastro de um estabelecimento já existente — sem aprovação administrativa. Exige auth.uid() e que a solicitação pertença ao próprio usuário; e-mail sempre de auth.users (nunca user_metadata), sem exigir email_confirmed_at. Trava por advisory lock + FOR UPDATE em venue/solicitação/rascunho. Confirma que não existe outro owner ativo, revalida a checklist completa de publicação (_venue_publish_checklist), aplica o rascunho ao venue, mescla horários, garante plano free, consolida mídia, vincula o próprio usuário como owner e publica — tudo em uma transação (qualquer falha desfaz tudo, nada fica parcialmente publicado). Idempotente: repetir a chamada depois de completed devolve o mesmo sucesso sem duplicar nada.';

revoke all on function public.complete_existing_venue_onboarding(uuid) from public;
revoke all on function public.complete_existing_venue_onboarding(uuid) from anon;
grant execute on function public.complete_existing_venue_onboarding(uuid) to authenticated;

-- ----------------------------------------------------------------------------
-- create_owned_venue: reescrita (CORREÇÃO — auditoria final: duplicata
-- EXATA nunca pode ser confirmada manualmente). A assinatura ganha um 8º
-- parâmetro (p_whatsapp, opcional — o formulário atual não coleta
-- telefone na criação, mas a checagem já fica pronta para quando
-- coletar) e o retorno ganha a coluna is_exact_duplicate. Precisa de DROP
-- explícito das duas versões antigas (6 e 7 argumentos) antes do CREATE
-- OR REPLACE, senão as sobrecargas coexistiriam.
-- ----------------------------------------------------------------------------
drop function if exists public.create_owned_venue(text, text, text, text, text, text);
drop function if exists public.create_owned_venue(text, text, text, text, text, text, boolean);

create or replace function public.create_owned_venue(
  p_name text,
  p_category text,
  p_city text,
  p_neighborhood text,
  p_address text,
  p_description text,
  p_confirm_despite_duplicate boolean default false,
  p_whatsapp text default null
)
returns table (
  venue_id uuid,
  slug text,
  possible_duplicate_id uuid,
  possible_duplicate_name text,
  possible_duplicate_slug text,
  is_exact_duplicate boolean
)
language plpgsql
security definer
set search_path = ''
as $func$
declare
  v_user_id uuid;
  v_venue_id uuid;
  v_base_slug text;
  v_slug text;
  v_suffix int := 0;
  v_norm_name text;
  v_norm_city text;
  v_norm_address text;
  v_norm_phone text;
  v_existing record;
  v_own_match record;
begin
  -- Nunca aceita user_id como parâmetro — a única fonte de identidade é a
  -- sessão autenticada de quem está chamando a função.
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'É necessário estar autenticado para cadastrar um estabelecimento.';
  end if;

  if trim(coalesce(p_name, '')) = '' then
    raise exception 'O nome do estabelecimento é obrigatório.';
  end if;
  if trim(coalesce(p_category, '')) = '' then
    raise exception 'A categoria é obrigatória.';
  end if;
  if trim(coalesce(p_city, '')) = '' then
    raise exception 'A cidade é obrigatória.';
  end if;
  if trim(coalesce(p_neighborhood, '')) = '' then
    raise exception 'O bairro é obrigatório.';
  end if;
  if trim(coalesce(p_address, '')) = '' then
    raise exception 'O endereço é obrigatório.';
  end if;
  if trim(coalesce(p_description, '')) = '' then
    raise exception 'A descrição é obrigatória.';
  end if;

  v_norm_name := public._normalize_text(p_name);
  v_norm_city := public._normalize_text(p_city);
  v_norm_address := public._normalize_text(p_address);
  v_norm_phone := public._normalize_phone(p_whatsapp);

  -- Serializa por nome+cidade normalizados — duas chamadas quase
  -- simultâneas para o "mesmo" estabelecimento (duplo clique, duas abas)
  -- nunca criam duas linhas nem avaliam a checagem de duplicata em
  -- paralelo.
  perform pg_advisory_xact_lock(hashtext('create_owned_venue:' || v_norm_name || '|' || v_norm_city)::bigint);

  -- CORREÇÃO (auditoria final): trava ADICIONAL por telefone+cidade
  -- normalizados, quando informado — sem isto, duas chamadas concorrentes
  -- com NOMES diferentes mas o MESMO telefone (mesma empresa cadastrada
  -- duas vezes com nomes escritos diferente) não seriam serializadas pela
  -- trava de nome+cidade acima, e as duas podiam passar pela checagem de
  -- duplicata exata antes de qualquer uma delas commitar.
  if v_norm_phone <> '' then
    perform pg_advisory_xact_lock(hashtext('create_owned_venue_phone:' || v_norm_phone || '|' || v_norm_city)::bigint);
  end if;

  -- Idempotência: se o PRÓPRIO usuário já é owner ativo de um venue com
  -- nome+cidade normalizados iguais, repetir a chamada devolve esse venue
  -- em vez de criar outro — cobre duplo clique/duas abas sem depender de
  -- estado React, e leva a pessoa direto pro painel existente em vez de
  -- criar outro.
  select v.id, v.slug into v_own_match
  from public.venues v
  join public.venue_members vm on vm.venue_id = v.id
  where vm.user_id = v_user_id
    and vm.member_role = 'owner'
    and vm.is_active = true
    and public._normalize_text(v.name) = v_norm_name
    and public._normalize_text(v.city) = v_norm_city
  limit 1;

  if found then
    return query select v_own_match.id, v_own_match.slug, null::uuid, null::text, null::text, false;
    return;
  end if;

  -- CORREÇÃO (auditoria final): duplicata EXATA — mesmo nome+cidade+
  -- endereço normalizados, OU telefone normalizado igual (quando
  -- informado) na mesma cidade — bloqueia SEMPRE, mesmo com
  -- p_confirm_despite_duplicate=true. Isto roda ANTES da checagem de
  -- confirmação manual abaixo, de propósito: nenhum valor de
  -- p_confirm_despite_duplicate consegue pular este bloco.
  select v.id, v.name, v.slug into v_existing
  from public.venues v
  where public._normalize_text(v.city) = v_norm_city
    and (
      (
        public._normalize_text(v.name) = v_norm_name
        and v_norm_address <> ''
        and trim(coalesce(v.address, '')) <> ''
        and public._normalize_text(v.address) = v_norm_address
      )
      or (
        v_norm_phone <> ''
        and trim(coalesce(v.whatsapp_number, '')) <> ''
        and public._normalize_phone(v.whatsapp_number) = v_norm_phone
      )
    )
  limit 1;

  if found then
    return query select null::uuid, null::text, v_existing.id, v_existing.name, v_existing.slug, true;
    return;
  end if;

  -- Correspondência FRACA (nome OU endereço batem, mas não os dois nem o
  -- telefone): só avisa, nunca mescla nem apaga — a pessoa pode confirmar
  -- que quer criar mesmo assim (p_confirm_despite_duplicate=true).
  if not p_confirm_despite_duplicate then
    select v.id, v.name, v.slug into v_existing
    from public.venues v
    where public._normalize_text(v.city) = v_norm_city
      and (
        public._normalize_text(v.name) = v_norm_name
        or (
          v_norm_address <> ''
          and trim(coalesce(v.address, '')) <> ''
          and public._normalize_text(v.address) = v_norm_address
        )
      )
    limit 1;

    if found then
      return query select null::uuid, null::text, v_existing.id, v_existing.name, v_existing.slug, false;
      return;
    end if;
  end if;

  -- Slug seguro e único a partir do nome — sem depender da extensão
  -- "unaccent" (não confirmada como instalada): caracteres não-ASCII viram
  -- hífen junto com espaços/pontuação ao redor. Nunca fica vazio (fallback
  -- "estabelecimento") e o loop garante unicidade real contra a tabela.
  v_base_slug := lower(regexp_replace(trim(p_name), '[^a-zA-Z0-9]+', '-', 'g'));
  v_base_slug := trim(both '-' from v_base_slug);
  if v_base_slug = '' then
    v_base_slug := 'estabelecimento';
  end if;
  v_slug := v_base_slug;

  while exists (select 1 from public.venues v where v.slug = v_slug) loop
    v_suffix := v_suffix + 1;
    v_slug := v_base_slug || '-' || v_suffix;
  end loop;

  -- whatsapp_number: reaproveita o telefone já coletado no cadastro da
  -- conta (p_whatsapp) — nunca pedido de novo neste formulário. String
  -- vazia/só espaços vira null, nunca uma célula vazia gravada como "".
  insert into public.venues (
    slug, name, category, city, neighborhood, address, description, whatsapp_number,
    is_published, is_featured, is_demo, data_confidence, created_at, updated_at
  )
  values (
    v_slug, trim(p_name), trim(p_category), trim(p_city), trim(p_neighborhood),
    trim(p_address), trim(p_description), nullif(trim(coalesce(p_whatsapp, '')), ''),
    false, false, false, 50, now(), now()
  )
  returning id into v_venue_id;

  -- member_role = 'owner' é um dos dois únicos valores aceitos pelo check
  -- constraint real (owner/manager). is_active = true, sempre.
  insert into public.venue_members (venue_id, user_id, member_role, is_active, created_at)
  values (v_venue_id, v_user_id, 'owner', true, now());

  perform public._ensure_venue_plan(v_venue_id);

  return query select v_venue_id, v_slug, null::uuid, null::text, null::text, false;
end;
$func$;

comment on function public.create_owned_venue(text, text, text, text, text, text, boolean, text) is
  'Cria um novo estabelecimento (is_published=false) e vincula quem chama como owner. p_whatsapp reaproveita o telefone já coletado no cadastro da conta — nunca pedido de novo — e é gravado em whatsapp_number. Serializa por nome+cidade E (quando informado) por telefone+cidade normalizados via dois advisory locks — duas chamadas concorrentes com nomes diferentes mas o mesmo telefone também são serializadas. Idempotente por usuário (repetir a chamada com o mesmo owner e nome+cidade normalizados devolve o venue já criado, leva pro painel existente em vez de duplicar). Duplicata EXATA (nome+cidade+endereço normalizados, ou telefone normalizado igual na mesma cidade) bloqueia SEMPRE — is_exact_duplicate=true, nunca contornável por p_confirm_despite_duplicate. Correspondência fraca (só nome OU só endereço batem) pode ser confirmada via p_confirm_despite_duplicate=true. Nunca mescla nem apaga venues existentes. Garante plano free ao criar.';

revoke all on function public.create_owned_venue(text, text, text, text, text, text, boolean, text) from public;
revoke all on function public.create_owned_venue(text, text, text, text, text, text, boolean, text) from anon;
grant execute on function public.create_owned_venue(text, text, text, text, text, text, boolean, text) to authenticated;

-- ----------------------------------------------------------------------------
-- complete_new_venue_onboarding: publica automaticamente um estabelecimento
-- criado via create_owned_venue(), sem aprovação administrativa — mesma
-- checklist de complete_existing_venue_onboarding(), agora contra as
-- colunas ao vivo do venue/venue_media/venue_business_hours.
-- ----------------------------------------------------------------------------
create or replace function public.complete_new_venue_onboarding(p_venue_id uuid)
returns table (
  venue_id uuid,
  status text
)
language plpgsql
security definer
set search_path = ''
as $func$
declare
  v_user_id uuid;
  v_venue public.venues%rowtype;
  v_can_manage boolean;
  v_checklist jsonb;
  v_missing text;
  v_has_cover boolean;
  v_has_video boolean;
  v_hours_ok boolean;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'É necessário estar autenticado.';
  end if;

  select
    public.is_platform_admin()
    or exists (
      select 1 from public.venue_members vm
      where vm.venue_id = p_venue_id and vm.user_id = v_user_id
        and vm.member_role in ('owner', 'manager') and vm.is_active = true
    )
  into v_can_manage;

  if not v_can_manage then
    raise exception 'Você não tem permissão para publicar este estabelecimento.';
  end if;

  perform pg_advisory_xact_lock(hashtext('venue_claim_complete:' || p_venue_id::text)::bigint);

  select * into v_venue from public.venues where id = p_venue_id for update;
  if not found then
    raise exception 'Estabelecimento não encontrado.';
  end if;

  -- CORREÇÃO (auditoria final): removido o retorno antecipado que
  -- devolvia sucesso sem revalidar quando is_published já era true — um
  -- venue publicado que perdeu um requisito obrigatório depois (vídeo/
  -- capa/horário retirado, campo apagado) NÃO pode mais reportar sucesso
  -- ao chamar esta função de novo. A checklist é SEMPRE recalculada
  -- abaixo, publicado ou não.
  v_hours_ok := public._venue_hours_jsonb_is_complete(public._venue_claim_business_hours_snapshot(p_venue_id));

  -- CORREÇÃO (investigação real do erro 42P01): "venue_id" sem qualificador
  -- é ambíguo — colide com o parâmetro de saída venue_id desta própria
  -- função (RETURNS TABLE). Qualificado com o alias vmed em ambos os selects.
  select exists (
    select 1 from public.venue_media vmed
    where vmed.venue_id = p_venue_id and vmed.media_type = 'image' and vmed.is_active = true and vmed.is_featured = true
  ) into v_has_cover;

  select exists (
    select 1 from public.venue_media vmed
    where vmed.venue_id = p_venue_id and vmed.media_type = 'video' and vmed.is_active = true
  ) into v_has_video;

  v_checklist := public._venue_publish_checklist(
    v_venue.name, v_venue.category, v_venue.description, v_venue.city, v_venue.neighborhood, v_venue.address,
    v_venue.price_range, v_venue.average_price_per_person,
    v_venue.whatsapp_number, v_venue.whatsapp, v_venue.whatsapp_url,
    coalesce(v_venue.atmospheres, '{}'::text[]),
    coalesce(v_venue.intentions, '{}'::text[]),
    coalesce(v_venue.companions, '{}'::text[]),
    v_hours_ok, v_has_cover, v_has_video
  );

  if not (v_checklist->>'complete')::boolean then
    v_missing := public._venue_publish_missing_summary(v_checklist);
    raise exception 'Cadastro incompleto — falta: %.', v_missing;
  end if;

  perform public._ensure_venue_plan(p_venue_id);

  -- Só grava se ainda não estava publicado — idempotente sem repetir
  -- efeito (não bate updated_at à toa quando já estava publicado e
  -- continua completo).
  if not v_venue.is_published then
    update public.venues
    set is_published = true, updated_at = now()
    where id = p_venue_id;
  end if;

  -- CORREÇÃO (decisão comercial — exceção legada): conclusão bem-sucedida
  -- da checklist completa desativa qualquer exceção legada ativa deste
  -- venue — a partir daqui ele passa a seguir a regra rígida
  -- permanentemente. No-op se nunca existiu exceção (caso normal de um
  -- venue novo, que nunca recebe exceção nenhuma).
  update public.venue_legacy_completeness_waivers
  set is_active = false, completed_at = now()
  where venue_id_snapshot = p_venue_id and is_active = true;

  return query select p_venue_id, 'published'::text;
end;
$func$;

comment on function public.complete_new_venue_onboarding(uuid) is
  'Publica automaticamente um estabelecimento criado via create_owned_venue(), sem aprovação administrativa. Exige owner/manager ativo ou admin. SEMPRE revalida a checklist completa (_venue_publish_checklist), mesmo se já estiver publicado — nunca reporta sucesso sobre um cadastro que ficou incompleto depois de publicado. Garante plano free. Desativa qualquer exceção legada ativa (venue_legacy_completeness_waivers) ao concluir com sucesso — dali em diante a regra rígida vale sem exceção. Idempotente: só grava is_published/updated_at se ainda não estava publicado; desativar uma exceção já inativa não faz nada.';

revoke all on function public.complete_new_venue_onboarding(uuid) from public;
revoke all on function public.complete_new_venue_onboarding(uuid) from anon;
grant execute on function public.complete_new_venue_onboarding(uuid) to authenticated;

-- ----------------------------------------------------------------------------
-- venue_auto_unpublish_audit + _enforce_venue_completeness + gatilhos
-- DEFERRED: CORREÇÃO (auditoria final) — um estabelecimento publicado
-- podia perder um requisito obrigatório depois (dono apaga o WhatsApp,
-- retira o último vídeo, apaga a capa, esvazia o horário) e continuar
-- publicado, incompleto, pra sempre — só ficaria incompleto de fato numa
-- próxima chamada manual de complete_new_venue_onboarding(), que agora
-- BLOQUEIA em vez de aceitar. Esta seção garante que a própria alteração
-- que tornou o cadastro incompleto já despublica sozinha, sem esperar
-- ninguém chamar RPC nenhuma.
--
-- venue_auto_unpublish_audit é uma tabela nova e independente (nunca
-- reaproveita venue_owner_removal_audit, que é sobre remoção de
-- proprietário, um evento diferente) — nunca apagada, FK de venue_id com
-- ON DELETE SET NULL (nunca CASCADE — apagar o venue não pode apagar o
-- histórico) e venue_name_snapshot preservando o nome mesmo que o venue
-- deixe de existir. CORREÇÃO (auditoria final 2): venue_id sozinho vira
-- null nesse cenário — venue_id_snapshot é o identificador PERMANENTE,
-- not null, nunca alterado nem apagado, preenchido junto no mesmo INSERT
-- (sempre igual a venue_id no momento da escrita).
-- ----------------------------------------------------------------------------
create table if not exists public.venue_auto_unpublish_audit (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid references public.venues (id) on delete set null,
  venue_id_snapshot uuid not null,
  venue_name_snapshot text not null,
  missing_fields text not null,
  reason text not null,
  created_at timestamptz not null default now()
);

comment on table public.venue_auto_unpublish_audit is
  'Auditoria de despublicação automática (backfill desta migration + gatilhos _enforce_venue_completeness) — nunca apagada. venue_id usa ON DELETE SET NULL (nunca CASCADE): apagar o venue preserva a linha de histórico, só perde a referência viva; venue_id_snapshot (not null, nunca alterado) e venue_name_snapshot preservam o identificador e o nome de qualquer forma. Leitura só para administradores.';

create index if not exists idx_venue_auto_unpublish_audit_venue_id
  on public.venue_auto_unpublish_audit (venue_id_snapshot);

alter table public.venue_auto_unpublish_audit enable row level security;

drop policy if exists "Admins can read auto unpublish audit" on public.venue_auto_unpublish_audit;

create policy "Admins can read auto unpublish audit"
on public.venue_auto_unpublish_audit
for select
to authenticated
using (public.is_platform_admin());

-- Sem policy de INSERT/UPDATE/DELETE de propósito: só
-- _enforce_venue_completeness() (SECURITY DEFINER, chamada pelos
-- gatilhos e pelo backfill abaixo) escreve aqui.

-- ----------------------------------------------------------------------------
-- venue_legacy_completeness_waivers: CORREÇÃO (decisão comercial — exceção
-- legada) — os estabelecimentos que JÁ estavam publicados antes desta
-- migration continuam publicados enquanto o proprietário completa os
-- dados, em vez de serem despublicados pelo backfill. Uma linha por
-- venue_id_snapshot (unique — no máximo uma exceção ativa por
-- estabelecimento); is_active=true é o que mantém o venue publicado
-- mesmo incompleto em _enforce_venue_completeness; completed_at é
-- preenchido só quando a exceção é desativada por uma conclusão bem
-- sucedida (complete_existing_venue_onboarding/complete_new_venue_
-- onboarding). Só o backfill desta migration (mais abaixo) insere linhas
-- aqui — nenhuma RPC de fluxo normal cria uma exceção nova, então nenhum
-- estabelecimento novo pode recebê-la. venue_id usa ON DELETE SET NULL
-- (nunca CASCADE); venue_id_snapshot é o identificador permanente,
-- not null, nunca alterado.
-- ----------------------------------------------------------------------------
create table if not exists public.venue_legacy_completeness_waivers (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid references public.venues (id) on delete set null,
  venue_id_snapshot uuid not null unique,
  venue_name_snapshot text not null,
  missing_fields text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

comment on table public.venue_legacy_completeness_waivers is
  'Exceção legada de completude — criada só pelo backfill desta migration para estabelecimentos que já estavam publicados e incompletos antes da checklist completa existir. Enquanto is_active=true, _enforce_venue_completeness() mantém o venue publicado mesmo incompleto; nenhuma outra função cria linha nova aqui, então nenhum estabelecimento novo recebe esta exceção. Desativada (is_active=false, completed_at=now()) só quando complete_existing_venue_onboarding()/complete_new_venue_onboarding() conclui a checklist completa com sucesso — depois disso o venue passa a seguir a regra rígida permanentemente. venue_id com ON DELETE SET NULL (nunca CASCADE); venue_id_snapshot (not null, unique, nunca alterado) é o identificador permanente. Leitura só para administradores.';

alter table public.venue_legacy_completeness_waivers enable row level security;

drop policy if exists "Admins can read legacy completeness waivers" on public.venue_legacy_completeness_waivers;

create policy "Admins can read legacy completeness waivers"
on public.venue_legacy_completeness_waivers
for select
to authenticated
using (public.is_platform_admin());

-- Sem policy de INSERT/UPDATE/DELETE de propósito: só o backfill desta
-- migration insere (uma vez) e só complete_existing_venue_onboarding()/
-- complete_new_venue_onboarding() (SECURITY DEFINER) desativam depois —
-- nenhuma escrita direta de authenticated/anon, mesmo com GRANT de tabela.

-- ----------------------------------------------------------------------------
-- _enforce_venue_completeness: função central reaproveitada pelo backfill
-- desta migration E pelos 3 gatilhos deferred abaixo — mesma checklist de
-- complete_new_venue_onboarding() (_venue_publish_checklist), nunca
-- duplicada. SECURITY DEFINER: o gatilho pode disparar a partir de um
-- UPDATE direto de authenticated em venues/venue_business_hours (o dono
-- edita pelo painel sem passar por RPC), e a despublicação/auditoria
-- precisa acontecer independentemente do que aquele papel tem de GRANT.
-- Idempotente: se o venue já não está publicado, não faz nada.
-- ----------------------------------------------------------------------------
create or replace function public._enforce_venue_completeness(p_venue_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $func$
declare
  v_venue public.venues%rowtype;
  v_hours_ok boolean;
  v_has_cover boolean;
  v_has_video boolean;
  v_checklist jsonb;
  v_missing text;
  v_has_legacy_waiver boolean;
begin
  select * into v_venue from public.venues where id = p_venue_id for update;

  if not found or not v_venue.is_published then
    return;
  end if;

  v_hours_ok := public._venue_hours_jsonb_is_complete(public._venue_claim_business_hours_snapshot(p_venue_id));

  select exists (
    select 1 from public.venue_media
    where venue_id = p_venue_id and media_type = 'image' and is_active = true and is_featured = true
  ) into v_has_cover;

  select exists (
    select 1 from public.venue_media
    where venue_id = p_venue_id and media_type = 'video' and is_active = true
  ) into v_has_video;

  v_checklist := public._venue_publish_checklist(
    v_venue.name, v_venue.category, v_venue.description, v_venue.city, v_venue.neighborhood, v_venue.address,
    v_venue.price_range, v_venue.average_price_per_person,
    v_venue.whatsapp_number, v_venue.whatsapp, v_venue.whatsapp_url,
    coalesce(v_venue.atmospheres, '{}'::text[]),
    coalesce(v_venue.intentions, '{}'::text[]),
    coalesce(v_venue.companions, '{}'::text[]),
    v_hours_ok, v_has_cover, v_has_video
  );

  if not (v_checklist->>'complete')::boolean then
    -- CORREÇÃO (decisão comercial — exceção legada): estabelecimento com
    -- exceção ATIVA continua publicado mesmo incompleto — nunca
    -- despublica, nunca registra em venue_auto_unpublish_audit (essa
    -- auditoria é só para despublicação de fato; aqui nada muda). Esta
    -- função NUNCA cria uma exceção nova — só lê; a única escrita em
    -- venue_legacy_completeness_waivers é o backfill desta migration
    -- (insere) e as duas RPCs de conclusão (desativam ao completar).
    select exists (
      select 1 from public.venue_legacy_completeness_waivers
      where venue_id_snapshot = p_venue_id and is_active = true
    ) into v_has_legacy_waiver;

    if v_has_legacy_waiver then
      return;
    end if;

    v_missing := public._venue_publish_missing_summary(v_checklist);

    insert into public.venue_auto_unpublish_audit (venue_id, venue_id_snapshot, venue_name_snapshot, missing_fields, reason)
    values (
      p_venue_id,
      p_venue_id,
      v_venue.name,
      v_missing,
      'Despublicado automaticamente: o cadastro publicado perdeu um requisito obrigatório de publicação.'
    );

    update public.venues set is_published = false, updated_at = now() where id = p_venue_id;
  end if;
end;
$func$;

comment on function public._enforce_venue_completeness(uuid) is
  'Reavalia a checklist completa de publicação (_venue_publish_checklist) para um venue já publicado — se ficou incompleto E não tem exceção legada ativa (venue_legacy_completeness_waivers), registra em venue_auto_unpublish_audit e despublica (is_published=false). Estabelecimento com exceção legada ativa fica incompleto sem ser despublicado, até a exceção ser desativada por uma conclusão bem-sucedida. Esta função nunca cria exceção nova, só lê. Não faz nada se o venue não existe ou já não está publicado. Nunca republica sozinha: uma vez despublicado por aqui, só complete_new_venue_onboarding()/publish_owned_venue() (ação explícita do dono) publica de novo.';

revoke all on function public._enforce_venue_completeness(uuid) from public, anon, authenticated;

-- Wrappers de gatilho: extraem o venue_id de cada tabela de origem e
-- chamam a mesma função central. SECURITY DEFINER pelo mesmo motivo de
-- _enforce_venue_completeness — o gatilho roda no contexto de quem
-- disparou o UPDATE/INSERT/DELETE original (authenticated, direto do
-- painel), e a checagem/despublicação não pode depender do GRANT dessa
-- sessão.
create or replace function public._trigger_enforce_venue_completeness_from_venues()
returns trigger
language plpgsql
security definer
set search_path = ''
as $func$
begin
  perform public._enforce_venue_completeness(new.id);
  return null;
end;
$func$;

revoke all on function public._trigger_enforce_venue_completeness_from_venues() from public, anon, authenticated;

-- CORREÇÃO (auditoria final 2): coalesce(new.venue_id, old.venue_id)
-- checava só UM venue — num UPDATE que move a linha de mídia/horário de
-- um estabelecimento pra outro, o venue ANTIGO nunca era reavaliado e
-- podia ficar publicado e incompleto sem ninguém notar. Agora: INSERT
-- confere só NEW; DELETE confere só OLD (referenciar NEW numa trigger de
-- DELETE, ou OLD numa de INSERT, lança erro em plpgsql — por isso o
-- branch por tg_op vem antes de tocar no registro que não existe pra
-- aquela operação); UPDATE confere NEW sempre e OLD também quando o
-- venue_id mudou.
create or replace function public._trigger_enforce_venue_completeness_from_related()
returns trigger
language plpgsql
security definer
set search_path = ''
as $func$
begin
  if tg_op = 'INSERT' then
    if new.venue_id is not null then
      perform public._enforce_venue_completeness(new.venue_id);
    end if;
    return null;
  end if;

  if tg_op = 'DELETE' then
    if old.venue_id is not null then
      perform public._enforce_venue_completeness(old.venue_id);
    end if;
    return null;
  end if;

  -- tg_op = 'UPDATE'
  if new.venue_id is not null then
    perform public._enforce_venue_completeness(new.venue_id);
  end if;

  if old.venue_id is not null and old.venue_id is distinct from new.venue_id then
    perform public._enforce_venue_completeness(old.venue_id);
  end if;

  return null;
end;
$func$;

revoke all on function public._trigger_enforce_venue_completeness_from_related() from public, anon, authenticated;

-- ----------------------------------------------------------------------------
-- Gatilhos CONSTRAINT TRIGGER ... DEFERRABLE INITIALLY DEFERRED: só
-- disparam de fato no COMMIT da transação (ou quando SET CONSTRAINTS
-- fizer isso mais cedo) — nunca no meio de uma troca segura de capa/
-- vídeo (replace_featured_venue_media insere a nova mídia, retira a
-- antiga e marca destaque, tudo dentro de UMA transação; o gatilho só
-- avalia o estado FINAL, depois de tudo aplicado, nunca o estado
-- intermediário "capa antiga já retirada, nova ainda não destacada").
-- Idempotente: disparar várias vezes pro mesmo venue na mesma transação
-- (ex.: dois UPDATEs em venue_media) só recalcula a mesma checklist —
-- _enforce_venue_completeness já é idempotente por si (nada a fazer se
-- já não estiver publicado).
-- ----------------------------------------------------------------------------
drop trigger if exists enforce_venue_completeness_on_venues on public.venues;

create constraint trigger enforce_venue_completeness_on_venues
after insert or update on public.venues
deferrable initially deferred
for each row
when (new.is_published)
execute function public._trigger_enforce_venue_completeness_from_venues();

drop trigger if exists enforce_venue_completeness_on_venue_media on public.venue_media;

create constraint trigger enforce_venue_completeness_on_venue_media
after insert or update or delete on public.venue_media
deferrable initially deferred
for each row
execute function public._trigger_enforce_venue_completeness_from_related();

drop trigger if exists enforce_venue_completeness_on_venue_business_hours on public.venue_business_hours;

create constraint trigger enforce_venue_completeness_on_venue_business_hours
after insert or update or delete on public.venue_business_hours
deferrable initially deferred
for each row
execute function public._trigger_enforce_venue_completeness_from_related();

-- ----------------------------------------------------------------------------
-- Backfill (CORREÇÃO — decisão comercial: exceção legada, substitui o
-- backfill anterior que despublicava): identifica, sem apagar nenhum
-- dado, todo venue JÁ publicado hoje que não atende à checklist completa
-- nova — em vez de despublicar, concede uma exceção legada ATIVA em
-- venue_legacy_completeness_waivers, preservando is_published=true. O
-- proprietário continua com o estabelecimento publicado enquanto conclui
-- os dados; assim que completar tudo de verdade (complete_existing_venue_
-- onboarding/complete_new_venue_onboarding), a exceção é desativada e a
-- regra rígida passa a valer normalmente dali em diante (perder qualquer
-- requisito depois disso despublica automaticamente, sem exceção).
-- NUNCA concede exceção a um venue novo: só processa quem já estava
-- is_published=true ANTES desta migration rodar — um venue novo só fica
-- is_published=true depois de passar pela checklist completa em
-- complete_new_venue_onboarding(), então nunca aparece aqui incompleto.
-- Idempotente por construção: usa ON CONFLICT (venue_id_snapshot) — se a
-- migration for reaplicada, atualiza a mesma linha em vez de duplicar;
-- nenhum venue é despublicado por este bloco.
-- ----------------------------------------------------------------------------
do $$
declare
  v_venue record;
  v_hours_ok boolean;
  v_has_cover boolean;
  v_has_video boolean;
  v_checklist jsonb;
  v_missing text;
begin
  for v_venue in select * from public.venues where is_published = true loop
    v_hours_ok := public._venue_hours_jsonb_is_complete(public._venue_claim_business_hours_snapshot(v_venue.id));

    select exists (
      select 1 from public.venue_media
      where venue_id = v_venue.id and media_type = 'image' and is_active = true and is_featured = true
    ) into v_has_cover;

    select exists (
      select 1 from public.venue_media
      where venue_id = v_venue.id and media_type = 'video' and is_active = true
    ) into v_has_video;

    v_checklist := public._venue_publish_checklist(
      v_venue.name, v_venue.category, v_venue.description, v_venue.city, v_venue.neighborhood, v_venue.address,
      v_venue.price_range, v_venue.average_price_per_person,
      v_venue.whatsapp_number, v_venue.whatsapp, v_venue.whatsapp_url,
      coalesce(v_venue.atmospheres, '{}'::text[]),
      coalesce(v_venue.intentions, '{}'::text[]),
      coalesce(v_venue.companions, '{}'::text[]),
      v_hours_ok, v_has_cover, v_has_video
    );

    if not (v_checklist->>'complete')::boolean then
      v_missing := public._venue_publish_missing_summary(v_checklist);

      insert into public.venue_legacy_completeness_waivers
        (venue_id, venue_id_snapshot, venue_name_snapshot, missing_fields, is_active, completed_at)
      values (v_venue.id, v_venue.id, v_venue.name, v_missing, true, null)
      on conflict (venue_id_snapshot) do update set
        venue_id = excluded.venue_id,
        venue_name_snapshot = excluded.venue_name_snapshot,
        missing_fields = excluded.missing_fields,
        is_active = true,
        completed_at = null;
    end if;
  end loop;
end
$$;

-- ----------------------------------------------------------------------------
-- publish_owned_venue: CORREÇÃO (auditoria final) — a versão antiga
-- (014_create_publish_owned_venue.sql) validava um conjunto de requisitos
-- mais fraco que a checklist nova (_venue_publish_checklist), permitindo
-- publicar um cadastro incompleto (sem horário, sem vídeo, sem WhatsApp
-- etc.) por essa RPC antiga, mesmo com a tela de preview desligada. Em vez
-- de manter duas regras de completude divergentes, esta função vira um
-- wrapper fino e seguro de complete_new_venue_onboarding() — MESMA
-- assinatura (uuid) e MESMO formato de retorno (venue_id, is_published),
-- então nenhuma chamada existente (frontend ou direta via RPC) muda de
-- contrato, mas a validação passa a ser sempre a nova, sem exceção.
-- Qualquer chamada direta a publish_owned_venue por quem descobrir o nome
-- da função continua sujeita à mesma checklist completa — não existe mais
-- caminho nenhum que publique um cadastro incompleto. GRANT/REVOKE já
-- concedidos na SEÇÃO 6 (mesma assinatura, permissão preservada pelo
-- CREATE OR REPLACE).
-- ----------------------------------------------------------------------------
create or replace function public.publish_owned_venue(target_venue_id uuid)
returns table (
  venue_id uuid,
  is_published boolean
)
language plpgsql
security definer
set search_path = ''
as $func$
declare
  v_result record;
begin
  select c.venue_id, c.status into v_result
  from public.complete_new_venue_onboarding(target_venue_id) c;

  return query select v_result.venue_id, (v_result.status = 'published');
end;
$func$;

comment on function public.publish_owned_venue(uuid) is
  'CORREÇÃO: wrapper seguro de complete_new_venue_onboarding() — mantém a assinatura antiga (target_venue_id) e o formato antigo de retorno (venue_id, is_published) por compatibilidade, mas delega toda a validação para a checklist completa nova. Nenhuma chamada a esta função, direta ou pelo frontend, consegue mais publicar um cadastro incompleto.';

-- ----------------------------------------------------------------------------
-- venue_owner_removal_audit + admin_remove_venue_owner: remoção
-- administrativa de proprietário (soft) — nunca apaga usuário, venue,
-- mídia ou plano. Auditoria com RLS, leitura só para admin.
-- ----------------------------------------------------------------------------
-- CORREÇÃO (auditoria final): FKs nunca mais ON DELETE CASCADE — apagar
-- uma conta ou um estabelecimento não pode apagar silenciosamente o
-- histórico de remoção. venue_id/removed_user_id/admin_id usam ON DELETE
-- SET NULL (referência viva opcional, só pra navegação/join quando o
-- registro original ainda existe).
-- CORREÇÃO (auditoria final 2): SET NULL sozinho ainda perde o
-- IDENTIFICADOR quando o registro original é apagado — venue_id_snapshot/
-- removed_user_id_snapshot/admin_id_snapshot são colunas PERMANENTES,
-- not null, preenchidas no mesmo INSERT e nunca alteradas/apagadas
-- depois. venue_name_snapshot e removed_user_email_snapshot (nome/e-mail,
-- já existentes) continuam preservados do mesmo jeito.
create table if not exists public.venue_owner_removal_audit (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid references public.venues (id) on delete set null,
  venue_id_snapshot uuid not null,
  venue_name_snapshot text not null,
  removed_user_id uuid references auth.users (id) on delete set null,
  removed_user_id_snapshot uuid not null,
  removed_user_email_snapshot text,
  admin_id uuid references auth.users (id) on delete set null,
  admin_id_snapshot uuid not null,
  reason text not null,
  created_at timestamptz not null default now()
);

comment on table public.venue_owner_removal_audit is
  'Auditoria de remoção administrativa de proprietário (admin_remove_venue_owner) — nunca apagada, nunca editável fora da própria RPC que a escreve. FKs com ON DELETE SET NULL (nunca CASCADE): apagar o venue/usuário/admin original preserva a linha, só perde a referência viva. venue_id_snapshot/removed_user_id_snapshot/admin_id_snapshot (not null, nunca alterados) preservam os identificadores permanentemente; venue_name_snapshot/removed_user_email_snapshot preservam nome/e-mail. Leitura só para administradores.';

create index if not exists idx_venue_owner_removal_audit_venue_id
  on public.venue_owner_removal_audit (venue_id_snapshot);

alter table public.venue_owner_removal_audit enable row level security;

drop policy if exists "Admins can read owner removal audit" on public.venue_owner_removal_audit;

create policy "Admins can read owner removal audit"
on public.venue_owner_removal_audit
for select
to authenticated
using (public.is_platform_admin());

-- Sem policy de INSERT/UPDATE/DELETE de propósito: a única escrita é
-- admin_remove_venue_owner() (SECURITY DEFINER) — nem admin nem ninguém
-- mais grava aqui direto, mesmo com GRANT de tabela (SEÇÃO 6B só concede
-- SELECT).

-- ----------------------------------------------------------------------------
-- venue_owner_reclaim_blocks: CORREÇÃO (auditoria final) — sem isto, o
-- mesmo usuário removido por um admin podia simplesmente pesquisar o
-- estabelecimento de novo e reivindicá-lo. Uma linha por (venue_id,
-- blocked_user_id); is_active=true bloqueia; released_by/released_at
-- registram quando um admin liberou uma nova tentativa (nunca apagados —
-- a auditoria completa da remoção em si continua intacta em
-- venue_owner_removal_audit, nunca tocada por uma liberação). Só bloqueia
-- o usuário específico removido — nunca o estabelecimento inteiro; outra
-- pessoa continua podendo assumi-lo normalmente sem owner ativo.
-- ----------------------------------------------------------------------------
-- CORREÇÃO (auditoria final): mesmo motivo de venue_owner_removal_audit —
-- FKs com ON DELETE SET NULL, nunca CASCADE.
-- CORREÇÃO (auditoria final 2): SET NULL sozinho perde o identificador —
-- venue_id_snapshot e blocked_user_id_snapshot são colunas PERMANENTES,
-- not null, preenchidas no mesmo INSERT/UPSERT e nunca alteradas depois
-- (o pedido original citava explicitamente blocked_user_id_snapshot;
-- venue_id_snapshot foi incluída aqui também, pelo mesmo raciocínio — sem
-- ela o bloqueio perderia a identidade do estabelecimento do mesmo jeito
-- que perderia a do usuário). A chave de identidade permanente da tabela
-- passa a ser (venue_id_snapshot, blocked_user_id_snapshot) — nunca fica
-- nula, então UNIQUE/índice/ON CONFLICT/consultas de enforcement usam
-- essas colunas, não mais venue_id/blocked_user_id (que continuam só
-- como referência viva opcional, para join).
create table if not exists public.venue_owner_reclaim_blocks (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid references public.venues (id) on delete set null,
  venue_id_snapshot uuid not null,
  venue_name_snapshot text not null,
  blocked_user_id uuid references auth.users (id) on delete set null,
  blocked_user_id_snapshot uuid not null,
  blocked_user_email_snapshot text,
  is_active boolean not null default true,
  reason text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  released_by uuid references auth.users (id) on delete set null,
  released_at timestamptz,
  unique (venue_id_snapshot, blocked_user_id_snapshot)
);

comment on table public.venue_owner_reclaim_blocks is
  'Bloqueio explícito por (venue_id_snapshot, blocked_user_id_snapshot) — identidade permanente, not null, nunca alterada — criado automaticamente por admin_remove_venue_owner(), liberado só por admin_release_venue_owner_block() (nunca apagado, só is_active=false). start_or_resume_venue_claim()/complete_existing_venue_onboarding()/search_claimable_venues() negam acesso enquanto is_active=true. venue_id/blocked_user_id (FKs com ON DELETE SET NULL, nunca CASCADE) são só referência viva opcional; venue_name_snapshot/blocked_user_email_snapshot preservam nome/e-mail mesmo se o venue/usuário original for apagado.';

create index if not exists idx_venue_owner_reclaim_blocks_venue_user
  on public.venue_owner_reclaim_blocks (venue_id_snapshot, blocked_user_id_snapshot)
  where is_active = true;

alter table public.venue_owner_reclaim_blocks enable row level security;

drop policy if exists "Admins can read owner reclaim blocks" on public.venue_owner_reclaim_blocks;

create policy "Admins can read owner reclaim blocks"
on public.venue_owner_reclaim_blocks
for select
to authenticated
using (public.is_platform_admin());

-- Sem policy de INSERT/UPDATE/DELETE de propósito: só admin_remove_venue_
-- owner()/admin_release_venue_owner_block() (SECURITY DEFINER) escrevem
-- aqui — nem admin nem ninguém mais, mesmo com GRANT de tabela.

create or replace function public.admin_remove_venue_owner(p_venue_id uuid, p_reason text)
returns table (
  venue_id uuid,
  removed boolean
)
language plpgsql
security definer
set search_path = ''
as $func$
declare
  v_admin_id uuid;
  v_clean_reason text;
  v_owner_id uuid;
  v_venue_name text;
  v_owner_email text;
begin
  v_admin_id := auth.uid();
  if v_admin_id is null then
    raise exception 'É necessário estar autenticado.';
  end if;

  if not public.is_platform_admin() then
    raise exception 'Acesso negado: apenas administradores podem remover um proprietário.';
  end if;

  v_clean_reason := trim(coalesce(p_reason, ''));
  if v_clean_reason = '' then
    raise exception 'Informe um motivo para a remoção.';
  end if;

  perform pg_advisory_xact_lock(hashtext('venue_claim_complete:' || p_venue_id::text)::bigint);

  select name into v_venue_name from public.venues where id = p_venue_id for update;
  if v_venue_name is null then
    raise exception 'Estabelecimento não encontrado.';
  end if;

  -- CORREÇÃO (investigação real do erro 42P01): "venue_id" sem qualificador
  -- é ambíguo — colide com o parâmetro de saída venue_id desta própria
  -- função (RETURNS TABLE). Qualificado com o alias vm.
  select vm.user_id into v_owner_id
  from public.venue_members vm
  where vm.venue_id = p_venue_id and vm.member_role = 'owner' and vm.is_active = true
  limit 1;

  if v_owner_id is null then
    -- Idempotente: já sem owner ativo — só garante despublicado, sem
    -- registrar auditoria de novo (evita linha duplicada numa repetição).
    update public.venues
    set is_published = false, updated_at = now()
    where id = p_venue_id and is_published = true;

    return query select p_venue_id, false;
    return;
  end if;

  -- Snapshot do e-mail (auth.users) no momento da remoção — CORREÇÃO:
  -- preservado na auditoria mesmo que a conta seja apagada depois (FK com
  -- ON DELETE SET NULL, nunca CASCADE).
  select email into v_owner_email from auth.users where id = v_owner_id;

  update public.venue_members vm
  set is_active = false
  where vm.venue_id = p_venue_id and vm.user_id = v_owner_id and vm.member_role = 'owner' and vm.is_active = true;

  update public.venues
  set is_published = false, updated_at = now()
  where id = p_venue_id;

  insert into public.venue_owner_removal_audit
    (venue_id, venue_id_snapshot, venue_name_snapshot, removed_user_id, removed_user_id_snapshot, removed_user_email_snapshot, admin_id, admin_id_snapshot, reason)
  values (p_venue_id, p_venue_id, v_venue_name, v_owner_id, v_owner_id, v_owner_email, v_admin_id, v_admin_id, v_clean_reason);

  -- Bloqueia explicitamente ESTE usuário para ESTE venue — nunca apaga um
  -- bloqueio anterior liberado, só reativa a mesma linha (on conflict por
  -- venue_id_snapshot+blocked_user_id_snapshot, a identidade permanente),
  -- limpando released_by/released_at do ciclo anterior.
  insert into public.venue_owner_reclaim_blocks
    (venue_id, venue_id_snapshot, venue_name_snapshot, blocked_user_id, blocked_user_id_snapshot, blocked_user_email_snapshot, is_active, reason, created_by, created_at, released_by, released_at)
  values (p_venue_id, p_venue_id, v_venue_name, v_owner_id, v_owner_id, v_owner_email, true, v_clean_reason, v_admin_id, now(), null, null)
  on conflict (venue_id_snapshot, blocked_user_id_snapshot) do update set
    venue_id = excluded.venue_id,
    venue_name_snapshot = excluded.venue_name_snapshot,
    blocked_user_id = excluded.blocked_user_id,
    blocked_user_email_snapshot = excluded.blocked_user_email_snapshot,
    is_active = true,
    reason = excluded.reason,
    created_by = excluded.created_by,
    created_at = now(),
    released_by = null,
    released_at = null;

  return query select p_venue_id, true;
end;
$func$;

comment on function public.admin_remove_venue_owner(uuid, text) is
  'Remove (soft) o proprietário ativo de um estabelecimento — só admin (is_platform_admin()). Nunca apaga usuário, venue, mídia ou plano: marca venue_members.is_active=false e venues.is_published=false, preservando todo o cadastro. Exige motivo não vazio, registrado com venue_id_snapshot/removed_user_id_snapshot/admin_id_snapshot (permanentes, not null) + nome do venue e e-mail do usuário removido, em venue_owner_removal_audit (RLS: só admin lê; FKs com ON DELETE SET NULL, nunca CASCADE — snapshots garantem que o identificador nunca se perde mesmo se venue/usuário forem apagados de verdade). Cria/reativa (por venue_id_snapshot+blocked_user_id_snapshot) um bloqueio explícito em venue_owner_reclaim_blocks para o usuário removido, impedindo que ele reivindique o mesmo estabelecimento de novo até um admin liberar (admin_release_venue_owner_block). Torna o estabelecimento pesquisável de novo para OUTROS usuários (search_claimable_venues exclui por venue_members ativo E pelo bloqueio específico do usuário que faz a busca). Idempotente: sem owner ativo, só garante despublicado, sem duplicar auditoria nem bloqueio.';

revoke all on function public.admin_remove_venue_owner(uuid, text) from public;
revoke all on function public.admin_remove_venue_owner(uuid, text) from anon;
grant execute on function public.admin_remove_venue_owner(uuid, text) to authenticated;

-- ----------------------------------------------------------------------------
-- admin_release_venue_owner_block: "Liberar nova tentativa" — corrige uma
-- remoção feita por engano. Só desativa o bloqueio (is_active=false);
-- nunca apaga a linha nem a auditoria da remoção original em
-- venue_owner_removal_audit. Idempotente (repetir não erra nem duplica).
-- ----------------------------------------------------------------------------
create or replace function public.admin_release_venue_owner_block(p_venue_id uuid, p_user_id uuid)
returns table (
  venue_id uuid,
  released boolean
)
language plpgsql
security definer
set search_path = ''
as $func$
declare
  v_admin_id uuid;
begin
  v_admin_id := auth.uid();
  if v_admin_id is null then
    raise exception 'É necessário estar autenticado.';
  end if;

  if not public.is_platform_admin() then
    raise exception 'Acesso negado: apenas administradores podem liberar uma nova tentativa.';
  end if;

  -- CORREÇÃO (auditoria final 2): filtra pelos snapshots (identidade
  -- permanente, not null), não mais pelas colunas venue_id/blocked_user_id
  -- (que podem virar null via ON DELETE SET NULL).
  update public.venue_owner_reclaim_blocks
  set is_active = false, released_by = v_admin_id, released_at = now()
  where venue_id_snapshot = p_venue_id and blocked_user_id_snapshot = p_user_id and is_active = true;

  return query select p_venue_id, found;
end;
$func$;

comment on function public.admin_release_venue_owner_block(uuid, uuid) is
  '"Liberar nova tentativa" — só admin. Desativa (is_active=false) o bloqueio de venue_owner_reclaim_blocks para o par (venue_id_snapshot, blocked_user_id_snapshot) = (p_venue_id, p_user_id), nunca apaga a linha nem a auditoria da remoção original. Idempotente: sem bloqueio ativo para liberar, devolve released=false sem erro.';

revoke all on function public.admin_release_venue_owner_block(uuid, uuid) from public;
revoke all on function public.admin_release_venue_owner_block(uuid, uuid) from anon;
grant execute on function public.admin_release_venue_owner_block(uuid, uuid) to authenticated;

-- ============================================================================
-- SEÇÃO 6 — Hardening de permissões: PUBLIC revogado de toda função
-- privilegiada, inclusive as antigas reaproveitadas pelo novo fluxo. Só
-- search_claimable_venues é chamável por anon (busca pública, seção 1) —
-- todas as outras exigem authenticated no mínimo, e as administrativas só
-- fazem efeito de fato para quem passa em is_platform_admin() por dentro.
-- Puramente statements de privilégio (revoke/grant), nenhuma função é
-- redefinida aqui — seguro mesmo para as que este arquivo não criou
-- (admin_link_venue_owner, publish_owned_venue, set_venue_verified_status,
-- create_owned_venue já tinham revoke de public/anon nas migrations
-- originais 010/014/025/030; can_manage_venue_registration, criada em 009,
-- não tinha nenhum revoke/grant explícito — reforçado aqui).
-- ============================================================================

revoke all on function public.admin_link_venue_owner(uuid, uuid) from public;
revoke all on function public.admin_link_venue_owner(uuid, uuid) from anon;
grant execute on function public.admin_link_venue_owner(uuid, uuid) to authenticated;

revoke all on function public.publish_owned_venue(uuid) from public;
revoke all on function public.publish_owned_venue(uuid) from anon;
grant execute on function public.publish_owned_venue(uuid) to authenticated;

revoke all on function public.set_venue_verified_status(uuid, boolean) from public;
revoke all on function public.set_venue_verified_status(uuid, boolean) from anon;
grant execute on function public.set_venue_verified_status(uuid, boolean) to authenticated;

-- create_owned_venue: CORREÇÃO — a assinatura de 6 (depois 7) argumentos
-- foi substituída (drop explícito de ambas) pela de 8 na SEÇÃO 5, que já
-- tem seu próprio revoke/grant logo após a definição. Um revoke/grant
-- aqui para qualquer assinatura antiga faria a migration falhar
-- (function does not exist) — removido de propósito, não esquecido.

revoke all on function public.can_manage_venue_registration(uuid) from public;
revoke all on function public.can_manage_venue_registration(uuid) from anon;
grant execute on function public.can_manage_venue_registration(uuid) to authenticated;

revoke all on function public.is_platform_admin() from public;
revoke all on function public.is_platform_admin() from anon;
grant execute on function public.is_platform_admin() to authenticated;

-- ============================================================================
-- SEÇÃO 6B — GRANTs explícitos de tabela para a Data API (CORREÇÃO): esta
-- migration criava tabelas/policies novas mas nunca concedia privilégio
-- de tabela explícito — sem isso, RLS nem chega a ser avaliada (Postgres
-- primeiro checa o GRANT de tabela; só depois, se permitido, aplica a
-- policy linha a linha). Nunca "grant all" — cada tabela recebe só o que
-- o frontend realmente usa direto (o resto passa por RPC SECURITY
-- DEFINER, que não depende destes GRANTs). RLS continua sendo a
-- autoridade real sobre QUAIS linhas cada operação alcança.
-- ============================================================================

-- venue_plan_definitions: catálogo público (preços/limites, sem dado
-- sensível) — leitura pra todo mundo; escrita só chega a valer pra quem
-- passa em is_platform_admin() na policy "for all", mas o GRANT em si é
-- só pra authenticated (anon nunca escreve nada aqui).
grant select on public.venue_plan_definitions to anon, authenticated;
grant insert, update, delete on public.venue_plan_definitions to authenticated;

-- venue_plans: nunca público (contratação real de cada estabelecimento).
-- Sem policy de INSERT/UPDATE/DELETE para o próprio dono — só a policy
-- "for all" de admin cobre escrita; o GRANT abaixo só destrava a
-- TENTATIVA para authenticated, RLS decide se realmente aplica.
grant select on public.venue_plans to authenticated;
grant insert, update, delete on public.venue_plans to authenticated;

-- venue_media: leitura pública (mídia de venue publicado, is_active=true
-- — RLS filtra) e leitura do próprio dono/gestor (mídia inativa
-- inclusive, pro painel gerenciar). CORREÇÃO (auditoria 3ª rodada): SEM
-- NENHUM GRANT de INSERT/UPDATE/DELETE para anon/authenticated — o
-- frontend não escreve mais direto nesta tabela, só via RPCs SECURITY
-- DEFINER (replace_featured_venue_media, retire_venue_media,
-- set_venue_media_featured, add_venue_gallery_media), que não dependem
-- deste GRANT (rodam com o privilégio do dono da função). O revoke
-- explícito abaixo garante que nenhuma escrita direta fica concedida
-- mesmo que esta migration seja reaplicada sobre um estado anterior que
-- já tivesse esse GRANT.
grant select on public.venue_media to anon, authenticated;
revoke insert, update, delete on public.venue_media from anon, authenticated;

-- venue_claim_drafts: nunca público. Só SELECT direto (dono ou admin, via
-- policy) — toda escrita passa pelas RPCs SECURITY DEFINER
-- (start_or_resume_venue_claim/save_venue_claim_draft), que não dependem
-- deste GRANT.
grant select on public.venue_claim_drafts to authenticated;

-- venue_claim_draft_media: SELECT/INSERT/UPDATE para authenticated
-- (sempre sujeitos às policies de dono+estado editável) — sem DELETE:
-- remoção de mídia do rascunho também é soft delete (is_active=false),
-- nunca DELETE físico.
grant select, insert, update on public.venue_claim_draft_media to authenticated;

-- venue_claim_requests: só o que o frontend realmente usa direto hoje é
-- SELECT (o próprio dono ou admin, via policy) — todo INSERT/UPDATE real
-- passa pelas RPCs (start_or_resume_venue_claim cria; submit/approve/
-- reject mudam status), que são SECURITY DEFINER e não dependem deste
-- GRANT. A policy de INSERT "status = 'pending'" (compatibilidade com o
-- formulário antigo) continua definida para o dia em que precisar ser
-- reativada, mas sem o GRANT de INSERT aqui ela fica inatingível por
-- enquanto — intencional, não esquecimento.
grant select on public.venue_claim_requests to authenticated;

-- venue_owner_removal_audit: SELECT para authenticated, mas RLS
-- ("Admins can read owner removal audit", SEÇÃO 5) só libera de fato para
-- quem passa em is_platform_admin() — sem esse GRANT nem RLS chega a ser
-- avaliada. Sem INSERT/UPDATE/DELETE nenhum: a única escrita é
-- admin_remove_venue_owner() (SECURITY DEFINER), que não depende deste
-- GRANT.
grant select on public.venue_owner_removal_audit to authenticated;

-- venue_owner_reclaim_blocks: mesmo padrão de venue_owner_removal_audit —
-- SELECT para authenticated, RLS ("Admins can read owner reclaim blocks",
-- SEÇÃO 5) só libera de fato para admin. Sem INSERT/UPDATE/DELETE: só
-- admin_remove_venue_owner()/admin_release_venue_owner_block() (SECURITY
-- DEFINER) escrevem, sem depender deste GRANT.
grant select on public.venue_owner_reclaim_blocks to authenticated;

-- venue_auto_unpublish_audit: mesmo padrão — SELECT para authenticated,
-- RLS ("Admins can read auto unpublish audit", SEÇÃO 5) só libera de
-- fato para admin. Sem INSERT/UPDATE/DELETE: só _enforce_venue_
-- completeness() (SECURITY DEFINER, gatilhos + backfill) escreve aqui.
grant select on public.venue_auto_unpublish_audit to authenticated;

-- venue_legacy_completeness_waivers: mesmo padrão — SELECT para
-- authenticated, RLS ("Admins can read legacy completeness waivers",
-- SEÇÃO 5) só libera de fato para admin. Sem INSERT/UPDATE/DELETE: só o
-- backfill desta migration insere e só complete_existing_venue_
-- onboarding()/complete_new_venue_onboarding() (SECURITY DEFINER)
-- desativam, sem depender deste GRANT.
grant select on public.venue_legacy_completeness_waivers to authenticated;

commit;

-- ============================================================================
-- ROLLBACK MANUAL (NÃO executar automaticamente — bloco de comentários,
-- fora da transação begin/commit acima; nada aqui executa ao colar o
-- arquivo inteiro no SQL Editor).
-- ============================================================================
--
-- -- SEÇÃO 6 (reverte só os revoke/grant extras; não afeta a lógica das
-- -- funções, que continuam existindo do jeito que já estavam ao vivo):
-- -- não há rollback necessário — revoke/grant sem "from"/"to" alternativo
-- -- não muda comportamento de quem já tinha acesso correto.
--
-- drop trigger if exists enforce_video_limit_before_insert_or_update on public.venue_media;
-- drop trigger if exists enforce_video_limit_before_insert_or_update on public.venue_claim_draft_media;
-- drop function if exists public._enforce_venue_media_video_limit();
-- drop function if exists public._enforce_draft_media_video_limit();
-- drop function if exists public._venue_effective_video_limit(uuid);
-- drop function if exists public._ensure_venue_plan(uuid);
--
-- -- SEÇÃO 3D (planos): reverter a estrutura de volta pro estado antigo
-- -- de venue_plans (linhas-modelo com venue_id null) não é seguro fazer
-- -- automaticamente — exigiria reconstruir dados a partir de
-- -- venue_plan_definitions, decisão manual. Reversão segura só da parte
-- -- estrutural nova:
-- drop index if exists public.idx_venue_plans_one_active_per_venue;
-- alter table public.venue_plans drop constraint if exists venue_plans_status_check;
-- alter table public.venue_plans alter column venue_id drop not null;
-- alter table public.venue_plans drop column if exists status;
-- drop policy if exists "Admins can manage venue plans" on public.venue_plans;
-- drop policy if exists "Owners and managers can read their own venue plan" on public.venue_plans;
-- drop policy if exists "Admins can manage plan definitions" on public.venue_plan_definitions;
-- drop policy if exists "Public can read plan definitions" on public.venue_plan_definitions;
-- drop table if exists public.venue_plan_definitions;
--
-- drop function if exists public.reject_venue_claim(uuid, text);
-- drop function if exists public.approve_venue_claim(uuid);
-- drop function if exists public.submit_venue_claim_draft(uuid);
-- drop function if exists public.save_venue_claim_draft(uuid, jsonb, jsonb);
-- drop function if exists public.start_or_resume_venue_claim(uuid, text, text);
-- drop function if exists public._venue_claim_business_hours_snapshot(uuid);
-- drop function if exists public._venue_claim_editable_fields_snapshot(uuid);
--
-- drop policy if exists "qual_e_a_boa claim draft delete media" on storage.objects;
-- drop policy if exists "qual_e_a_boa claim draft update media" on storage.objects;
-- drop policy if exists "qual_e_a_boa claim draft insert media" on storage.objects;
--
-- drop function if exists public._claim_draft_media_write_allowed(uuid, text, text);
-- drop function if exists public._claim_draft_media_owned_and_editable(uuid);
-- drop table if exists public.venue_claim_draft_media;
-- drop table if exists public.venue_claim_drafts;
--
-- drop policy if exists "Users can create own claim requests" on public.venue_claim_requests;
-- create policy "Users can create own claim requests"
--   on public.venue_claim_requests for insert to authenticated
--   with check (user_id = auth.uid());
-- drop index if exists public.idx_venue_claim_requests_active_per_venue;
-- alter table public.venue_claim_requests drop constraint if exists venue_claim_requests_status_check;
-- alter table public.venue_claim_requests
--   add constraint venue_claim_requests_status_check check (status in ('pending', 'approved', 'rejected'));
-- alter table public.venue_claim_requests
--   drop column if exists requester_email, drop column if exists requester_name,
--   drop column if exists reviewed_at, drop column if exists reviewed_by, drop column if exists reject_reason;
--
-- -- Restaura a versão anterior de search_claimable_venues (exigia login) —
-- -- ver 20260818200938_expand_sp_cities_and_claimable_venues.sql para o
-- -- corpo completo original, caso precise reverter só esta parte.
--
-- -- Nenhuma policy de INSERT/UPDATE/DELETE de owner/manager foi (re)criada
-- -- nesta rodada em venue_media (removidas — ver SEÇÃO 0), então não há
-- -- nada para reverter nesse ponto além das de SELECT abaixo.
-- drop policy if exists "Owners and managers can read their own venue media" on public.venue_media;
-- drop policy if exists "Public can read media of published venues" on public.venue_media;
-- alter table public.venue_media drop column if exists retired_at;
-- alter table public.venue_media drop column if exists is_active;
-- alter table public.venue_media drop constraint if exists venue_media_venue_id_url_key;
-- drop function if exists public.add_venue_gallery_media(uuid, text, text, text);
-- drop function if exists public.set_venue_media_featured(uuid, boolean);
-- drop function if exists public.retire_venue_media(uuid);
-- drop function if exists public.replace_featured_venue_media(uuid, text, text, boolean, text, text);
-- -- Nota: venue_media/venues.logo_url já existiam ao vivo antes desta
-- -- migration — não são apagados no rollback, só as policies/colunas/
-- -- constraint/funções adicionadas aqui.
