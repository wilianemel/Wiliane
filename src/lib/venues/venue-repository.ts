import "server-only";

import { venues as localVenues, type Venue } from "@/data/venues";
import { createClient } from "@/lib/supabase/server";
import { mapVenueRow } from "./venue-mapper";
import type { VenueRow } from "./venue-row";
import { resolveFeaturedMediaUrl, resolveFirstMediaUrl } from "./venue-media";
import {
  normalizeVenueBusinessHourRows,
  type VenueBusinessHour,
  type VenueBusinessHourRow,
} from "./venue-hours";

const VENUE_COLUMNS = [
  "id", "slug", "name", "city", "neighborhood", "address", "category", "description",
  "cuisine_types", "tags", "music_styles", "atmospheres", "intentions", "companions",
  "menu_highlights", "schedule", "price_range", "average_price_per_person",
  "average_price_for_couple", "distance_km", "whatsapp_number", "instagram_url", "menu_url",
  "website", "cover_image_url", "logo_url", "video_url", "reservation_url",
  "data_confidence", "is_published", "is_featured",
  "open_now", "is_demo", "last_verified_at", "is_verified", "verified_at", "created_at", "updated_at",
].join(",");

function warnFallback(scope: "lista" | "slug") {
  console.warn(`[venues] Supabase indisponível na consulta de ${scope}; usando dados locais de segurança.`);
}

interface VenueMediaRow {
  venue_id: string;
  url: string;
  media_type: "image" | "video";
  is_featured: boolean;
}

/**
 * public.venue_media é a fonte canônica de galeria e vídeo (ver
 * 20260818220256_simplify_existing_venue_onboarding.sql) — só mídia ativa
 * de venues publicados, já filtrado pela policy de RLS pública. Batched
 * (um único `in (...)`) para listas de cards, evitando N+1.
 */
async function getVenuesMedia(
  supabase: Awaited<ReturnType<typeof createClient>>,
  venueIds: string[],
): Promise<Record<string, VenueMediaRow[]>> {
  if (venueIds.length === 0) return {};

  const { data, error } = await supabase
    .from("venue_media")
    .select("venue_id, url, media_type, is_featured")
    .in("venue_id", venueIds)
    // Filtro explícito, nunca só a RLS: a policy de dono/gestor também
    // libera leitura de mídia inativa (para o painel gerenciar), então
    // esta função — usada só para exibição pública — precisa garantir
    // sozinha que nunca mostra nada com is_active = false.
    .eq("is_active", true)
    .order("created_at", { ascending: true });

  if (error || !data) return {};

  const byVenueId: Record<string, VenueMediaRow[]> = {};
  for (const row of data as VenueMediaRow[]) {
    (byVenueId[row.venue_id] ??= []).push(row);
  }
  return byVenueId;
}

/**
 * Capa: imagem destacada > primeira imagem > venues.cover_image_url (nunca
 * apagada, só preterida quando já existe mídia canônica melhor).
 */
function resolveCoverImageUrl(media: VenueMediaRow[] | undefined, fallback?: string): string | undefined {
  if (!media || media.length === 0) return fallback;
  const images = media.filter((item) => item.media_type === "image");
  if (images.length === 0) return fallback;
  return (images.find((item) => item.is_featured) ?? images[0]).url;
}

/** Vídeo destacado preenche o fallback de venues.video_url; sem destaque, cai para a coluna antiga. */
function resolveVideoUrl(media: VenueMediaRow[] | undefined, fallback?: string): string | undefined {
  if (!media || media.length === 0) return fallback;
  const featuredVideo = media.find((item) => item.media_type === "video" && item.is_featured);
  return featuredVideo?.url ?? fallback;
}

/**
 * CORREÇÃO (auditoria 3ª rodada): a versão anterior substituía a galeria
 * antiga inteira pelas imagens de venue_media assim que existisse
 * qualquer linha lá — como o backfill cria a capa em venue_media, um
 * estabelecimento com galeria antiga (só no Storage) passava a mostrar
 * só a capa, perdendo o resto. Agora sempre UNE as imagens canônicas
 * ativas com as antigas do Storage, removendo URLs duplicadas e
 * priorizando a ordem das canônicas — nunca esconde a galeria antiga
 * enquanto ela não tiver sido migrada (adotada) para venue_media. Limite
 * conhecido: uma imagem antiga retirada pelo dono (soft delete em
 * venue_media, via listGalleryItems no painel) só some daqui também
 * depois que este código público também filtrar `is_active = false` —
 * hoje `legacy` vem só da listagem crua do Storage, sem essa checagem,
 * porque leitura de mídia inativa é restrita a dono/gestor pela RLS
 * (anon não pode consultar `is_active = false`). Até uma rotina de
 * limpeza física separada existir (ver migration, SEÇÃO 3F), o arquivo
 * continua no bucket e pode reaparecer aqui mesmo já retirado no painel.
 */
