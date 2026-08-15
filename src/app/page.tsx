import { Header } from "@/components/header";
import { HomeAmbientBackground } from "@/components/home/home-ambient-background";
import { HomeSearchShortcut } from "@/components/home/home-search-shortcut";
import { HomeHero } from "@/components/home/home-hero";
import { HomeExperiences } from "@/components/home/home-experiences";
import { HomeVenueRow } from "@/components/home/home-venue-row";
import { HomeRadar } from "@/components/home/home-radar";
import { HomeCategoryShortcuts } from "@/components/home/home-category-shortcuts";
import { HomeMatchFlow } from "@/components/home-discovery/home-match-flow";
import { FeaturedVenues } from "@/components/featured-venues";
import { TrustSection } from "@/components/trust-section";
import { BusinessCta } from "@/components/business-cta";
import { Footer } from "@/components/footer";
import { getPublishedVenues, getVenuesBusinessHours } from "@/lib/venues/venue-repository";
import { buildVenueHoursStatusMap } from "@/lib/venues/venue-hours";
import { getForYouVenues } from "@/lib/home/for-you";
import { getTodayVenues } from "@/lib/home/today-venues";
import { getNearbyVenues } from "@/lib/home/nearby-venues";
import type { UserPreferencesRow } from "@/lib/user-intelligence/preference-score";
import { createClient } from "@/lib/supabase/server";
import { CityProvider } from "@/lib/city-context";

export default async function Home() {
  const venues = await getPublishedVenues();
  // Uma única consulta em lote para todos os venues da página, não uma por
  // card — evita N+1 (ver getVenuesBusinessHours em venue-repository.ts).
  // Calculado aqui no servidor, com o mesmo `now` para todos os cards e
  // seções (inclusive "Hoje na sua cidade"), e repassado como prop já
  // pronta — mesma estratégia contra hydration mismatch usada em
  // /lugares/[id].
  const now = new Date();
  const hoursByVenueId = await getVenuesBusinessHours(venues.map((venue) => venue.venueId));
  const hoursStatusByVenueId = buildVenueHoursStatusMap(hoursByVenueId, now);

  // "Perfeito para você": mesmo histórico declarado (user_preferences) que
  // já alimenta o bônus de personalização do match-engine (preference-score.ts),
  // só lido aqui direto no servidor em vez de client-side — não importa
  // match-engine.ts nem altera nenhum peso dele. Sem sessão, sem linha em
  // user_preferences, ou sem preferências: getForYouVenues() retorna lista
  // vazia e a seção some (ver home-venue-row.tsx).
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let userPreferences: UserPreferencesRow | null = null;
  if (user) {
    const { data } = await supabase
      .from("user_preferences")
      .select("favorite_categories, favorite_atmospheres, preferred_companions")
      .eq("user_id", user.id)
      .maybeSingle();
    userPreferences = data;
  }

  const forYouVenues = getForYouVenues(venues, userPreferences);
  const todayVenues = getTodayVenues(venues, hoursStatusByVenueId, now);
  const nearbyVenues = getNearbyVenues(venues);

  return (
    <CityProvider>
      <div className="relative flex min-h-full flex-col">
        <HomeAmbientBackground />
        <Header />
        <main className="relative flex-1">
          <HomeSearchShortcut />
          <HomeHero />
          <div id="match-flow" className="scroll-mt-20">
            <HomeMatchFlow venues={venues} hoursStatusByVenueId={hoursStatusByVenueId} />
          </div>

          <HomeVenueRow
            title="Perfeito para você"
            subtitle="Combinando com o que você costuma escolher."
            venues={forYouVenues}
            hoursStatusByVenueId={hoursStatusByVenueId}
          />
          <HomeRadar venues={todayVenues} hoursStatusByVenueId={hoursStatusByVenueId} />
          <HomeVenueRow
            title="Perto de você"
            subtitle="Pela distância cadastrada de cada estabelecimento."
            venues={nearbyVenues}
            hoursStatusByVenueId={hoursStatusByVenueId}
          />

          <HomeCategoryShortcuts />
          <HomeExperiences venues={venues} />
          <FeaturedVenues venues={venues} hoursStatusByVenueId={hoursStatusByVenueId} />

          {/* Institucional/B2B — não faz parte do feed principal do
              consumidor no mobile; continua completo no desktop. */}
          <div className="hidden md:block">
            <TrustSection />
            <BusinessCta />
          </div>
        </main>
        <Footer />
      </div>
    </CityProvider>
  );
}
