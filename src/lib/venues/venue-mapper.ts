import type { Venue, PriceRange } from "@/data/venues";
import type { AtmosphereId, CompanionId, IntentionId, MusicPreferenceId } from "@/types/discovery";
import type { VenueRow } from "./venue-row";

const PRICE_RANGES = new Set<PriceRange>(["$", "$$", "$$$"]);
const INTENTIONS = new Set<IntentionId>(["casal", "familia", "amigos", "musica-ao-vivo", "relaxar", "comemorar", "novidade", "surpreenda"]);
const COMPANIONS = new Set<CompanionId>(["sozinho", "casal", "familia", "amigos"]);
const ATMOSPHERES = new Set<AtmosphereId>(["tranquilo", "animado", "romantico", "familiar", "sofisticado", "casual"]);
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
    averagePricePerPerson: row.average_price_per_person ?? 0,
    // Preserva null explicitamente: distância desconhecida não é 0 km.
    distanceKm: row.distance_km,
    intentions: typedValues(row.intentions, INTENTIONS),
    companions: typedValues(row.companions, COMPANIONS),
    atmospheres: typedValues(row.atmospheres, ATMOSPHERES),
    musicStyles: typedValues(row.music_styles, MUSIC),
    openNow: row.open_now,
    dataConfidence: row.data_confidence,
    updatedAt: row.updated_at,
    lastVerifiedAt: row.last_verified_at ?? undefined,
    isDemo: row.is_demo,
    menuHighlights: row.menu_highlights ?? [],
    whatsappNumber: row.whatsapp_number ?? "",
    videoUrl: row.video_url ?? undefined,
  };
}
