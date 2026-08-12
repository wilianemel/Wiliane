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
import { getPublishedVenues } from "@/lib/venues/venue-repository";
import { CityProvider } from "@/lib/city-context";

export default async function Home() {
  const venues = await getPublishedVenues();
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
            <HomeMatchFlow venues={venues} />
          </div>
          <FeaturedVenues venues={venues} />
          <TrustSection />
          <BusinessCta />
        </main>
        <Footer />
      </div>
    </CityProvider>
  );
}
