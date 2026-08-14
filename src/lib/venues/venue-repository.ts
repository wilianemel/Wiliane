import "server-only";

import { venues as localVenues, type Venue } from "@/data/venues";
import { createClient } from "@/lib/supabase/server";
import { mapVenueRow } from "./venue-mapper";
import type { VenueRow } from "./venue-row";
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
  "cover_image_url", "logo_url", "video_url", "reservation_url",
  "data_confidence", "is_published", "is_featured",
  "open_now", "is_demo", "last_verified_at", "created_at", "updated_at",
].join(",");

function warnFallback(scope: "lista" | "slug") {
  console.warn(`[venues] Supabase indisponível na consulta de ${scope}; usando dados locais de segurança.`);
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
    return ((data ?? []) as unknown as VenueRow[]).map(mapVenueRow);
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
    const galleryUrls = await listGalleryUrls(supabase, row.id);
    return galleryUrls.length > 0 ? { ...venue, galleryUrls } : venue;
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
