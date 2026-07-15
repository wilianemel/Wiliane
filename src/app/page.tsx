import { Header } from "@/components/header";
import { Hero } from "@/components/hero";
import { ExperienceIntentions } from "@/components/experience-intentions";
import { FeaturedVenues } from "@/components/featured-venues";
import { TrustSection } from "@/components/trust-section";
import { BusinessCta } from "@/components/business-cta";
import { Footer } from "@/components/footer";

export default function Home() {
  return (
    <>
      <Header />
      <main className="flex-1">
        <Hero />
        <ExperienceIntentions />
        <FeaturedVenues />
        <TrustSection />
        <BusinessCta />
      </main>
      <Footer />
    </>
  );
}
