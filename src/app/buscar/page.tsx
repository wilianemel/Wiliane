import type { Metadata } from "next";
import Link from "next/link";
import { venues } from "@/data/venues";
import { SearchPage } from "@/components/search/search-page";

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
  searchParams: Promise<{ q?: string }>;
}

export default async function BuscarPage({ searchParams }: BuscarPageProps) {
  const { q } = await searchParams;

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-border/60 bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link href="/" className="text-lg font-bold tracking-tight text-foreground">
            Qual é a Boa<span className="text-accent">!</span>
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
        <SearchPage venues={venues} initialQuery={q ?? ""} />
      </main>
    </div>
  );
}