function resolveGalleryUrls(media: VenueMediaRow[] | undefined, legacy: string[] | undefined): string[] | undefined {
  const canonical = (media ?? []).filter((item) => item.media_type === "image").map((item) => item.url);
  const merged: string[] = [];
  const seen = new Set<string>();
  for (const url of [...canonical, ...(legacy ?? [])]) {
    if (!seen.has(url)) {
      seen.add(url);
      merged.push(url);
    }
  }
  return merged.length > 0 ? merged : undefined;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * `get_recommendation_cards_v3` (usado no fluxo emocional da Home) retorna
 * `venue_id` (uuid), não o slug. Para o link "Ver experiência" continuar
 * abrindo `/lugares/[id]` normalmente nesse caso, aceitamos aqui as duas
 * formas de identificar um estabelecimento, sem alterar a assinatura da
 * função nem exigir mudança em nenhum dos chamadores existentes (que
 * continuam passando slug, como sempre).
 */
function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}

function demoLocalVenues(): Venue[] {
  return localVenues.map((venue) => ({ ...venue, isDemo: true }));
}

export async function getPublishedVenues(): Promise<Venue[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("venues")
      .select(VENUE_COLUMNS)
      .eq("is_published", true)
      .order("is_featured", { ascending: false })
      .order("name", { ascending: true });

    if (error) throw error;
    // O projeto ainda não gera Database types pelo CLI do Supabase. A linha
    // é validada na fronteira pelo tipo manual e convertida em um único mapper.
    const rows = (data ?? []) as unknown as VenueRow[];
    const venues = rows.map(mapVenueRow);

    // Capa: venue_media (canônica) sobrepõe cover_image_url quando existir
    // imagem — uma única consulta em lote para a lista inteira, sem N+1.
    // Nunca apaga cover_image_url: só é preterida na exibição quando há
    // mídia canônica melhor (resolveCoverImageUrl cai pro fallback sozinho).
    const mediaByVenueId = await getVenuesMedia(
      supabase,
      rows.map((row) => row.id),
    );

    return venues.map((venue, index) => ({
      ...venue,
      coverImageUrl: resolveCoverImageUrl(mediaByVenueId[rows[index].id], venue.coverImageUrl),
    }));
  } catch {
    warnFallback("lista");
    return demoLocalVenues();
  }
}

export interface VenueSearchCardMedia {
  videoUrl?: string;
  imageUrl?: string;
}

/**
 * Mídia dos cards de /buscar — vídeo ativo (destacado > primeiro > coluna
 * legada) e, só quando não há vídeo, a PRIMEIRA foto ativa da galeria
 * (nunca a destacada/capa — pedido explícito só para este card, diferente
 * de resolveCoverImageUrl acima, usado por getPublishedVenues/perfil
 * público). Isolada de propósito: getPublishedVenues() e o tipo Venue
 * continuam intactos, então Home e Descobrir (que só leem coverImageUrl)
 * nunca mudam — só quem chamar esta função (app/buscar/page.tsx) recebe
 * este dado extra.
 */
export async function getVenuesSearchCardMedia(
  venues: Pick<Venue, "venueId" | "videoUrl" | "coverImageUrl">[],
): Promise<Record<string, VenueSearchCardMedia>> {
  const venueIds = venues.map((venue) => venue.venueId).filter((id) => id.length > 0);
  if (venueIds.length === 0) return {};

  try {
    const supabase = await createClient();
    const mediaByVenueId = await getVenuesMedia(supabase, venueIds);

    const result: Record<string, VenueSearchCardMedia> = {};
    for (const venue of venues) {
      if (!venue.venueId) continue;
      const media = mediaByVenueId[venue.venueId]?.map((item) => ({
        url: item.url,
        mediaType: item.media_type,
        isFeatured: item.is_featured,
      }));
      result[venue.venueId] = {
        videoUrl: resolveFeaturedMediaUrl(media, "video", venue.videoUrl),
        imageUrl: resolveFirstMediaUrl(media, "image", venue.coverImageUrl),
      };
    }
    return result;
  } catch {
    console.warn("[venues] Não foi possível carregar mídia dos cards de busca; cards caem no fallback de imagem.");
    return {};
  }
}

