import "server-only";

import { venues as localVenues, type Venue } from "@/data/venues";
import { createClient } from "@/lib/supabase/server";
import { mapVenueRow } from "./venue-mapper";
import type { VenueRow } from "./venue-row";

const VENUE_COLUMNS = [
  "id", "slug", "name", "city", "neighborhood", "address", "category", "description",
  "cuisine_types", "tags", "music_styles", "atmospheres", "intentions", "companions",
  "menu_highlights", "schedule", "price_range", "average_price_per_person",
  "average_price_for_couple", "distance_km", "whatsapp_number", "instagram_url", "menu_url",
  "cover_image_url", "video_url", "data_confidence", "is_published", "is_featured",
  "open_now", "is_demo", "last_verified_at", "created_at", "updated_at",
].join(",");

function warnFallback(scope: "lista" | "slug") {
  console.warn(`[venues] Supabase indisponível na consulta de ${scope}; usando dados locais de segurança.`);
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

export async function getPublishedVenueBySlug(slug: string): Promise<Venue | null> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("venues")
      .select(VENUE_COLUMNS)
      .eq("slug", slug)
      .eq("is_published", true)
      .maybeSingle();

    if (error) throw error;
    return data ? mapVenueRow(data as unknown as VenueRow) : null;
  } catch {
    warnFallback("slug");
    const venue = localVenues.find((item) => item.id === slug);
    return venue ? { ...venue, isDemo: true } : null;
  }
}
