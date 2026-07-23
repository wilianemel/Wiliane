import type { Metadata } from "next";
import Link from "next/link";
import { venues as localVenues } from "@/data/venues";
import { getPublishedVenueBySlug } from "@/lib/venues/venue-repository";
import { MediaDashboard } from "@/components/media-dashboard/media-dashboard";
import { BrandLogo } from "@/components/shared/brand-logo";

export const metadata: Metadata = {
  title: "Painel de mídias — Qual é a Boa!",
  description: "Protótipo interno de gestão de vídeos dos estabelecimentos.",
};

const INITIAL_VENUE_SLUG = "garagem-do-espeto";

function ArrowLeftIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 12H5M11 18l-6-6 6-6" />
    </svg>
  );
}

export default async function PainelMidiasPage() {
  // Só o estabelecimento inicial busca dados "ao vivo" (com fallback
  // automático já embutido em getPublishedVenueBySlug); os demais, usados
  // apenas para preencher o seletor demonstrativo do administrador, vêm do
  // arquivo local de demonstração.
  const liveInitialVenue = await getPublishedVenueBySlug(INITIAL_VENUE_SLUG);

  const venues = localVenues.map((venue) =>
    venue.id === INITIAL_VENUE_SLUG && liveInitialVenue ? liveInitialVenue : venue,
  );

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-border/60 bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-4 py-2 sm:px-6">
          <Link href="/" aria-label="Qual é a Boa — página inicial">
            <BrandLogo variant="dark" size="medium" priority />
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-medium text-muted transition-colors hover:border-accent hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <ArrowLeftIcon />
            Voltar para a Home
          </Link>
        </div>
      </header>

      <main className="flex-1">
        <MediaDashboard venues={venues} />
      </main>
    </div>
  );
}
