import type { Venue } from "@/data/venues";
import type { VenueHoursStatus } from "@/lib/venues/venue-hours";
import { HomeVenueRow } from "./home-venue-row";

/**
 * "Hoje na sua cidade" com dado real — estabelecimentos abertos agora de
 * verdade (venue_business_hours via getTodayVenues em lib/home/today-venues.ts),
 * priorizando o período atual do dia quando há dado suficiente. Substituiu
 * o MVP visual anterior (4 blocos fixos tipo "Lugares mais procurados",
 * sem venue nenhum por trás) — nada aqui é inventado: sem estabelecimento
 * aberto agora, a seção some (ver HomeVenueRow).
 */
export function HomeRadar({
  venues,
  hoursStatusByVenueId,
}: {
  venues: Venue[];
  hoursStatusByVenueId?: Record<string, VenueHoursStatus>;
}) {
  return (
    <HomeVenueRow
      title="Hoje na sua cidade"
      subtitle="Estabelecimentos abertos agora, perto do seu momento."
      venues={venues}
      hoursStatusByVenueId={hoursStatusByVenueId}
    />
  );
}
