import { Header } from "@/components/header";
import { HomeDiscoveryFlow } from "@/components/home-discovery/home-discovery-flow";
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
      <Header />
      <main className="flex-1">
        <HomeDiscoveryFlow />
        <FeaturedVenues venues={venues} />
        <TrustSection />
        <BusinessCta />
      </main>
      <Footer />
    </CityProvider>
  );
}
