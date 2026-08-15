import type { Venue } from "@/data/venues";
import { resolveVenueOpenNow, type VenueHoursStatus } from "@/lib/venues/venue-hours";
import type { VenueMomentTag } from "@/lib/venues/venue-tags";

const SAO_PAULO_TIME_ZONE = "America/Sao_Paulo";
const MAX_TODAY_VENUES = 10;
/** Abaixo disso, a seção "Hoje na sua cidade" completaria com poucos cards demais — preferimos misturar com o restante dos abertos a mostrar uma fileira vazia/curta demais. */
const MIN_MOMENT_MATCHES = 4;

/** Período aproximado de agora em America/Sao_Paulo, mapeado pras tags de momento já existentes em venue-tags.ts (mesma convenção horária de venue-hours.ts). */
function currentMomentTag(now: Date): VenueMomentTag {
  const hour = Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: SAO_PAULO_TIME_ZONE,
      hour: "2-digit",
      hourCycle: "h23",
    }).format(now),
  );

  if (hour >= 6 && hour < 11) return "cafe-da-manha";
  if (hour >= 11 && hour < 15) return "almoco";
  if (hour >= 15 && hour < 18) return "fim-de-tarde";
  if (hour >= 18 && hour < 20) return "happy-hour";
  if (hour >= 20 && hour < 23) return "jantar";
  return "madrugada";
}

/**
 * "Hoje na sua cidade" real: só estabelecimentos abertos agora de verdade
 * (mesma resolveVenueOpenNow usada no filtro "Aberto agora" e no
 * match-engine — nunca recalcula horário aqui), priorizando os que batem
 * com o período atual do dia quando isso resulta em cards suficientes. Sem
 * inventar evento/popularidade nenhum — é só um recorte do catálogo real.
 */
export function getTodayVenues(
  venues: Venue[],
  hoursStatusByVenueId: Record<string, VenueHoursStatus>,
  now: Date,
): Venue[] {
  const openVenues = venues.filter((venue) => resolveVenueOpenNow(venue, hoursStatusByVenueId));

  const moment = currentMomentTag(now);
  const withMoment = openVenues.filter((venue) => venue.tags.includes(moment));

  if (withMoment.length >= MIN_MOMENT_MATCHES) {
    return withMoment.slice(0, MAX_TODAY_VENUES);
  }

  const withMomentIds = new Set(withMoment.map((venue) => venue.id));
  const rest = openVenues.filter((venue) => !withMomentIds.has(venue.id));
  return [...withMoment, ...rest].slice(0, MAX_TODAY_VENUES);
}
