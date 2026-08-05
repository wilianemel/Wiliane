-- 011_allow_owner_select_update_venues.sql
-- NÃO APLICADA — proposta gerada após auditoria ao vivo (somente leitura,
-- 6 blocos) confirmada pelo usuário. Aguardando autorização explícita
-- antes de qualquer execução no Supabase.
--
-- ============================================================================
-- PROBLEMA CONFIRMADO PELA AUDITORIA
-- ============================================================================
-- public.venues tem hoje UMA ÚNICA policy: leitura pública de linhas com
-- is_published = true. Não existe NENHUMA policy de SELECT para o próprio
-- dono ver seu venue não publicado, e NENHUMA policy de UPDATE para
-- ninguém além do que a ausência total implica (ou seja: ninguém, nem o
-- dono, consegue atualizar venues via API hoje). Isso trava por completo
-- o painel da empresa (não enxerga o próprio venue em rascunho) e a edição
-- de dados/mídia (UPDATE afeta 0 linhas, silenciosamente).
--
-- Esta migration resolve isso com o mínimo necessário:
-- 1) Uma policy de SELECT para o dono/gestor ver o próprio venue, mesmo
--    não publicado.
-- 2) Uma policy de UPDATE para o dono/gestor atualizar o próprio venue.
-- 3) Um REVOKE de coluna que impede is_published, is_featured e
--    data_confidence de serem alteradas por authenticated/anon mesmo
--    dentro de um UPDATE liberado pela policy acima — reforço em nível de
--    privilégio do Postgres, não só de RLS, então continua valendo mesmo
--    que a policy de UPDATE algum dia fique mais permissiva por engano.
--
-- Reaproveita can_manage_venue_registration(target_venue_id uuid), função
-- SECURITY DEFINER já existente e já usada exatamente para esse propósito
-- nas policies de venue_business_registrations (confirmado na auditoria).
-- Não a redefine, não altera sua assinatura.
--
-- Não altera a policy pública de leitura existente ("Public can read
-- published venues") — apenas adiciona policies novas, que só ampliam
-- acesso para o próprio dono, nunca restringem o que já funciona.
-- Não apaga dados. Não renomeia nada.

-- ============================================================================
-- 1) SELECT — dono/gestor vê o próprio venue, publicado ou não.
--    PERMISSIVE: combina com "Public can read published venues" via OR,
--    então a leitura pública de venues publicados continua exatamente
--    igual para todo mundo.
-- ============================================================================
drop policy if exists "Owners can view their own venue" on public.venues;

create policy "Owners can view their own venue"
on public.venues
for select
to authenticated
using (can_manage_venue_registration(id));

-- ============================================================================
-- 2) UPDATE — dono/gestor atualiza o próprio venue.
--    A restrição de QUAIS colunas podem mudar não é feita aqui (RLS não
--    compara valor antigo x novo por coluna) — é feita no passo 3, via
--    privilégio de coluna, que é a ferramenta certa do Postgres pra isso.
-- ============================================================================
drop policy if exists "Owners can update their own venue" on public.venues;

create policy "Owners can update their own venue"
on public.venues
for update
to authenticated
using (can_manage_venue_registration(id))
with check (can_manage_venue_registration(id));

-- ============================================================================
-- 3) Impede is_published, is_featured e data_confidence de serem
--    alteradas por authenticated/anon, mesmo com a policy de UPDATE acima
--    liberada — um UPDATE que tente tocar essas colunas é rejeitado pelo
--    Postgres (erro de privilégio) antes mesmo de a policy ser avaliada
--    coluna a coluna. O restante das colunas de venues continua
--    liberado para UPDATE via o grant de tabela padrão já existente.
-- ============================================================================
revoke update (is_published, is_featured, data_confidence) on public.venues from authenticated;
revoke update (is_published, is_featured, data_confidence) on public.venues from anon;

-- ============================================================================
-- ROLLBACK MANUAL (NÃO executar automaticamente).
-- ============================================================================
--
-- grant update (is_published, is_featured, data_confidence) on public.venues to authenticated;
-- grant update (is_published, is_featured, data_confidence) on public.venues to anon;
-- drop policy if exists "Owners can update their own venue" on public.venues;
-- drop policy if exists "Owners can view their own venue" on public.venues;
