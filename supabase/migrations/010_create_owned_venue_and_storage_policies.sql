-- 010_create_owned_venue_and_storage_policies.sql
-- NÃO APLICADA — versão final revisada após auditoria ao vivo (somente
-- leitura) confirmada pelo usuário. Aguardando autorização explícita antes
-- de qualquer execução no Supabase.
--
-- ============================================================================
-- RESULTADOS REAIS QUE EMBASAM ESTA VERSÃO (confirmados via SQL Editor)
-- ============================================================================
-- - public.venues: campos obrigatórios sem default são
--   slug, name, city, neighborhood, address, category, description.
--   (cuisine_types, tags, music_styles, atmospheres, intentions, companions,
--   menu_highlights, schedule têm default de array vazio; is_published tem
--   default false — mesmo assim, este arquivo define is_published = false
--   explicitamente no INSERT, por clareza e para não depender de um default
--   que poderia mudar no futuro.)
-- - venue_members.member_role: check constraint aceita somente 'owner' ou
--   'manager'. venue_members tem UNIQUE (venue_id, user_id) — irrelevante
--   aqui, pois cada chamada gera um venue_id novo.
-- - Hoje só administradores podem inserir em venue_members (nenhuma policy
--   de INSERT para o próprio usuário). É exatamente por isso que esta
--   função PRECISA de SECURITY DEFINER: ela roda com o papel do dono da
--   função (que tem permissão), não do usuário que a chama — e é a própria
--   lógica interna da função (nunca aceitar user_id de fora, sempre usar
--   auth.uid()) que garante que ninguém vira "admin" por causa disso.
-- - storage.objects: NÃO existem policies hoje (nada para remover ou
--   colidir).
-- - Bucket venue-media: existe, é público, sem file_size_limit nem
--   allowed_mime_types configurados ainda.
-- - Não existe function create_owned_venue nem policies com os nomes
--   propostos.
--
-- Não altera nenhuma tabela/coluna existente. Não apaga dados. Não
-- renomeia nada. Não remove nenhuma policy que não tenha sido criada por
-- este mesmo arquivo.

-- ============================================================================
-- 1) Função: cria o venue (sempre não publicado) e já vincula o usuário
--    autenticado como owner em venue_members, atomicamente.
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

  while exists (select 1 from public.venues where slug = v_slug) loop
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

comment on function public.create_owned_venue(text, text, text, text, text, text) is
  'Cria um novo estabelecimento (public.venues, sempre is_published = false) já vinculado ao usuário autenticado como owner ativo (public.venue_members). Nunca aceita user_id externo — usa auth.uid() internamente.';

revoke all on function public.create_owned_venue(text, text, text, text, text, text) from public;
revoke all on function public.create_owned_venue(text, text, text, text, text, text) from anon;
grant execute on function public.create_owned_venue(text, text, text, text, text, text) to authenticated;

-- ============================================================================
-- 2) Storage: policies de INSERT/UPDATE/DELETE no bucket venue-media.
--    Confirmado que NÃO existe nenhuma policy hoje em storage.objects —
--    nada é removido ou substituído. Leitura não precisa de policy: o
--    bucket já é público (confirmado), então SELECT já funciona sem RLS
--    adicional.
--
--    Convenção de path (usa venue_id, já que não existe uma entidade
--    "empresa" separada de venue no schema real):
--      <venue_id>/capa.<ext>
--      <venue_id>/logo.<ext>
--      <venue_id>/galeria/<arquivo>
--      <venue_id>/video/<arquivo>
--
--    Cada policy exige, em conjunto:
--    a) bucket_id = 'venue-media';
--    b) o primeiro segmento do caminho seja um UUID sintaticamente válido
--       (regex explícita — não confia apenas na comparação com venue_id);
--    c) exista um vínculo ATIVO (is_active = true) em venue_members entre
--       o usuário autenticado (auth.uid()) e esse venue_id, com
--       member_role 'owner' ou 'manager'.
-- ============================================================================

drop policy if exists "qual_e_a_boa venue owners insert media" on storage.objects;

create policy "qual_e_a_boa venue owners insert media"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'venue-media'
  and (storage.foldername(name))[1] ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
  and exists (
    select 1 from public.venue_members
    where venue_id = ((storage.foldername(name))[1])::uuid
      and user_id = auth.uid()
      and member_role in ('owner', 'manager')
      and is_active = true
  )
);

drop policy if exists "qual_e_a_boa venue owners update media" on storage.objects;

create policy "qual_e_a_boa venue owners update media"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'venue-media'
  and (storage.foldername(name))[1] ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
  and exists (
    select 1 from public.venue_members
    where venue_id = ((storage.foldername(name))[1])::uuid
      and user_id = auth.uid()
      and member_role in ('owner', 'manager')
      and is_active = true
  )
)
with check (
  bucket_id = 'venue-media'
  and (storage.foldername(name))[1] ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
  and exists (
    select 1 from public.venue_members
    where venue_id = ((storage.foldername(name))[1])::uuid
      and user_id = auth.uid()
      and member_role in ('owner', 'manager')
      and is_active = true
  )
);

drop policy if exists "qual_e_a_boa venue owners delete media" on storage.objects;

create policy "qual_e_a_boa venue owners delete media"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'venue-media'
  and (storage.foldername(name))[1] ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
  and exists (
    select 1 from public.venue_members
    where venue_id = ((storage.foldername(name))[1])::uuid
      and user_id = auth.uid()
      and member_role in ('owner', 'manager')
      and is_active = true
  )
);

-- ============================================================================
-- 3) Limites de mídia no bucket venue-media.
--
--    Configurados AQUI, no bucket (servidor), não só no frontend — porque
--    validação só no frontend pode ser contornada por qualquer requisição
--    feita fora da UI (ex.: curl direto para a Storage API com a
--    publishable key). O frontend deve REPETIR essas mesmas checagens
--    antes do upload apenas por UX (feedback rápido ao usuário), mas a
--    aplicação real de segurança é esta, no bucket.
--
--    allowed_mime_types cobre exatamente os 5 tipos pedidos (3 imagens +
--    2 vídeos). file_size_limit é um único teto por arquivo do bucket
--    inteiro (o Storage não permite limites diferentes por tipo de
--    arquivo) — usamos 50MB, dimensionado para o maior caso de uso real
--    (vídeo), já que 3-5MB seria curto demais para vídeo mas
--    desnecessariamente alto para imagem. Um limite mais apertado
--    especificamente para imagens (ex.: sugerir <5MB) fica só como
--    validação de UX no frontend, não é imposto aqui.
-- ============================================================================

update storage.buckets
set
  file_size_limit = 52428800, -- 50 MB, em bytes
  allowed_mime_types = array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'video/mp4',
    'video/webm'
  ]
where id = 'venue-media';

-- ============================================================================
-- ROLLBACK MANUAL (NÃO executar automaticamente).
-- Ordem: policies e limites do bucket primeiro, função por último.
-- ============================================================================
--
-- drop policy if exists "qual_e_a_boa venue owners delete media" on storage.objects;
-- drop policy if exists "qual_e_a_boa venue owners update media" on storage.objects;
-- drop policy if exists "qual_e_a_boa venue owners insert media" on storage.objects;
-- update storage.buckets set file_size_limit = null, allowed_mime_types = null where id = 'venue-media';
-- drop function if exists public.create_owned_venue(text, text, text, text, text, text);
