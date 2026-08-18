"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Venue } from "@/data/venues";
import { EMPTY_VENUE_FILTERS, searchVenues, type VenueFilters } from "@/lib/search-venues";
import type { VenueHoursStatus } from "@/lib/venues/venue-hours";
import { SearchFilters } from "./search-filters";
import { SearchResultCard } from "./search-result-card";

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background";

function SearchIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      className="h-5 w-5 shrink-0"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="6.5" />
      <path strokeLinecap="round" d="m20 20-3.2-3.2" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

function FilterIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      className="h-4 w-4 shrink-0"
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M7 12h10M10 18h4" />
    </svg>
  );
}

function ChevronDownIcon({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      className={`h-3.5 w-3.5 shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" />
    </svg>
  );
}

interface ActiveFilterChip {
  key: string;
  label: string;
  onRemove: () => void;
}

interface SearchPageProps {
  venues: Venue[];
  initialQuery: string;
  /** Controla o título/subtítulo próprios da busca — útil quando a página que reaproveita este componente já tem seu próprio <h1>. Padrão true, preserva o comportamento atual de /buscar. */
  showHeader?: boolean;
  /** venue.venueId -> status calculado no servidor. Ausente para um venueId = sem horário estruturado, card cai no fallback venue.openNow. */
  hoursStatusByVenueId?: Record<string, VenueHoursStatus>;
  /** Filtros pré-selecionados ao abrir a página (ex.: atalho de categoria na Home) — mescla com EMPTY_VENUE_FILTERS, mesmo mecanismo de filtro de sempre, só com estado inicial diferente. */
  initialFilters?: Partial<VenueFilters>;
}

export function SearchPage({
  venues,
  initialQuery,
  showHeader = true,
  hoursStatusByVenueId,
  initialFilters,
}: SearchPageProps) {
  const [query, setQuery] = useState(initialQuery);
  const [filters, setFilters] = useState<VenueFilters>(() => ({
    ...EMPTY_VENUE_FILTERS,
    ...initialFilters,
  }));
  // Painel de filtros começa fechado — o campo de busca é o protagonista da
  // tela; quem já veio com um filtro pré-selecionado (ex.: atalho de
  // categoria na Home) vê o resumo em chip sem precisar abrir o painel.
  const [filtersOpen, setFiltersOpen] = useState(false);

  const results = useMemo(
    () => searchVenues(query, filters, venues, hoursStatusByVenueId),
    [query, filters, venues, hoursStatusByVenueId],
  );

  const hasActiveFilters =
    filters.city !== null ||
    filters.category !== null ||
    filters.priceRange !== null ||
    filters.openNowOnly ||
    filters.liveMusicOnly;

  // Só descreve o `filters` atual como chips removíveis — não recalcula
  // nem duplica a lógica de busca, que continua inteira em search-venues.ts.
  const activeFilterChips = useMemo<ActiveFilterChip[]>(() => {
    const chips: ActiveFilterChip[] = [];
    if (filters.category) {
      chips.push({
        key: "category",
        label: filters.category,
        onRemove: () => setFilters((current) => ({ ...current, category: null })),
      });
    }
    if (filters.city) {
      chips.push({
        key: "city",
        label: filters.city,
        onRemove: () => setFilters((current) => ({ ...current, city: null })),
      });
    }
    if (filters.priceRange) {
      chips.push({
        key: "price",
        label: filters.priceRange,
        onRemove: () => setFilters((current) => ({ ...current, priceRange: null })),
      });
    }
    if (filters.openNowOnly) {
      chips.push({
        key: "open",
        label: "Aberto agora",
        onRemove: () => setFilters((current) => ({ ...current, openNowOnly: false })),
      });
    }
    if (filters.liveMusicOnly) {
      chips.push({
        key: "live",
        label: "Música ao vivo",
        onRemove: () => setFilters((current) => ({ ...current, liveMusicOnly: false })),
      });
    }
    return chips;
  }, [filters]);

  function clearFilters() {
    setFilters(EMPTY_VENUE_FILTERS);
  }

  function clearSearch() {
    setQuery("");
    setFilters(EMPTY_VENUE_FILTERS);
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-10">
      {showHeader && (
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Buscar</h1>
      )}

      <form
        onSubmit={(event) => event.preventDefault()}
        className={showHeader ? "mt-4" : ""}
      >
        <label htmlFor="buscar-input" className="sr-only">
          Buscar experiência
        </label>
        <div className="flex items-center gap-3 rounded-2xl border border-border bg-background-elevated px-4 py-4 shadow-sm shadow-black/20">
          <SearchIcon />
          <input
            id="buscar-input"
            type="text"
            enterKeyHint="search"
            autoComplete="off"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Busque lugares ou experiências"
            className="w-full bg-transparent text-base text-foreground placeholder:text-muted focus:outline-none"
          />
          {query.length > 0 && (
            <button
              type="button"
              onClick={clearSearch}
              aria-label="Limpar pesquisa"
              className={`inline-flex shrink-0 items-center justify-center rounded-full p-1 text-muted transition-colors hover:text-accent ${focusRing}`}
            >
              <CloseIcon />
            </button>
          )}
        </div>
      </form>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setFiltersOpen((open) => !open)}
          aria-expanded={filtersOpen}
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition-colors ${focusRing} ${
            filtersOpen || hasActiveFilters
              ? "border-accent bg-accent/10 text-accent"
              : "border-border text-muted hover:border-accent/60 hover:text-accent"
          }`}
        >
          <FilterIcon />
          Filtros
          {hasActiveFilters && (
            <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-accent-foreground">
              {activeFilterChips.length}
            </span>
          )}
          <ChevronDownIcon open={filtersOpen} />
        </button>

        {activeFilterChips.map((chip) => (
          <button
            key={chip.key}
            type="button"
            onClick={chip.onRemove}
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-background-elevated px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-accent hover:text-accent ${focusRing}`}
          >
            {chip.label}
            <span aria-hidden="true">×</span>
          </button>
        ))}
      </div>

      {filtersOpen && (
        <div className="animate-fade-up mt-3">
          <SearchFilters
            venues={venues}
            filters={filters}
            onChange={setFilters}
            onClear={clearFilters}
            hasActiveFilters={hasActiveFilters}
          />
        </div>
      )}

      <p className="mt-5 text-sm text-muted">
        {results.length} {results.length === 1 ? "resultado encontrado" : "resultados encontrados"}
      </p>

      {results.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-border bg-background-elevated p-8 text-center">
          <p className="text-lg font-semibold text-foreground">
            Nenhuma experiência encontrada.
          </p>
          <p className="mt-2 text-sm text-muted">
            Tente outro termo ou remova alguns filtros.
          </p>
          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <button
              type="button"
              onClick={clearFilters}
              className={`inline-flex items-center gap-2 rounded-full border border-border px-6 py-3 text-sm font-medium text-muted transition-colors hover:border-accent hover:text-accent ${focusRing}`}
            >
              Limpar filtros
            </button>
            <Link
              href="/descobrir"
              className={`inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground transition-transform hover:scale-[1.02] ${focusRing}`}
            >
              Me ajude a escolher
            </Link>
          </div>
        </div>
      ) : (
        <div className="mt-3 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((venue) => (
            <SearchResultCard
              key={venue.id}
              venue={venue}
              hoursStatus={hoursStatusByVenueId?.[venue.venueId] ?? null}
            />
          ))}
        </div>
      )}
    </div>
  );
}
