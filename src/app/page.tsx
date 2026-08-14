import { Header } from "@/components/header";
import { HomeAmbientBackground } from "@/components/home/home-ambient-background";
import { HomeHero } from "@/components/home/home-hero";
import { HomeExperiences } from "@/components/home/home-experiences";
import { HomeRadar } from "@/components/home/home-radar";
import { HomeMatchFlow } from "@/components/home-discovery/home-match-flow";
import { FeaturedVenues } from "@/components/featured-venues";
import { TrustSection } from "@/components/trust-section";
import { BusinessCta } from "@/components/business-cta";
import { Footer } from "@/components/footer";
import { getPublishedVenues, getVenuesBusinessHours } from "@/lib/venues/venue-repository";
import { buildVenueHoursStatusMap } from "@/lib/venues/venue-hours";
import { CityProvider } from "@/lib/city-context";

export default async function Home() {
  const venues = await getPublishedVenues();
  // Uma única consulta em lote para todos os venues da página, não uma por
  // card — evita N+1 (ver getVenuesBusinessHours em venue-repository.ts).
  // Calculado aqui no servidor, com o mesmo `now` para todos os cards, e
  // repassado como prop já pronta — mesma estratégia contra hydration
  // mismatch usada em /lugares/[id].
  const hoursByVenueId = await getVenuesBusinessHours(venues.map((venue) => venue.venueId));
  const hoursStatusByVenueId = buildVenueHoursStatusMap(hoursByVenueId, new Date());

  return (
    <CityProvider>
      <div className="relative flex min-h-full flex-col">
        <HomeAmbientBackground />
        <Header />
        <main className="relative flex-1">
          <HomeHero />
          <HomeExperiences venues={venues} />
          <HomeRadar />
          <div id="match-flow" className="scroll-mt-20">
            <HomeMatchFlow venues={venues} hoursStatusByVenueId={hoursStatusByVenueId} />
          </div>
          <FeaturedVenues venues={venues} hoursStatusByVenueId={hoursStatusByVenueId} />
          <TrustSection />
          <BusinessCta />
        </main>
        <Footer />
      </div>
    </CityProvider>
  );
}
