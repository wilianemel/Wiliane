-- 021_update_handle_new_user_customer.sql
-- APLICADA — confirmada ao vivo no Supabase em 2026-08-10: public.handle_new_user()
-- já lê raw_user_meta_data.account_type e atribui 'customer' quando presente,
-- 'owner' caso contrário — exatamente o que este arquivo reproduz. Este
-- arquivo passa a existir só como registro da estrutura real, para uma
-- instalação nova poder reproduzi-la — não deve ser reaplicado sem
-- necessidade (é idempotente, mas não é preciso rodar de novo em cima do
-- banco atual).
--
-- Objetivo: fazer public.handle_new_user() (criada em 004_create_profiles.sql)
-- diferenciar cadastro de consumidor (src/app/cadastro/page.tsx, que envia
-- account_type: "customer" nos metadados do signUp) de cadastro de empresa
-- (src/app/empresa/cadastro/page.tsx, que nunca envia esse campo).
--
-- Depende de 020_add_customer_role_enum.sql já estar aplicada — 'customer'
-- só pode ser referenciado aqui porque foi commitado em uma transação
-- anterior e separada.
--
-- Não altera usuários existentes: CREATE OR REPLACE FUNCTION só muda o
-- comportamento para contas criadas a partir de agora. Nenhuma linha de
-- public.profiles já gravada é tocada, nenhum UPDATE/backfill é executado.
-- O trigger on_auth_user_created (criado em 004) não precisa ser recriado —
-- ele já aponta para public.handle_new_user() pelo nome, e CREATE OR REPLACE
-- preserva essa referência.
--
-- Este arquivo é seguro para revisar e reexecutar: CREATE OR REPLACE
-- FUNCTION não falha nem duplica se rodado mais de uma vez.

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
    case
      when new.raw_user_meta_data ->> 'account_type' = 'customer' then 'customer'::public.user_role
      else 'owner'::public.user_role
    end,
    true
  )
  on conflict (id) do nothing;

  return new;
end;
$$;
