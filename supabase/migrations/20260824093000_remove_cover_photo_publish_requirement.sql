-- ============================================================================
-- Migration: remove_cover_photo_publish_requirement
--
-- Remove a foto de capa da regra de completude de publicação. Antes, um
-- estabelecimento só podia ser publicado com uma imagem destacada (capa)
-- ativa; agora a publicação depende só de dados básicos, categoria e
-- experiência, horários, VÍDEO e contato — capa nunca mais bloqueia
-- publicação. "Mantenha apenas fotos de galeria e vídeos": a partir de
-- agora, capa é só um campo legado/opcional (nunca apagado, ver comentário
-- abaixo), não um requisito de mídia separado.
--
-- CREATE OR REPLACE com a MESMA assinatura de public._venue_publish_checklist
-- e public._venue_publish_missing_summary — nenhuma das 4 RPCs que chamam
-- essas funções (complete_new_venue_onboarding, complete_existing_venue_
-- onboarding, a revalidação de auto-unpublish, e o backfill histórico desta
-- própria migration anterior) precisa mudar: todas continuam passando
-- p_has_cover normalmente, só que a partir de agora esse valor é ignorado
-- no cálculo de "complete" e nunca mais aparece como pendência.
--
-- Não apaga nada: cover_image_url em public.venues e is_featured em
-- public.venue_media continuam existindo e sendo lidos normalmente onde já
-- eram (capa de venues antigos nunca some) — só deixam de ser exigidos para
-- publicar. RLS, planos, Storage e todos os dados existentes intactos.
-- ============================================================================

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
      -- Mantido no retorno por compatibilidade estrutural (nada mais lê esta
      -- chave fora desta função e de _venue_publish_missing_summary), mas
      -- NUNCA mais entra no cálculo de "complete" nem na lista de pendências.
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
    -- CORREÇÃO (remove obrigatoriedade de capa): "complete" não depende mais
    -- de cover_photo.
    'complete', basic_data and category_experience and hours and video and contact
  )
  from flags;
$func$;

comment on function public._venue_publish_checklist(text, text, text, text, text, text, text, numeric, text, text, text, text[], text[], text[], boolean, boolean, boolean) is
  'Regra única de completude para publicar um estabelecimento: Dados básicos, Categoria e experiência, Horários, Vídeo e Contato. CORRIGIDO: Foto de capa deixou de ser obrigatória para publicar (mantém apenas fotos de galeria e vídeo como mídia relevante) — cover_photo continua no retorno por compatibilidade, mas nunca mais entra em "complete". site/Instagram/link de cardápio/reserva propositalmente NÃO entram aqui — continuam opcionais.';

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

comment on function public._venue_publish_missing_summary(jsonb) is
  'Texto de pendências a partir do checklist de _venue_publish_checklist. CORRIGIDO: nunca mais lista "Foto de capa" como pendência.';

revoke all on function public._venue_publish_checklist(text, text, text, text, text, text, text, numeric, text, text, text, text[], text[], text[], boolean, boolean, boolean) from public, anon, authenticated;
revoke all on function public._venue_publish_missing_summary(jsonb) from public, anon, authenticated;