/**
 * Lista a galeria de um venue diretamente pelo prefixo no Storage
 * (<venue_id>/gallery/) — não existe coluna de galeria em public.venues,
 * então nunca inventamos uma; apenas listamos o que já foi enviado.
 */
async function listGalleryUrls(
  supabase: Awaited<ReturnType<typeof createClient>>,
  venueId: string,
): Promise<string[]> {
  const { data } = await supabase.storage.from("venue-media").list(`${venueId}/gallery`);
  return (data ?? [])
    .filter((item) => item.name && !item.name.endsWith("/"))
    .map(
      (item) =>
        supabase.storage.from("venue-media").getPublicUrl(`${venueId}/gallery/${item.name}`).data
          .publicUrl,
    );
}

export async function getPublishedVenueBySlug(slugOrId: string): Promise<Venue | null> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("venues")
      .select(VENUE_COLUMNS)
      .eq(isUuid(slugOrId) ? "id" : "slug", slugOrId)
      .eq("is_published", true)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    const row = data as unknown as VenueRow;
    const venue = mapVenueRow(row);

    // venue_media é a fonte canônica de galeria e vídeo — cai para a
    // listagem antiga do Storage (galeria) e para venues.video_url/
    // cover_image_url (vídeo/capa) por CAMPO, não em bloco: um venue pode
    // ter só um vídeo consolidado ainda, por exemplo, e nesse caso a
    // galeria de imagens continua vindo do Storage normalmente.
    const [mediaByVenueId, legacyGalleryUrls] = await Promise.all([
      getVenuesMedia(supabase, [row.id]),
      listGalleryUrls(supabase, row.id),
    ]);
    const media = mediaByVenueId[row.id];

    return {
      ...venue,
      coverImageUrl: resolveCoverImageUrl(media, venue.coverImageUrl),
      videoUrl: resolveVideoUrl(media, venue.videoUrl),
      galleryUrls: resolveGalleryUrls(media, legacyGalleryUrls),
    };
  } catch {
    warnFallback("slug");
    const venue = localVenues.find((item) => item.id === slugOrId);
    return venue ? { ...venue, isDemo: true } : null;
  }
}

/**
 * `null` cobre dois casos que o chamador trata do mesmo jeito — "continuar
 * com o comportamento antigo baseado em venues.open_now": nenhuma linha
 * cadastrada em venue_business_hours (venue ainda não migrou para horário
 * estruturado) ou falha real (rede/RLS). Só retorna as 7 linhas quando pelo
 * menos uma existe de fato — nunca inventa horário para um venue que nunca
 * configurou nada.
 */
export async function getPublishedVenueBusinessHours(venueId: string): Promise<VenueBusinessHour[] | null> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("venue_business_hours")
      .select("day_of_week, opens_at, closes_at, is_closed")
      .eq("venue_id", venueId);

    if (error) throw error;
    if (!data || data.length === 0) return null;

    return normalizeVenueBusinessHourRows(data as unknown as VenueBusinessHourRow[]);
  } catch {
    console.warn("[venues] Não foi possível carregar horário estruturado; usando venues.open_now.");
    return null;
  }
}

/**
 * Versão em lote de getPublishedVenueBusinessHours, para telas com lista de
 * cards (Home, /buscar, /descobrir) — uma única consulta
 * `where venue_id in (...)` em vez de uma por card (evita N+1). Só entram
 * no objeto retornado os venues que têm pelo menos uma linha cadastrada;
 * quem não aparece aqui não tem horário estruturado, e o chamador deve
 * cair no comportamento antigo baseado em venues.open_now para esse venue.
 */
export async function getVenuesBusinessHours(
  venueIds: string[],
): Promise<Record<string, VenueBusinessHour[]>> {
  if (venueIds.length === 0) return {};

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("venue_business_hours")
      .select("venue_id, day_of_week, opens_at, closes_at, is_closed")
      .in("venue_id", venueIds);

    if (error) throw error;

    const rowsByVenueId = new Map<string, VenueBusinessHourRow[]>();
    for (const row of (data ?? []) as (VenueBusinessHourRow & { venue_id: string })[]) {
      const rows = rowsByVenueId.get(row.venue_id) ?? [];
      rows.push(row);
      rowsByVenueId.set(row.venue_id, rows);
    }

    const result: Record<string, VenueBusinessHour[]> = {};
    for (const [venueId, rows] of rowsByVenueId) {
      result[venueId] = normalizeVenueBusinessHourRows(rows);
    }
    return result;
  } catch {
    console.warn("[venues] Não foi possível carregar horário estruturado em lote; usando venues.open_now.");
    return {};
  }
}
