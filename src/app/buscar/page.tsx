import type { Metadata } from "next";
import Link from "next/link";
import { SearchPage } from "@/components/search/search-page";
import { SearchHero } from "@/components/search/search-hero";
import { BrandLogo } from "@/components/shared/brand-logo";
import {
  getPublishedVenues,
  getVenuesBusinessHours,
  getVenuesSearchCardMedia,
} from "@/lib/venues/venue-repository";
import { buildVenueHoursStatusMap } from "@/lib/venues/venue-hours";
import type { VenueFilters } from "@/lib/search-venues";

export const metadata: Metadata = {
  title: "Buscar — Qual é a Boa!",
  description:
    "Busque diretamente por nome, categoria, culinária, bairro, música ou característica da experiência.",
};

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

interface BuscarPageProps {
  /**
   * `category`/`liveMusic` vêm dos atalhos de categoria da Home
   * (HomeCategoryShortcuts) — mesmo VenueFilters de sempre, só pré-
   * preenchido pela URL em vez de começar sempre vazio.
   */
  searchParams: Promise<{ q?: string; category?: string; liveMusic?: string }>;
}

export default async function BuscarPage({ searchParams }: BuscarPageProps) {
  const { q, category, liveMusic } = await searchParams;
  const venues = await getPublishedVenues();
  // Uma única consulta em lote (evita N+1) — ver comentário equivalente em src/app/page.tsx.
  const hoursByVenueId = await getVenuesBusinessHours(venues.map((venue) => venue.venueId));
  const hoursStatusByVenueId = buildVenueHoursStatusMap(hoursByVenueId, new Date());
  // Só para os cards de /buscar (vídeo + primeira foto da galeria, sem
  // prioridade de capa) — nunca toca getPublishedVenues(), então Home e
  // Descobrir continuam exatamente como estão.
  const searchCardMediaByVenueId = await getVenuesSearchCardMedia(venues);

  const initialFilters: Partial<VenueFilters> = {
    ...(category ? { category } : {}),
    ...(liveMusic ? { liveMusicOnly: true } : {}),
  };

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-border/60 bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-2 sm:px-6">
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
        <SearchHero />
        <SearchPage
          venues={venues}
          initialQuery={q ?? ""}
          initialFilters={initialFilters}
          hoursStatusByVenueId={hoursStatusByVenueId}
          searchCardMediaByVenueId={searchCardMediaByVenueId}
          showHeader={false}
        />
      </main>
    </div>
  );
}
