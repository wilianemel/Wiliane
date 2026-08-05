-- 009_adjust_venue_business_registration_quick_signup.sql
-- Reconcilia o cadastro empresarial com o onboarding em 2 fases, contra o
-- schema REAL já existente no Supabase (auditado ao vivo em sessão
-- anterior) — não o rascunho das migrations 007/008, que não devem ser
-- executadas (conflitam com o que já existe: business_type_catalog,
-- venue_business_registrations, legal_acceptances, venue_members e
-- is_platform_admin() já existem em produção, com nomes/esquema próprios).
--
-- Escopo estrito desta migration: SOMENTE o cadastro empresarial rápido
-- (CNPJ, e-mail comercial, telefone/WhatsApp comercial, aceites legais,
-- permissões owner/manager/admin, fluxo pending/verified/rejected,
-- reviewed_by/reviewed_at/review_notes).
--
-- NÃO cria nem altera: categorias, subcategorias, offer_catalog,
-- venue_offers, custom_offer_description ou qualquer campo de experiência
-- do estabelecimento. Isso fica para uma migration separada de
-- enriquecimento de perfil.
--
-- Não insere nenhum dado fictício. Não altera public.venues. Não altera as
-- migrations 001-008 (007 e 008 permanecem no repositório como rascunho
-- histórico, não executado).

-- 1) Campos que saem do cadastro rápido: mantidos, agora opcionais.
-- business_type_code incluído por necessidade técnica (a nova
-- submit_venue_business_registration não coleta categoria/subcategoria,
-- que fica para a fase de enriquecimento) — não fazia parte da lista
-- original pedida, adicionado e sinalizado nesta mesma sessão.
alter table public.venue_business_registrations
  alter column legal_name drop not null,
  alter column trade_name drop not null,
  alter column responsible_full_name drop not null,
  alter column responsible_role drop not null,
  alter column business_type_code drop not null;

-- 2) Colunas do fluxo de revisão administrativa (não existiam).
alter table public.venue_business_registrations
  add column if not exists reviewed_by uuid references auth.users (id),
  add column if not exists reviewed_at timestamptz,
  add column if not exists review_notes text;

-- 3) Garante unique(venue_id) para o upsert da função funcionar.
create unique index if not exists venue_business_registrations_venue_id_key
  on public.venue_business_registrations (venue_id);

-- 4) Garante que registration_status aceite 'rejected', seja enum ou
-- texto+check — detectado em tempo de execução, sem precisar saber de
-- antemão qual dos dois formatos a tabela real usa.
do $$
declare
  v_data_type text;
  v_udt_name text;
  v_conname text;
begin
  select data_type, udt_name into v_data_type, v_udt_name
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'venue_business_registrations'
    and column_name = 'registration_status';

  if v_data_type = 'USER-DEFINED' then
    execute format('alter type public.%I add value if not exists %L', v_udt_name, 'pending');
    execute format('alter type public.%I add value if not exists %L', v_udt_name, 'verified');
    execute format('alter type public.%I add value if not exists %L', v_udt_name, 'rejected');
  else
    select c.conname into v_conname
    from pg_constraint c
    join pg_attribute a on a.attnum = any(c.conkey) and a.attrelid = c.conrelid
    where c.conrelid = 'public.venue_business_registrations'::regclass
      and c.contype = 'c'
      and a.attname = 'registration_status'
    limit 1;

    if v_conname is not null then
      execute format('alter table public.venue_business_registrations drop constraint %I', v_conname);
    end if;

    alter table public.venue_business_registrations
      add constraint venue_business_registrations_status_check
      check (registration_status in ('pending', 'verified', 'rejected'));
  end if;
end
$$;

-- 5) can_manage_venue_registration: admin da plataforma, owner ativo,
-- manager ativo. Drop dinâmico antes (não sabemos se já existe com outra
-- assinatura) — create or replace não permite mudar parâmetros.
do $$
declare
  r record;
begin
  for r in
    select p.oid::regprocedure as sig
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'can_manage_venue_registration'
  loop
    execute format('drop function %s', r.sig);
  end loop;
end
$$;

create function public.can_manage_venue_registration(p_venue_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_platform_admin()
    or exists (
      select 1
      from public.venue_members
      where venue_id = p_venue_id
        and user_id = auth.uid()
        and member_role in ('owner', 'manager')
        and is_active = true
    );
$$;

-- 6) Guard: status só avança para verified/rejected por admin; volta para
-- pending livremente (é o que a submit_venue_business_registration faz a
-- cada edição). RLS não protege coluna por coluna dentro da mesma linha —
-- por isso o guard fica num trigger, não numa policy.
create or replace function public.prevent_registration_status_change_by_non_admin()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.registration_status is distinct from old.registration_status
     and new.registration_status <> 'pending'
  then
    if auth.uid() is not null and not public.is_platform_admin() then
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

-- 7) Nova submit_venue_business_registration (cadastro rápido). A
-- assinatura muda (menos parâmetros que a versão real anterior), então o
-- drop é dinâmico — não precisamos saber a assinatura antiga exata.
do $$
declare
  r record;
begin
  for r in
    select p.oid::regprocedure as sig
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'submit_venue_business_registration'
  loop
    execute format('drop function %s', r.sig);
  end loop;
end
$$;

