-- 012_fix_create_owned_venue_slug_ambiguity.sql
-- NÃO APLICADA — aguardando autorização explícita antes de qualquer
-- execução no Supabase.
--
-- ============================================================================
-- Corrige exclusivamente o erro:
--   column reference "slug" is ambiguous
-- ============================================================================
-- Causa: `returns table (venue_id uuid, slug text)` cria, implicitamente,
-- uma variável de saída chamada `slug`, que colide com a coluna
-- `public.venues.slug` referenciada sem qualificador dentro do
-- `while exists (select 1 from public.venues where slug = v_slug) loop`.
--
-- Única mudança nesta migration: esse `select` passa a usar o alias `v` e
-- qualificar a coluna como `v.slug`, removendo a ambiguidade.
--
-- Nada mais foi alterado: mesma assinatura, mesmas validações, mesma
-- geração de slug, mesmo `security definer`, mesmo retorno, mesmos
-- inserts, mesmas regras de negócio. Como a assinatura da função
-- (text, text, text, text, text, text) não muda, o `CREATE OR REPLACE
-- FUNCTION` preserva as permissões já concedidas em 010
-- (revoke de public/anon, grant de execute para authenticated) — não é
-- necessário repeti-las aqui.
-- ============================================================================

create or replace function public.create_owned_venue(
  p_name text,
  p_category text,
  p_city text,
  p_neighborhood text,
  p_address text,
  p_description text
)
returns table (
  venue_id uuid,
  slug text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_venue_id uuid;
  v_base_slug text;
  v_slug text;
  v_suffix int := 0;
begin
  -- Nunca aceita user_id como parâmetro — a única fonte de identidade é a
  -- sessão autenticada de quem está chamando a função.
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'É necessário estar autenticado para cadastrar um estabelecimento.';
  end if;

  -- Valida todos os 7 campos obrigatórios reais de public.venues
  -- (slug é gerado por esta função, não é entrada do usuário).
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

  -- Único trecho alterado nesta migration: alias `v` + `v.slug` em vez de
  -- `slug` sem qualificador, para não colidir com a variável de saída
  -- `slug` do `returns table`.
  while exists (select 1 from public.venues v where v.slug = v_slug) loop
    v_suffix := v_suffix + 1;
    v_slug := v_base_slug || '-' || v_suffix;
  end loop;

  -- Todos os 7 campos obrigatórios confirmados são preenchidos; os demais
  -- (arrays, is_published, is_featured, is_demo, data_confidence,
  -- created_at, updated_at) usam default da tabela ou são setados aqui
  -- explicitamente por segurança.
  insert into public.venues (
    slug, name, category, city, neighborhood, address, description,
    is_published, is_featured, is_demo, data_confidence, created_at, updated_at
  )
  values (
    v_slug, trim(p_name), trim(p_category), trim(p_city), trim(p_neighborhood),
    trim(p_address), trim(p_description),
    false, false, false, 50, now(), now()
  )
  returning id into v_venue_id;

  -- member_role = 'owner' é um dos dois únicos valores aceitos pelo check
  -- constraint real (owner/manager). is_active = true, sempre.
  insert into public.venue_members (venue_id, user_id, member_role, is_active, created_at)
  values (v_venue_id, v_user_id, 'owner', true, now());

  return query select v_venue_id, v_slug;
end;
$$;

-- ============================================================================
-- ROLLBACK MANUAL (NÃO executar automaticamente).
-- Restaura o corpo exatamente como estava em 010 (com a ambiguidade).
-- ============================================================================
--
-- create or replace function public.create_owned_venue(
--   p_name text,
--   p_category text,
--   p_city text,
--   p_neighborhood text,
--   p_address text,
--   p_description text
-- )
-- returns table (
--   venue_id uuid,
--   slug text
-- )
-- language plpgsql
-- security definer
-- set search_path = public
-- as $$
-- declare
--   v_user_id uuid;
--   v_venue_id uuid;
--   v_base_slug text;
--   v_slug text;
--   v_suffix int := 0;
-- begin
--   v_user_id := auth.uid();
--   if v_user_id is null then
--     raise exception 'É necessário estar autenticado para cadastrar um estabelecimento.';
--   end if;
--   if trim(coalesce(p_name, '')) = '' then
--     raise exception 'O nome do estabelecimento é obrigatório.';
--   end if;
--   if trim(coalesce(p_category, '')) = '' then
--     raise exception 'A categoria é obrigatória.';
--   end if;
--   if trim(coalesce(p_city, '')) = '' then
--     raise exception 'A cidade é obrigatória.';
--   end if;
--   if trim(coalesce(p_neighborhood, '')) = '' then
--     raise exception 'O bairro é obrigatório.';
--   end if;
--   if trim(coalesce(p_address, '')) = '' then
--     raise exception 'O endereço é obrigatório.';
--   end if;
--   if trim(coalesce(p_description, '')) = '' then
--     raise exception 'A descrição é obrigatória.';
--   end if;
--   v_base_slug := lower(regexp_replace(trim(p_name), '[^a-zA-Z0-9]+', '-', 'g'));
--   v_base_slug := trim(both '-' from v_base_slug);
--   if v_base_slug = '' then
--     v_base_slug := 'estabelecimento';
--   end if;
--   v_slug := v_base_slug;
--   while exists (select 1 from public.venues where slug = v_slug) loop
--     v_suffix := v_suffix + 1;
--     v_slug := v_base_slug || '-' || v_suffix;
--   end loop;
--   insert into public.venues (
--     slug, name, category, city, neighborhood, address, description,
--     is_published, is_featured, is_demo, data_confidence, created_at, updated_at
--   )
--   values (
--     v_slug, trim(p_name), trim(p_category), trim(p_city), trim(p_neighborhood),
--     trim(p_address), trim(p_description),
--     false, false, false, 50, now(), now()
--   )
--   returning id into v_venue_id;
--   insert into public.venue_members (venue_id, user_id, member_role, is_active, created_at)
--   values (v_venue_id, v_user_id, 'owner', true, now());
--   return query select v_venue_id, v_slug;
-- end;
-- $$;
