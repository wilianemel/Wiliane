import "server-only";

import { venues as localVenues, type Venue } from "@/data/venues";
import { createClient } from "@/lib/supabase/server";
import { mapVenueRow } from "./venue-mapper";
import type { VenueRow } from "./venue-row";
import { resolveFeaturedMediaUrl } from "./venue-media";
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

/**
 * Vídeo ativo: destacado > primeiro vídeo ativo > venues.video_url (coluna
 * legada, nunca apagada). Mesma regra/helper de resolveCoverImageUrl acima
 * — vídeo "ativo" não precisa mais ser especificamente o destacado para
 * aparecer como mídia principal do perfil público.
 */
function resolveVideoUrl(media: VenueMediaRow[] | undefined, fallback?: string): string | undefined {
  return resolveFeaturedMediaUrl(
    media?.map((item) => ({ url: item.url, mediaType: item.media_type, isFeatured: item.is_featured })),
    "video",
    fallback,
  );
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

/**
 * CORREÇÃO (404 indevido em /lugares/[slug]): a versão anterior envolvia a
 * consulta do venue E as consultas de mídia (venue_media/Storage) num único
 * try/catch — qualquer erro nas consultas de mídia (mesmo com o venue
 * encontrado e publicado) caía no mesmo catch, que devolve o fallback local
 * de demonstração; como um venue real não está nessa lista local, o
 * resultado virava `null` e a página 404ava mesmo com o estabelecimento
 * publicado e existente no banco. Agora são 3 blocos isolados:
 *   1) consulta do venue (existe + publicado) — só ISSO decide null/404;
 *   2) mídia (venue_media) — erro aqui nunca derruba o venue, só faz
 *      coverImageUrl/videoUrl caírem no valor legado da própria linha;
 *   3) galeria legada (Storage) — erro aqui nunca derruba o venue, só faz
 *      a galeria ficar vazia.
 * Cada bloco loga de forma diferenciada (inexistente vs. não publicado vs.
 * erro de mídia vs. erro de Storage), nunca um "not found" genérico.
 */
export async function getPublishedVenueBySlug(slugOrId: string): Promise<Venue | null> {
  const supabase = await createClient();
  const column = isUuid(slugOrId) ? "id" : "slug";

  let row: VenueRow | null;
  try {
    const { data, error } = await supabase
      .from("venues")
      .select(VENUE_COLUMNS)
      .eq(column, slugOrId)
      .eq("is_published", true)
      .maybeSingle();

    if (error) throw error;
    row = (data as unknown as VenueRow | null) ?? null;
  } catch (error) {
    console.error(
      `[venues] Erro ao consultar o estabelecimento (${column}="${slugOrId}") — Supabase indisponível; usando dado local de segurança, se existir.`,
      error,
    );
    warnFallback("slug");
    const venue = localVenues.find((item) => item.id === slugOrId);
    return venue ? { ...venue, isDemo: true } : null;
  }

  if (!row) {
    // Diferencia "não existe" de "existe mas não está publicado" só no log
    // — o resultado público (null -> 404) é o mesmo nos dois casos, mas o
    // log deixa claro qual é a causa real em vez de um "not found" cego.
    // Falha nesta checagem extra (puramente diagnóstica) nunca muda o
    // resultado: o venue já não foi encontrado de qualquer forma.
    try {
      const { data: existsRow } = await supabase
        .from("venues")
        .select("id")
        .eq(column, slugOrId)
        .maybeSingle();

      if (existsRow) {
        console.warn(
          `[venues] 404: estabelecimento existe mas não está publicado (${column}="${slugOrId}", id=${existsRow.id}).`,
        );
      } else {
        console.warn(`[venues] 404: estabelecimento inexistente (${column}="${slugOrId}").`);
      }
    } catch (error) {
      console.warn(
        `[venues] 404: estabelecimento não encontrado (${column}="${slugOrId}") — não foi possível diferenciar inexistente/não publicado.`,
        error,
      );
    }
    return null;
  }

  const venue = mapVenueRow(row);

  // venue_media (mídia canônica) e a listagem antiga da galeria no Storage
  // — falha em QUALQUER uma delas nunca torna o estabelecimento "não
  // encontrado": cada uma cai isoladamente no fallback legado da própria
  // linha de venues (video_url/cover_image_url) ou em galeria vazia.
  const [mediaResult, galleryResult] = await Promise.allSettled([
    getVenuesMedia(supabase, [row.id]),
    listGalleryUrls(supabase, row.id),
  ]);

  let media: VenueMediaRow[] | undefined;
  if (mediaResult.status === "fulfilled") {
    media = mediaResult.value[row.id];
  } else {
    console.error(
      `[venues] Erro de mídia (venue_media) ao carregar "${row.slug}" (id=${row.id}) — usando fallback legado de vídeo/capa (venues.video_url/cover_image_url). Estabelecimento continua sendo exibido normalmente.`,
      mediaResult.reason,
    );
  }

  let legacyGalleryUrls: string[] = [];
  if (galleryResult.status === "fulfilled") {
    legacyGalleryUrls = galleryResult.value;
  } else {
    console.error(
      `[venues] Erro de Storage (galeria legada) ao carregar "${row.slug}" (id=${row.id}) — galeria ficará vazia. Estabelecimento continua sendo exibido normalmente.`,
      galleryResult.reason,
    );
  }

  return {
    ...venue,
    coverImageUrl: resolveCoverImageUrl(media, venue.coverImageUrl),
    videoUrl: resolveVideoUrl(media, venue.videoUrl),
    galleryUrls: resolveGalleryUrls(media, legacyGalleryUrls),
  };
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
