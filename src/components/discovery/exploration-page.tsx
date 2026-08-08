import type { Venue } from "@/data/venues";
import { SearchPage } from "@/components/search/search-page";
import { SearchResultCard } from "@/components/search/search-result-card";

/** Teto de itens por fileira em carrossel — evita uma seção infinita quando o catálogo crescer. */
const MAX_SECTION_ITEMS = 8;

interface CuratedSection {
  title: string;
  filter: (venue: Venue) => boolean;
  sort?: (a: Venue, b: Venue) => number;
}

/**
 * Fase 1 da exploração: só seções com critério real nos dados existentes
 * (ver análise). De propósito, NÃO inclui "Para você" (depende de alguma
 * noção de preferência do usuário — decisão de produto em aberto),
 * "Bombando agora" (sem métrica real de popularidade) nem "Hoje"
 * (schedule é texto livre, não estruturado por dia da semana).
 */
const CURATED_SECTIONS: CuratedSection[] = [
  {
    title: "Perto de você",
    filter: (venue) => venue.distanceKm !== null,
    sort: (a, b) => (a.distanceKm as number) - (b.distanceKm as number),
  },
  { title: "Jantar", filter: (venue) => venue.tags.includes("jantar") },
  { title: "Happy hour", filter: (venue) => venue.tags.includes("happy-hour") },
  { title: "Música ao vivo", filter: (venue) => venue.intentions.includes("musica-ao-vivo") },
  { title: "Romântico", filter: (venue) => venue.atmospheres.includes("romantico") },
  {
    title: "Família",
    filter: (venue) =>
      venue.companions.includes("familia") || venue.intentions.includes("familia"),
  },
  { title: "Pet friendly", filter: (venue) => venue.companions.includes("pets") },
  { title: "Novidades", filter: (venue) => venue.intentions.includes("novidade") },
];

/** Fileira com scroll horizontal — adaptação mínima: SearchResultCard não muda, só ganha um wrapper com largura fixa. */
function VenueRow({ venues }: { venues: Venue[] }) {
  return (
    <div className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
      {venues.map((venue) => (
        <div key={venue.id} className="w-72 shrink-0 sm:w-80">
          <SearchResultCard venue={venue} />
        </div>
      ))}
    </div>
  );
}

interface ExplorationPageProps {
  venues: Venue[];
}

export function ExplorationPage({ venues }: ExplorationPageProps) {
  const sections = CURATED_SECTIONS.map((section) => {
    const matched = venues.filter(section.filter);
    const ordered = section.sort ? [...matched].sort(section.sort) : matched;
    return { title: section.title, venues: ordered.slice(0, MAX_SECTION_ITEMS) };
  }).filter((section) => section.venues.length > 0);

  return (
    <div>
      <div className="mx-auto max-w-5xl px-4 pt-10 sm:px-6 sm:pt-14">
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Descubra a sua próxima experiência
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted sm:text-base">
          Explore lugares por momento, estilo e companhia.
        </p>

        {sections.map((section) => (
          <section key={section.title} className="mt-10">
            <h2 className="text-lg font-semibold text-foreground sm:text-xl">{section.title}</h2>
            <div className="mt-4">
              <VenueRow venues={section.venues} />
            </div>
          </section>
        ))}
      </div>

      {/* Área de exploração completa — busca por texto + filtros + grid, reaproveitada de /buscar sem alterações. */}
      <div className="mt-4 border-t border-border/60">
        <SearchPage venues={venues} initialQuery="" showHeader={false} />
      </div>
    </div>
  );
}
