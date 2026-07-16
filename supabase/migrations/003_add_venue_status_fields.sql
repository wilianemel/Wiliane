-- 003_add_venue_status_fields.sql
-- Adiciona campos de status/verificação a public.venues e inicializa esses
-- campos apenas para os seis estabelecimentos de demonstração já semeados
-- pela migration 002.
--
-- Seguro para executar mais de uma vez:
-- - as três colunas usam "add column if not exists", então rodar de novo
--   não falha nem duplica colunas;
-- - a atualização dos seis slugs sempre grava os mesmos valores de
--   is_demo/open_now, e só define last_verified_at se ainda estiver vazio
--   (não sobrescreve uma verificação real feita depois).
--
-- Não mexe em RLS, não mexe em policies, não usa DELETE/DROP/TRUNCATE e não
-- insere nenhum estabelecimento novo — só atualiza os seis slugs que a
-- migration 002 já criou.

-- 1) Novas colunas, só se ainda não existirem.
alter table public.venues
  add column if not exists open_now boolean not null default true,
  add column if not exists is_demo boolean not null default false,
  add column if not exists last_verified_at timestamptz;

comment on column public.venues.open_now is
  'Indica se o local está aberto agora. Para os seis demonstrativos, é um valor estático espelhando src/data/venues.ts; para estabelecimentos reais, deve refletir o horário de funcionamento real.';
comment on column public.venues.is_demo is
  'Marca estabelecimentos fictícios de demonstração (os seis do piloto), para diferenciá-los de estabelecimentos reais no futuro.';
comment on column public.venues.last_verified_at is
  'Data/hora da última verificação das informações do estabelecimento. Ainda não preenchido automaticamente fora desta migration.';

-- 2) Inicializa os três campos apenas para os seis slugs de demonstração,
-- usando o valor de "openNow" de cada um em src/data/venues.ts (hoje, os
-- seis estão como "true" na fonte).
update public.venues as v
set
  is_demo = true,
  open_now = data.open_now,
  last_verified_at = coalesce(v.last_verified_at, v.updated_at)
from (
  values
    ('pub-do-vale', true),
    ('bella-serra', true),
    ('rooftop-360', true),
    ('cafe-aurora', true),
    ('quintal-da-familia', true),
    ('casa-do-rock', true)
) as data(slug, open_now)
where v.slug = data.slug;
