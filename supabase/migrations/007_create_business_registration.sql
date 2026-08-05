-- 007_create_business_registration.sql
-- Cadastro empresarial dos estabelecimentos: CNPJ, razão social, nome
-- fantasia, tipo de comércio, contato comercial, responsável, aceite de
-- termos/privacidade e um fluxo de aprovação por administrador
-- (pending -> verified/rejected).
--
-- Depende de public.venue_members e public.is_admin()
-- (005_create_marketplace_core.sql) e de public.profiles
-- (004_create_profiles.sql) já estarem aplicadas — can_manage_venue_registration()
-- usa as duas. Depende também de public.handle_updated_at() (001).
--
-- A regra que TORNA o cadastro empresarial obrigatório para publicação fica
-- em 008_enforce_venue_publish_requires_business.sql, separada por tocar
-- public.venues (tabela já existente), não por esta.
--
-- Este arquivo é seguro para revisar e reexecutar: toda instrução usa
-- "if not exists" / "create or replace" / "drop ... if exists" antes de
-- recriar, então rodar mais de uma vez não falha nem duplica objetos.
-- A única exceção é o seed de business_type_catalog, que usa
-- "on conflict (code) do nothing" para o mesmo efeito.
--
-- Não altera as migrations 001-006.

-- 1) Tipo enumerado do status de aprovação.
do $$
begin
  if to_regtype('public.business_registration_status') is null then
    create type public.business_registration_status as enum (
      'pending', 'verified', 'rejected'
    );
  end if;
end
$$;

-- 2) business_type_catalog: catálogo de referência dos tipos de comércio.
create table if not exists public.business_type_catalog (
  code text primary key,
  label text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

comment on table public.business_type_catalog is
  'Catálogo de tipos de comércio disponíveis para o cadastro empresarial. Leitura pública; escrita apenas manual via SQL Editor nesta etapa.';

insert into public.business_type_catalog (code, label) values
  ('restaurante', 'Restaurante'),
  ('bar', 'Bar'),
  ('pub', 'Pub'),
  ('cafeteria', 'Cafeteria'),
  ('hamburgueria', 'Hamburgueria'),
  ('pizzaria', 'Pizzaria'),
  ('churrascaria', 'Churrascaria'),
  ('casa-de-shows', 'Casa de shows'),
  ('balada', 'Balada'),
  ('evento', 'Evento'),
  ('hotel-pousada', 'Hotel/Pousada'),
  ('parque', 'Parque'),
  ('adega-vinhos', 'Adega/Vinhos'),
  ('sorveteria', 'Sorveteria'),
  ('doceria', 'Doceria'),
  ('padaria', 'Padaria'),
  ('food-truck', 'Food Truck'),
  ('outro', 'Outro')
on conflict (code) do nothing;

alter table public.business_type_catalog enable row level security;

drop policy if exists "Public can read active business types" on public.business_type_catalog;

create policy "Public can read active business types"
on public.business_type_catalog
for select
to anon, authenticated
using (is_active = true);

-- 3) venue_business_registrations: um cadastro por estabelecimento.
create table if not exists public.venue_business_registrations (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null unique references public.venues (id) on delete cascade,
  cnpj text not null,
  legal_name text not null,
  trade_name text not null,
  business_type_code text not null references public.business_type_catalog (code),
  commercial_email text not null,
  commercial_phone text not null,
  responsible_name text not null,
  responsible_cpf text not null,
  responsible_role text not null,
  registration_status public.business_registration_status not null default 'pending',
  reviewed_by uuid references auth.users (id),
  reviewed_at timestamptz,
  review_notes text,
  created_by uuid not null references auth.users (id),
  updated_by uuid not null references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint venue_business_registrations_cnpj_unique unique (cnpj)
);

comment on table public.venue_business_registrations is
  'Cadastro empresarial (CNPJ e dados legais) de cada estabelecimento. Um por venue. Escrita só via submit_venue_business_registration()/review_venue_business_registration(); nunca por policy direta de UPDATE em registration_status.';
comment on column public.venue_business_registrations.cnpj is
  'Somente dígitos (14 caracteres), único na tabela — um CNPJ real não deve estar associado a mais de um estabelecimento.';
comment on column public.venue_business_registrations.responsible_cpf is
  'Somente dígitos (11 caracteres), do responsável pelo estabelecimento perante este cadastro. Sem unicidade: a mesma pessoa pode ser responsável por mais de um venue (ex.: rede/franquia).';
comment on column public.venue_business_registrations.registration_status is
  'pending: aguardando revisão. verified: aprovado por admin, libera publicação (ver 008). rejected: recusado por admin. Qualquer edição dos dados de um cadastro verified ou rejected volta o status para pending — ver submit_venue_business_registration().';
