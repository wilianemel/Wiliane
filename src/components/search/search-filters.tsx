import type { PriceRange, Venue } from "@/data/venues";
import type { VenueFilters } from "@/lib/search-venues";

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background";

const selectClasses =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-accent";

const PRICE_RANGES: PriceRange[] = ["$", "$$", "$$$"];

interface SearchFiltersProps {
  venues: Venue[];
  filters: VenueFilters;
  onChange: (filters: VenueFilters) => void;
  onClear: () => void;
  hasActiveFilters: boolean;
}

export function SearchFilters({
  venues,
  filters,
  onChange,
  onClear,
  hasActiveFilters,
}: SearchFiltersProps) {
  const categories = Array.from(new Set(venues.map((venue) => venue.category))).sort((a, b) =>
    a.localeCompare(b),
  );
  const neighborhoods = Array.from(new Set(venues.map((venue) => venue.neighborhood))).sort(
    (a, b) => a.localeCompare(b),
  );

  return (
    <div className="mt-6 rounded-2xl border border-border bg-background-elevated p-4 sm:p-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <div className="flex flex-col gap-1">
          <label htmlFor="filtro-cidade" className="text-xs font-medium text-muted">
            Cidade
          </label>
          <select id="filtro-cidade" className={selectClasses} defaultValue="sjc">
            <option value="sjc">São José dos Campos</option>
            <option value="outras" disabled>
              Outras cidades em breve
            </option>
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="filtro-categoria" className="text-xs font-medium text-muted">
            Categoria
          </label>
          <select
            id="filtro-categoria"
            className={selectClasses}
            value={filters.category ?? ""}
            onChange={(event) =>
              onChange({ ...filters, category: event.target.value || null })
            }
          >
            <option value="">Todas</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="filtro-bairro" className="text-xs font-medium text-muted">
            Bairro
          </label>
          <select
            id="filtro-bairro"
            className={selectClasses}
            value={filters.neighborhood ?? ""}
            onChange={(event) =>
              onChange({ ...filters, neighborhood: event.target.value || null })
            }
          >
            <option value="">Todos</option>
            {neighborhoods.map((neighborhood) => (
              <option key={neighborhood} value={neighborhood}>
                {neighborhood}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="filtro-preco" className="text-xs font-medium text-muted">
            Faixa de preço
          </label>
          <select
            id="filtro-preco"
            className={selectClasses}
            value={filters.priceRange ?? ""}
            onChange={(event) =>
              onChange({
                ...filters,
                priceRange: (event.target.value || null) as PriceRange | null,
              })
            }
          >
            <option value="">Todas</option>
            {PRICE_RANGES.map((price) => (
              <option key={price} value={price}>
                {price}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col justify-end gap-2 pb-0.5">
          <label className="inline-flex items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={filters.openNowOnly}
              onChange={(event) =>
                onChange({ ...filters, openNowOnly: event.target.checked })
              }
              className={`h-4 w-4 rounded border-border accent-accent ${focusRing}`}
            />
            Aberto agora
          </label>
          <label className="inline-flex items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={filters.liveMusicOnly}
              onChange={(event) =>
                onChange({ ...filters, liveMusicOnly: event.target.checked })
              }
              className={`h-4 w-4 rounded border-border accent-accent ${focusRing}`}
            />
            Música ao vivo
          </label>
        </div>
      </div>

      {hasActiveFilters && (
        <button
          type="button"
          onClick={onClear}
          className={`mt-4 inline-flex items-center gap-2 text-sm font-medium text-muted underline-offset-4 transition-colors hover:text-accent hover:underline ${focusRing} rounded`}
        >
          Limpar filtros
        </button>
      )}
    </div>
  );
}
