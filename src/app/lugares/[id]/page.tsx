import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { VenueProfile } from "@/components/venues/venue-profile";
import { BrandLogo } from "@/components/shared/brand-logo";
import { getPublishedVenueBySlug } from "@/lib/venues/venue-repository";

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

interface VenuePageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: VenuePageProps): Promise<Metadata> {
  const { id } = await params;
  const venue = await getPublishedVenueBySlug(id);

  if (!venue) {
    return { title: "Estabelecimento não encontrado — Qual é a Boa!" };
  }

  return {
    title: `${venue.name} — Qual é a Boa!`,
    description: venue.description,
  };
}

export default async function VenuePage({ params }: VenuePageProps) {
  const { id } = await params;
  const venue = await getPublishedVenueBySlug(id);

  if (!venue) {
    notFound();
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-border/60 bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-2 sm:px-6">
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
        <VenueProfile
          venue={venue}
          backLabel="Voltar para a busca"
          backHref="/buscar"
          showHelpCta
        />
      </main>
    </div>
  );
}