comment on column public.venue_business_registrations.reviewed_by is
  'Admin que aprovou ou rejeitou o cadastro mais recentemente. Nulo enquanto pending.';
comment on column public.venue_business_registrations.review_notes is
  'Observação do admin sobre a decisão mais recente (aprovação ou rejeição). Guarda só a revisão mais recente, não um histórico de todas as revisões — ver review_venue_business_registration().';

create index if not exists idx_venue_business_registrations_business_type
  on public.venue_business_registrations (business_type_code);
create index if not exists idx_venue_business_registrations_status
  on public.venue_business_registrations (registration_status);

drop trigger if exists set_venue_business_registrations_updated_at on public.venue_business_registrations;

create trigger set_venue_business_registrations_updated_at
before update on public.venue_business_registrations
for each row
execute function public.handle_updated_at();

alter table public.venue_business_registrations enable row level security;

-- 4) legal_acceptances: log de aceite de termos/privacidade, append-only.
create table if not exists public.legal_acceptances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  venue_id uuid not null references public.venues (id) on delete cascade,
  document_type text not null check (document_type in ('terms_of_use', 'privacy_policy')),
  document_version text not null,
  accepted_at timestamptz not null default now(),

  unique (user_id, venue_id, document_type, document_version)
);

comment on table public.legal_acceptances is
  'Log imutável de aceite de Termos de Uso e Política de Privacidade por usuário e estabelecimento, versionado. Sem policy de update ou delete: um aceite não se corrige, se registra de novo com uma versão nova.';

create index if not exists idx_legal_acceptances_user_id on public.legal_acceptances (user_id);
create index if not exists idx_legal_acceptances_venue_id on public.legal_acceptances (venue_id);

alter table public.legal_acceptances enable row level security;

drop policy if exists "Users can read own legal acceptances" on public.legal_acceptances;

create policy "Users can read own legal acceptances"
on public.legal_acceptances
for select
to authenticated
using (user_id = auth.uid() or public.is_admin());

drop policy if exists "Users can log own legal acceptances" on public.legal_acceptances;

create policy "Users can log own legal acceptances"
on public.legal_acceptances
for insert
to authenticated
with check (user_id = auth.uid());

-- 5) Função de permissão: quem pode gerenciar o cadastro de um venue.
-- "owner" e "manager" de venue_members (D1), ou admin da plataforma.
create or replace function public.can_manage_venue_registration(p_venue_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_admin()
    or exists (
      select 1
      from public.venue_members
      where venue_id = p_venue_id
        and user_id = auth.uid()
        and role in ('owner', 'manager')
    );
$$;

comment on function public.can_manage_venue_registration(uuid) is
  'True se o usuário autenticado atual é admin da plataforma ou é owner/manager (venue_members) do estabelecimento informado. Único portão de acesso a venue_business_registrations — a tabela não tem policy própria de insert/update.';

-- venue_business_registrations não ganha policy de insert/update: toda
-- escrita passa por submit_venue_business_registration() (security definer),
-- que já chama can_manage_venue_registration() internamente. A tabela só
-- precisa de uma policy de select para o dono ver o próprio cadastro.
drop policy if exists "Managers can read own venue registration" on public.venue_business_registrations;

create policy "Managers can read own venue registration"
on public.venue_business_registrations
for select
to authenticated
using (public.can_manage_venue_registration(venue_id));

-- 6) Guard de coluna: registration_status só avança para verified/rejected
-- por admin. Qualquer transição PARA pending é sempre permitida (é o que
-- submit_venue_business_registration() faz ao reabrir revisão em D4), então
-- só bloqueamos o sentido contrário — RLS não protege coluna por coluna
-- dentro da mesma linha, mesmo caso já resolvido em profiles (004).
create or replace function public.prevent_registration_status_change_by_non_admin()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.registration_status is distinct from old.registration_status
     and new.registration_status <> 'pending'::public.business_registration_status
  then
    if auth.uid() is not null and not public.is_admin() then
      raise exception 'Somente administradores podem aprovar ou rejeitar um cadastro empresarial.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists guard_registration_status on public.venue_business_registrations;

create trigger guard_registration_status
before update on public.venue_business_registrations
for each row
execute function public.prevent_registration_status_change_by_non_admin();

