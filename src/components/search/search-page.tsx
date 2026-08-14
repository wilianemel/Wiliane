"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Venue } from "@/data/venues";
import { EMPTY_VENUE_FILTERS, searchVenues, type VenueFilters } from "@/lib/search-venues";
import type { RegionWithCities } from "@/lib/venues/city-repository";
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
      className="h-4 w-4"
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

interface SearchPageProps {
  venues: Venue[];
  initialQuery: string;
  /** Controla o título/subtítulo próprios da busca — útil quando a página que reaproveita este componente já tem seu próprio <h1>. Padrão true, preserva o comportamento atual de /buscar. */
  showHeader?: boolean;
  /** Regiões/cidades (regions/cities) para o seletor de cidade. Opcional e
   * default vazio de propósito — quem não passar (ex.: ExplorationPage em
   * /descobrir) continua funcionando exatamente como antes, só sem a lista
   * de cidades ampliada. */
  regions?: RegionWithCities[];
  /** venue.venueId -> status calculado no servidor. Ausente para um venueId = sem horário estruturado, card cai no fallback venue.openNow. */
  hoursStatusByVenueId?: Record<string, VenueHoursStatus>;
}

export function SearchPage({
  venues,
  initialQuery,
  showHeader = true,
  regions = [],
  hoursStatusByVenueId,
}: SearchPageProps) {
  const [query, setQuery] = useState(initialQuery);
  const [filters, setFilters] = useState<VenueFilters>(EMPTY_VENUE_FILTERS);

  const results = useMemo(
    () => searchVenues(query, filters, venues),
    [query, filters, venues],
  );

  const hasActiveFilters =
    filters.city !== null ||
    filters.category !== null ||
    filters.priceRange !== null ||
    filters.openNowOnly ||
    filters.liveMusicOnly;

  function clearFilters() {
    setFilters(EMPTY_VENUE_FILTERS);
  }

  function clearSearch() {
    setQuery("");
    setFilters(EMPTY_VENUE_FILTERS);
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
      {showHeader && (
        <>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Encontre diretamente o que procura
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted sm:text-base">
            Busque por lugar, comida, bairro, evento ou tipo de experiência. Os
            resultados usam os estabelecimentos publicados na base atual do produto.
          </p>
        </>
      )}

      <form
        onSubmit={(event) => event.preventDefault()}
        className="mt-8 flex flex-col gap-3 sm:flex-row"
      >
        <label htmlFor="buscar-input" className="sr-only">
          Buscar experiência
        </label>
        <div className="flex flex-1 items-center gap-2 rounded-full border border-border bg-background-elevated px-4 py-3">
          <SearchIcon />
          <input
            id="buscar-input"
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Busque por restaurante, bar, comida, evento ou lugar..."
            className="w-full bg-transparent text-sm text-foreground placeholder:text-muted focus:outline-none"
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
        <button
          type="submit"
          aria-label="Buscar"
          className={`rounded-full bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground transition-transform hover:scale-[1.02] ${focusRing}`}
        >
          Buscar
        </button>
      </form>

      <SearchFilters
        venues={venues}
        regions={regions}
        filters={filters}
        onChange={setFilters}
        onClear={clearFilters}
        hasActiveFilters={hasActiveFilters}
      />

      <p className="mt-6 text-sm text-muted">
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
        <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
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
