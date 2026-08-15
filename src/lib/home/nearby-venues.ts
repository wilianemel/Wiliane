import type { Venue } from "@/data/venues";

const MAX_NEARBY_VENUES = 10;

/**
 * "Perto de você" com o dado que já existe (`distanceKm`) — mesmo critério
 * já usado na seção "Perto de você" de /descobrir (exploration-page.tsx).
 * `distanceKm` é o campo estático de demonstração do piloto, não
 * geolocalização real (ver comentário em 001_create_venues.sql) — este
 * helper não pede permissão de localização nem calcula nada, só ordena
 * pelo valor que já existe no banco.
 */
export function getNearbyVenues(venues: Venue[]): Venue[] {
  return venues
    .filter((venue): venue is Venue & { distanceKm: number } => venue.distanceKm !== null)
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, MAX_NEARBY_VENUES);
}