-- 7) submit_venue_business_registration: cria ou atualiza o cadastro do
-- venue. Reabre revisão (volta para pending) em qualquer edição, mesmo que
-- o cadastro já estivesse verified ou rejected (D4) — dado empresarial
-- alterado depois de aprovado precisa ser revisto de novo.
create or replace function public.submit_venue_business_registration(
  p_venue_id uuid,
  p_cnpj text,
  p_legal_name text,
  p_trade_name text,
  p_business_type_code text,
  p_commercial_email text,
  p_commercial_phone text,
  p_responsible_name text,
  p_responsible_cpf text,
  p_responsible_role text,
  p_terms_version text,
  p_privacy_version text
)
returns table (
  registration_id uuid,
  venue_id uuid,
  registration_status text,
  cnpj_masked text,
  responsible_cpf_masked text,
  terms_accepted_at timestamp with time zone,
  privacy_accepted_at timestamp with time zone
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_clean_cnpj text;
  v_clean_cpf text;
  v_registration_id uuid;
  v_status public.business_registration_status;
  v_terms_accepted_at timestamp with time zone;
  v_privacy_accepted_at timestamp with time zone;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception
      'É necessário estar autenticado para cadastrar o estabelecimento.';
  end if;

  if not public.can_manage_venue_registration(p_venue_id) then
    raise exception
      'Você não possui permissão para administrar este estabelecimento.';
  end if;

  if not exists (
    select 1
    from public.venues
    where id = p_venue_id
  ) then
    raise exception
      'Estabelecimento não encontrado.';
  end if;

  if not exists (
    select 1
    from public.business_type_catalog
    where code = p_business_type_code
      and is_active = true
  ) then
    raise exception
      'Tipo de comércio inválido.';
  end if;

  -- Mantém somente os números do CNPJ
  v_clean_cnpj :=
    regexp_replace(
      coalesce(p_cnpj, ''),
      '[^0-9]',
      '',
      'g'
    );

  if length(v_clean_cnpj) <> 14 then
    raise exception
      'O CNPJ deve possuir 14 números.';
  end if;

  -- Mantém somente os números do CPF do responsável
  v_clean_cpf :=
    regexp_replace(
      coalesce(p_responsible_cpf, ''),
      '[^0-9]',
      '',
      'g'
    );

  if length(v_clean_cpf) <> 11 then
    raise exception
      'O CPF do responsável deve possuir 11 números.';
  end if;

  if trim(coalesce(p_legal_name, '')) = '' then
    raise exception 'A razão social é obrigatória.';
  end if;

  if trim(coalesce(p_trade_name, '')) = '' then
    raise exception 'O nome fantasia é obrigatório.';
  end if;

  if trim(coalesce(p_commercial_email, '')) = '' then
    raise exception 'O e-mail comercial é obrigatório.';
  end if;

  if trim(coalesce(p_commercial_phone, '')) = '' then
    raise exception 'O telefone comercial é obrigatório.';
  end if;

  if trim(coalesce(p_responsible_name, '')) = '' then
    raise exception 'O nome do responsável é obrigatório.';
  end if;

  if trim(coalesce(p_responsible_role, '')) = '' then
    raise exception 'O cargo ou vínculo do responsável é obrigatório.';
  end if;

  if trim(coalesce(p_terms_version, '')) = '' then
    raise exception 'A versão dos Termos de Uso é obrigatória.';
  end if;

  if trim(coalesce(p_privacy_version, '')) = '' then
    raise exception 'A versão da Política de Privacidade é obrigatória.';
  end if;

  insert into public.venue_business_registrations (
    venue_id,
    cnpj,
    legal_name,
    trade_name,
    business_type_code,
    commercial_email,
    commercial_phone,
    responsible_name,
    responsible_cpf,
    responsible_role,
    registration_status,
    created_by,
    updated_by,
    created_at,
    updated_at
  )
  values (
    p_venue_id,
    v_clean_cnpj,
    trim(p_legal_name),
    trim(p_trade_name),
    p_business_type_code,
    lower(trim(p_commercial_email)),
    trim(p_commercial_phone),
    trim(p_responsible_name),
    v_clean_cpf,
    trim(p_responsible_role),
    'pending',
    v_user_id,
    v_user_id,
    now(),
    now()
  )
  on conflict (venue_id)
  do update set
    cnpj = excluded.cnpj,
    legal_name = excluded.legal_name,
    trade_name = excluded.trade_name,
    business_type_code = excluded.business_type_code,
    commercial_email = excluded.commercial_email,
    commercial_phone = excluded.commercial_phone,
    responsible_name = excluded.responsible_name,
    responsible_cpf = excluded.responsible_cpf,
    responsible_role = excluded.responsible_role,
    registration_status = 'pending',
    updated_by = v_user_id,
    updated_at = now()
  returning
    id,
    registration_status
  into
    v_registration_id,
    v_status;

  insert into public.legal_acceptances (
    user_id,
    venue_id,
    document_type,
    document_version,
    accepted_at
  )
  values (
    v_user_id,
    p_venue_id,
    'terms_of_use',
    trim(p_terms_version),
    now()
  )
  on conflict (
    user_id,
    venue_id,
    document_type,
    document_version
  )
  do nothing;

  select accepted_at
  into v_terms_accepted_at
  from public.legal_acceptances
  where user_id = v_user_id
    and venue_id = p_venue_id
    and document_type = 'terms_of_use'
    and document_version = trim(p_terms_version)
  limit 1;

  insert into public.legal_acceptances (
    user_id,
    venue_id,
    document_type,
    document_version,
    accepted_at
  )
  values (
    v_user_id,
    p_venue_id,
    'privacy_policy',
    trim(p_privacy_version),
    now()
  )
  on conflict (
    user_id,
    venue_id,
    document_type,
    document_version
  )
  do nothing;

  select accepted_at
  into v_privacy_accepted_at
  from public.legal_acceptances
  where user_id = v_user_id
    and venue_id = p_venue_id
    and document_type = 'privacy_policy'
    and document_version = trim(p_privacy_version)
  limit 1;

  return query
  select
    v_registration_id,
    p_venue_id,
    v_status::text,
    left(v_clean_cnpj, 2)
      || '.***.***/****-'
      || right(v_clean_cnpj, 2),
    '***.***.**' || right(v_clean_cpf, 3),
    v_terms_accepted_at,
    v_privacy_accepted_at;
end;
$$;

revoke all
on function public.submit_venue_business_registration(
  uuid, text, text, text, text, text, text, text, text, text, text, text
)
from public;

grant execute
on function public.submit_venue_business_registration(
  uuid, text, text, text, text, text, text, text, text, text, text, text
)
to authenticated;

-- 8) review_venue_business_registration: aprovação/rejeição, admin-only.
-- A checagem aqui é defesa em profundidade — o trigger guard_registration_status
-- já bloqueraia a mesma tentativa vinda de um não-admin.
create or replace function public.review_venue_business_registration(
  p_registration_id uuid,
  p_approve boolean,
  p_review_notes text default null
)
returns table (
  registration_id uuid,
  venue_id uuid,
  registration_status text,
  reviewed_by uuid,
  reviewed_at timestamp with time zone,
  review_notes text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_id uuid;
  v_venue_id uuid;
  v_status public.business_registration_status;
  v_reviewed_by uuid;
  v_reviewed_at timestamp with time zone;
  v_review_notes text;
begin
  v_admin_id := auth.uid();

  if v_admin_id is null then
    raise exception
      'É necessário estar autenticado para revisar um cadastro empresarial.';
  end if;

  if not public.is_admin() then
    raise exception
      'Somente administradores podem revisar cadastros empresariais.';
  end if;

  if not exists (
    select 1
    from public.venue_business_registrations
    where id = p_registration_id
  ) then
    raise exception
      'Cadastro empresarial não encontrado.';
  end if;

  update public.venue_business_registrations
  set
    registration_status = case when p_approve then 'verified' else 'rejected' end,
    reviewed_by = v_admin_id,
    reviewed_at = now(),
    review_notes = p_review_notes,
    updated_by = v_admin_id,
    updated_at = now()
  where id = p_registration_id
  returning
    venue_business_registrations.venue_id,
    venue_business_registrations.registration_status,
    venue_business_registrations.reviewed_by,
    venue_business_registrations.reviewed_at,
    venue_business_registrations.review_notes
  into
    v_venue_id,
    v_status,
    v_reviewed_by,
    v_reviewed_at,
    v_review_notes;

  return query
  select
    p_registration_id,
    v_venue_id,
    v_status::text,
    v_reviewed_by,
    v_reviewed_at,
    v_review_notes;
end;
$$;

revoke all
on function public.review_venue_business_registration(uuid, boolean, text)
from public;

grant execute
on function public.review_venue_business_registration(uuid, boolean, text)
to authenticated;

-- ============================================================================
-- ROLLBACK MANUAL desta migration (NÃO executar automaticamente).
-- Copie e rode este bloco separadamente, apenas se precisar reverter
-- especificamente a 007. Rode o rollback de 008 antes deste, se 008 também
-- tiver sido aplicada (008 depende de venue_business_registrations existir).
-- ============================================================================
--
-- drop function if exists public.review_venue_business_registration(uuid, boolean, text);
-- drop function if exists public.submit_venue_business_registration(
--   uuid, text, text, text, text, text, text, text, text, text, text, text
-- );
-- drop trigger if exists guard_registration_status on public.venue_business_registrations;
-- drop function if exists public.prevent_registration_status_change_by_non_admin();
-- drop function if exists public.can_manage_venue_registration(uuid);
-- drop table if exists public.legal_acceptances;
-- drop table if exists public.venue_business_registrations;
-- drop table if exists public.business_type_catalog;
-- drop type if exists public.business_registration_status;
