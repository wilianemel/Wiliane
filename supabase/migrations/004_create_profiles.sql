-- 004_create_profiles.sql
-- Etapa 1 do plano de autenticação: estrutura básica de perfis de usuário,
-- ligada a auth.users. Ainda sem venue_members, sem venue_media, sem
-- Storage e sem nenhum painel administrativo — só a fundação de identidade.
--
-- Este arquivo é seguro para revisar e reexecutar: toda instrução usa
-- "if not exists" / "create or replace" / "drop ... if exists" antes de
-- recriar, então rodar mais de uma vez não falha nem duplica objetos.
--
-- Não contém e-mail, senha, UUID pessoal, chave ou token de nenhum tipo.
-- Não altera as migrations 001-003 nem nenhuma tabela além de public.profiles
-- (e o trigger que a alimenta, criado em auth.users).

-- 1) Tipo enumerado com os dois papéis desta etapa.
-- Postgres não tem "create type if not exists"; to_regtype() é a forma
-- padrão de checar se o tipo já existe antes de criar.
do $$
begin
  if to_regtype('public.user_role') is null then
    create type public.user_role as enum ('admin', 'owner');
  end if;
end
$$;

-- 2) Tabela de perfis, um por usuário do Supabase Auth.
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  role public.user_role not null default 'owner',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is
  'Perfil de aplicação de cada usuário autenticado, com o papel (admin/owner) usado pelas policies de RLS.';
comment on column public.profiles.role is
  'Papel do usuário: "admin" (equipe do Bora pra onde, acesso global) ou "owner" (padrão de todo cadastro novo). Só um admin pode alterar este campo — ver trigger guard_profiles_role_and_status.';
comment on column public.profiles.is_active is
  'Permite suspender o acesso de uma conta sem excluir o perfil nem o histórico associado a ela. Só um admin pode alterar este campo.';

-- 3) Cria o perfil automaticamente quando uma conta nasce em auth.users.
-- security definer: a única forma de o INSERT funcionar sem abrir uma
-- policy pública de INSERT em profiles (que não deve existir).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role, is_active)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    'owner',
    true
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

-- 4) updated_at automático, reaproveitando a função genérica já criada em
-- 001_create_venues.sql (só faz "new.updated_at = now()"; compatível com
-- qualquer tabela que tenha essa coluna, então não é recriada aqui).
drop trigger if exists set_profiles_updated_at on public.profiles;

create trigger set_profiles_updated_at
before update on public.profiles
for each row
execute function public.handle_updated_at();

-- 5) Trigger de segurança: impede que a própria conta altere "role" ou
-- "is_active" a menos que quem está fazendo a alteração já seja admin.
-- RLS sozinho não restringe coluna por coluna dentro da mesma linha; este
-- guard é o que realmente impede um owner de virar admin por conta própria.
-- Escrito para já funcionar quando uma policy administrativa de UPDATE for
-- adicionada no futuro (ver observação sobre a policy adiada, mais abaixo).
--
-- A checagem só se aplica quando existe um ator autenticado (auth.uid() não
-- nulo). Fora de uma sessão do Supabase Auth — como o SQL Editor usado para
-- promover manualmente o primeiro admin — auth.uid() é sempre nulo, e o
-- guard deixa a alteração passar. Sem esse cuidado, a própria promoção
-- manual do primeiro admin (pedida nesta etapa) ficaria bloqueada.
create or replace function public.prevent_self_role_or_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  acting_user_is_admin boolean;
begin
  if new.role is distinct from old.role or new.is_active is distinct from old.is_active then
    if auth.uid() is not null then
      select (role = 'admin') into acting_user_is_admin
      from public.profiles
      where id = auth.uid();

      if not coalesce(acting_user_is_admin, false) then
        raise exception 'Somente administradores podem alterar role ou is_active.';
      end if;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists guard_profiles_role_and_status on public.profiles;

create trigger guard_profiles_role_and_status
before update on public.profiles
for each row
execute function public.prevent_self_role_or_status_change();

-- 6) RLS: liga a proteção. Sem nenhuma policy de INSERT (criação só pelo
-- trigger acima) e sem nenhuma policy de DELETE (ninguém apaga perfil pelo
-- navegador nesta etapa).
alter table public.profiles enable row level security;

drop policy if exists "Users can read own profile" on public.profiles;

create policy "Users can read own profile"
on public.profiles
for select
to authenticated
using (id = auth.uid());

drop policy if exists "Users can update own profile" on public.profiles;

create policy "Users can update own profile"
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

-- Nenhuma policy administrativa (admin lendo/editando o perfil de outras
-- contas) é criada nesta etapa — ver explicação no resumo desta migration
-- sobre por que essa decisão foi adiada.
