import Link from "next/link";
import type { Venue } from "@/data/venues";
import { HomeVenueRow } from "@/components/home/home-venue-row";
import { HomeVenueRowCard } from "@/components/home/home-venue-row-card";
import type { VenueHoursStatus } from "@/lib/venues/venue-hours";

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background";

/** Teto de itens por fileira em carrossel — evita uma seção infinita quando o catálogo crescer. */
const MAX_SECTION_ITEMS = 8;

interface CuratedSection {
  title: string;
  /** Texto curto opcional — só quando explica o critério real da seção, sem inventar popularidade. */
  subtitle?: string;
  filter: (venue: Venue) => boolean;
  sort?: (a: Venue, b: Venue) => number;
}

/**
 * Mesmas seções da Fase 1, só com critério real nos dados existentes. De
 * propósito, NÃO inclui "Para você" (isso já é resolvido na Home via
 * getForYouVenues, não duplicado aqui), "Bombando agora" (sem métrica real
 * de popularidade) nem "Hoje" (schedule é texto livre, não estruturado por
 * dia da semana).
 */
const CURATED_SECTIONS: CuratedSection[] = [
  {
    title: "Perto de você",
    subtitle: "Pela distância cadastrada de cada estabelecimento.",
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

function SearchIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      className="h-4 w-4"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="7" />
      <path strokeLinecap="round" d="m20 20-3.5-3.5" />
    </svg>
  );
}

/**
 * CTA discreto de fim de página — Explorar não deve terminar virando uma
 * cópia de /buscar. Em vez de embutir o formulário completo de busca aqui
 * dentro (como na Fase 1), só um convite curto pra quem quer algo
 * específico. /buscar continua existindo e intacto, sem filtros duplicados.
 */
function SearchCta() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <div className="flex flex-col items-start gap-3 rounded-2xl border border-border/70 bg-background-elevated px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <p className="text-sm font-semibold text-foreground">Quer algo específico?</p>
          <p className="mt-0.5 text-sm text-muted">Filtre por nome, culinária, bairro ou música.</p>
        </div>
        <Link
          href="/buscar"
          className={`inline-flex w-full items-center justify-center gap-2 rounded-full border border-accent px-5 py-2.5 text-sm font-semibold text-accent transition-all hover:bg-accent hover:text-accent-foreground sm:w-auto ${focusRing}`}
        >
          Buscar com filtros
        </Link>
      </div>
    </div>
  );
}

interface ExplorationPageProps {
  venues: Venue[];
  /** venue.venueId -> status calculado no servidor — ver comentário equivalente em search-page.tsx. */
  hoursStatusByVenueId?: Record<string, VenueHoursStatus>;
  /**
   * Vem dos atalhos de categoria da Home (via /descobrir?category=...
   * ou ?liveMusic=1, ver descobrir/page.tsx) — quando presente, a tela
   * mostra só esse recorte já filtrado, como um grid de cards editoriais
   * (mesma linguagem visual das fileiras curadas), nunca o formulário de
   * busca. Continua sendo Explorar, nunca vira uma cópia de /buscar.
   */
  activeFilter?: { label: string; venues: Venue[] } | null;
}

export function ExplorationPage({ venues, hoursStatusByVenueId, activeFilter }: ExplorationPageProps) {
  if (activeFilter) {
    return (
      <div>
        <div className="mx-auto max-w-6xl px-4 pt-8 sm:px-6 sm:pt-12">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-accent">Explorando</p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                {activeFilter.label}
              </h1>
            </div>
            <Link
              href="/descobrir"
              className={`inline-flex shrink-0 items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-medium text-muted transition-colors hover:border-accent hover:text-accent ${focusRing}`}
            >
              Ver tudo
            </Link>
          </div>

          {activeFilter.venues.length === 0 ? (
            <div className="mt-8 rounded-2xl border border-border bg-background-elevated p-8 text-center">
              <p className="text-sm text-muted">
                Nenhuma experiência publicada para esse filtro no momento.
              </p>
            </div>
          ) : (
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
              {activeFilter.venues.map((venue) => (
                <HomeVenueRowCard
                  key={venue.id}
                  venue={venue}
                  hoursStatus={hoursStatusByVenueId?.[venue.venueId] ?? null}
                  className="aspect-[3/4] w-full"
                />
              ))}
            </div>
          )}
        </div>

        <SearchCta />
      </div>
    );
  }

  const sections = CURATED_SECTIONS.map((section) => {
    const matched = venues.filter(section.filter);
    const ordered = section.sort ? [...matched].sort(section.sort) : matched;
    return {
      title: section.title,
      subtitle: section.subtitle,
      venues: ordered.slice(0, MAX_SECTION_ITEMS),
    };
  }).filter((section) => section.venues.length > 0);

  return (
    <div>
      <div className="mx-auto max-w-6xl px-4 pt-8 sm:px-6 sm:pt-12">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Explorar</h1>
            <p className="mt-1 text-sm text-muted sm:text-base">
              Descubra experiências para o seu momento.
            </p>
          </div>
          <Link
            href="/buscar"
            className={`inline-flex shrink-0 items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-medium text-muted transition-colors hover:border-accent hover:text-accent ${focusRing}`}
          >
            <SearchIcon />
            Buscar
          </Link>
        </div>
      </div>

      <div className="mt-6">
        {sections.map((section) => (
          <HomeVenueRow
            key={section.title}
            title={section.title}
            subtitle={section.subtitle}
            venues={section.venues}
            hoursStatusByVenueId={hoursStatusByVenueId}
          />
        ))}
      </div>

      <SearchCta />
    </div>
  );
}