create function public.submit_venue_business_registration(
  p_venue_id uuid,
  p_cnpj text,
  p_commercial_email text,
  p_commercial_phone text,
  p_terms_version text,
  p_privacy_version text
)
returns table (
  registration_id uuid,
  venue_id uuid,
  registration_status text,
  cnpj_masked text,
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
  v_registration_id uuid;
  v_status text;
  v_terms_accepted_at timestamp with time zone;
  v_privacy_accepted_at timestamp with time zone;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'É necessário estar autenticado para cadastrar o estabelecimento.';
  end if;

  if not public.can_manage_venue_registration(p_venue_id) then
    raise exception 'Você não possui permissão para administrar este estabelecimento.';
  end if;

  if not exists (select 1 from public.venues where id = p_venue_id) then
    raise exception 'Estabelecimento não encontrado.';
  end if;

  v_clean_cnpj := regexp_replace(coalesce(p_cnpj, ''), '[^0-9]', '', 'g');
  if length(v_clean_cnpj) <> 14 then
    raise exception 'O CNPJ deve possuir 14 números.';
  end if;

  if trim(coalesce(p_commercial_email, '')) = '' then
    raise exception 'O e-mail comercial é obrigatório.';
  end if;

  if trim(coalesce(p_commercial_phone, '')) = '' then
    raise exception 'O telefone comercial é obrigatório.';
  end if;

  if trim(coalesce(p_terms_version, '')) = '' then
    raise exception 'A versão dos Termos de Uso é obrigatória.';
  end if;

  if trim(coalesce(p_privacy_version, '')) = '' then
    raise exception 'A versão da Política de Privacidade é obrigatória.';
  end if;

  insert into public.venue_business_registrations (
    venue_id, cnpj, commercial_email, commercial_phone,
    registration_status, created_by, updated_by, created_at, updated_at
  )
  values (
    p_venue_id, v_clean_cnpj, lower(trim(p_commercial_email)), trim(p_commercial_phone),
    'pending', v_user_id, v_user_id, now(), now()
  )
  on conflict (venue_id)
  do update set
    cnpj = excluded.cnpj,
    commercial_email = excluded.commercial_email,
    commercial_phone = excluded.commercial_phone,
    registration_status = 'pending',
    updated_by = v_user_id,
    updated_at = now()
  returning id, registration_status
  into v_registration_id, v_status;

  insert into public.legal_acceptances (user_id, venue_id, document_type, document_version, accepted_at)
  values (v_user_id, p_venue_id, 'terms_of_use', trim(p_terms_version), now())
  on conflict (user_id, venue_id, document_type, document_version) do nothing;

  select accepted_at into v_terms_accepted_at
  from public.legal_acceptances
  where user_id = v_user_id and venue_id = p_venue_id
    and document_type = 'terms_of_use' and document_version = trim(p_terms_version)
  limit 1;

  insert into public.legal_acceptances (user_id, venue_id, document_type, document_version, accepted_at)
  values (v_user_id, p_venue_id, 'privacy_policy', trim(p_privacy_version), now())
  on conflict (user_id, venue_id, document_type, document_version) do nothing;

  select accepted_at into v_privacy_accepted_at
  from public.legal_acceptances
  where user_id = v_user_id and venue_id = p_venue_id
    and document_type = 'privacy_policy' and document_version = trim(p_privacy_version)
  limit 1;

  return query
  select
    v_registration_id,
    p_venue_id,
    v_status,
    left(v_clean_cnpj, 2) || '.***.***/****-' || right(v_clean_cnpj, 2),
    v_terms_accepted_at,
    v_privacy_accepted_at;
end;
$$;

revoke all on function public.submit_venue_business_registration(uuid, text, text, text, text, text) from public;
grant execute on function public.submit_venue_business_registration(uuid, text, text, text, text, text) to authenticated;

-- 8) review_venue_business_registration (não existia).
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
  v_status text;
  v_reviewed_by uuid;
  v_reviewed_at timestamp with time zone;
  v_review_notes text;
begin
  v_admin_id := auth.uid();

  if v_admin_id is null then
    raise exception 'É necessário estar autenticado para revisar um cadastro empresarial.';
  end if;

  if not public.is_platform_admin() then
    raise exception 'Somente administradores podem revisar cadastros empresariais.';
  end if;

  if not exists (select 1 from public.venue_business_registrations where id = p_registration_id) then
    raise exception 'Cadastro empresarial não encontrado.';
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
  returning venue_id, registration_status, reviewed_by, reviewed_at, review_notes
  into v_venue_id, v_status, v_reviewed_by, v_reviewed_at, v_review_notes;

  return query
  select p_registration_id, v_venue_id, v_status, v_reviewed_by, v_reviewed_at, v_review_notes;
end;
$$;

revoke all on function public.review_venue_business_registration(uuid, boolean, text) from public;
grant execute on function public.review_venue_business_registration(uuid, boolean, text) to authenticated;

-- ============================================================================
-- ROLLBACK MANUAL DE EMERGÊNCIA — NÃO EXECUTAR AUTOMATICAMENTE.
-- Só copiar e rodar manualmente, statement a statement, se precisar reverter.
-- ============================================================================
--
-- drop function if exists public.review_venue_business_registration(uuid, boolean, text);
-- drop trigger if exists guard_registration_status on public.venue_business_registrations;
-- drop function if exists public.prevent_registration_status_change_by_non_admin();
-- drop function if exists public.can_manage_venue_registration(uuid);
-- drop index if exists public.venue_business_registrations_venue_id_key;
-- alter table public.venue_business_registrations
--   drop column if exists review_notes, drop column if exists reviewed_at, drop column if exists reviewed_by;
-- -- Nota: reverter a nulabilidade das colunas e restaurar a função antiga
-- -- real exige saber a definição original exata, que não temos registrada
-- -- — restaurar completamente exigiria um backup/checkpoint do Supabase
-- -- feito antes desta migration.
