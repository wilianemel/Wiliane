import type { Venue, PriceRange } from "@/data/venues";
import type { IntentionId, MusicPreferenceId } from "@/types/discovery";
import {
  ATMOSPHERE_TAG_IDS,
  COMPANION_TAG_IDS,
  isCustomAtmosphereValue,
  type VenueAtmosphereTag,
  type VenueCompanionTag,
} from "./venue-tags";
import type { VenueRow } from "./venue-row";

const PRICE_RANGES = new Set<PriceRange>(["$", "$$", "$$$"]);
const INTENTIONS = new Set<IntentionId>(["casal", "familia", "amigos", "musica-ao-vivo", "relaxar", "comemorar", "novidade", "surpreenda"]);
// Taxonomia estendida (ver venue-tags.ts) — inclui as opções originais do
// questionário de /descobrir como subconjunto, mais o vocabulário adicional
// que um estabelecimento pode usar para se descrever.
const COMPANIONS = new Set<VenueCompanionTag>(COMPANION_TAG_IDS);
const ATMOSPHERES = new Set<VenueAtmosphereTag>(ATMOSPHERE_TAG_IDS);
const MUSIC = new Set<MusicPreferenceId>(["sem-preferencia", "rock", "mpb", "sertanejo", "eletronica", "ambiente"]);
const GRADIENTS = [
  "from-amber-500/30 via-zinc-900 to-black",
  "from-rose-500/20 via-zinc-900 to-black",
  "from-yellow-400/25 via-zinc-900 to-black",
  "from-orange-400/20 via-zinc-900 to-black",
  "from-lime-500/20 via-zinc-900 to-black",
  "from-red-500/20 via-zinc-900 to-black",
] as const;

function typedValues<T extends string>(values: string[] | null, allowed: Set<T>): T[] {
  return (values ?? []).filter((value): value is T => allowed.has(value as T));
}

/**
 * Igual a typedValues, mas para `atmospheres` especificamente: além das
 * opções fixas, preserva valores personalizados válidos ("Outro" + descrição
 * por grupo — ver isCustomAtmosphereValue em venue-tags.ts). Sem isso, todo
 * "Outro" salvo pelo dono seria descartado silenciosamente ao carregar o
 * venue de volta.
 */
function mapAtmospheres(values: string[] | null): VenueAtmosphereTag[] {
  return (values ?? []).filter(
    (value): value is VenueAtmosphereTag =>
      ATMOSPHERES.has(value as VenueAtmosphereTag) || isCustomAtmosphereValue(value),
  );
}

function stableGradient(slug: string): string {
  const index = [...slug].reduce((sum, char) => sum + char.charCodeAt(0), 0) % GRADIENTS.length;
  return GRADIENTS[index];
}

function mapPriceRange(value: string | null): PriceRange {
  return value && PRICE_RANGES.has(value as PriceRange) ? (value as PriceRange) : "$$";
}

export function mapVenueRow(row: VenueRow): Venue {
  return {
    id: row.slug,
    venueId: row.id,
    name: row.name,
    category: row.category,
    city: row.city,
    neighborhood: row.neighborhood,
    address: row.address,
    priceRange: mapPriceRange(row.price_range),
    description: row.description,
    tags: row.tags ?? [],
    cuisineTypes: row.cuisine_types ?? [],
    schedule: row.schedule ?? [],
    // Sem coluna "compatibility" no banco: não inventamos um valor, o campo
    // fica ausente (opcional) e a UI oculta o badge quando não há score real.
    gradient: stableGradient(row.slug),
    // Preserva null explicitamente: preço não informado não é R$ 0 (grátis).
    averagePricePerPerson: row.average_price_per_person,
    // Preserva null explicitamente: distância desconhecida não é 0 km.
    distanceKm: row.distance_km,
    intentions: typedValues(row.intentions, INTENTIONS),
    companions: typedValues(row.companions, COMPANIONS),
    atmospheres: mapAtmospheres(row.atmospheres),
    musicStyles: typedValues(row.music_styles, MUSIC),
    openNow: row.open_now,
    dataConfidence: row.data_confidence,
    updatedAt: row.updated_at,
    lastVerifiedAt: row.last_verified_at ?? undefined,
    isVerified: row.is_verified,
    verifiedAt: row.verified_at ?? undefined,
    isDemo: row.is_demo,
    menuHighlights: row.menu_highlights ?? [],
    whatsappNumber: row.whatsapp_number ?? "",
    videoUrl: row.video_url ?? undefined,
    coverImageUrl: row.cover_image_url ?? undefined,
    logoUrl: row.logo_url ?? undefined,
    reservationUrl: row.reservation_url ?? undefined,
    menuUrl: row.menu_url ?? undefined,
    websiteUrl: row.website ?? undefined,
  };
}
