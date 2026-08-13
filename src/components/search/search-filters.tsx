import type { PriceRange, Venue } from "@/data/venues";
import type { VenueFilters } from "@/lib/search-venues";
import type { RegionWithCities } from "@/lib/venues/city-repository";

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background";

const selectClasses =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-accent";

const PRICE_RANGES: PriceRange[] = ["$", "$$", "$$$"];

/** Rótulos mais claros para a mesma faixa de preço já usada nos dados existentes — o valor salvo continua "$"/"$$"/"$$$". */
const PRICE_RANGE_LABELS: Record<PriceRange, string> = {
  $: "$ - Até R$50",
  $$: "$$ - R$50 até R$150",
  $$$: "$$$ - Acima de R$150",
};

/** Categorias preparadas para estabelecimentos que ainda não existem na base — aparecem no filtro mesmo sem nenhum resultado ainda, mesmo espírito de "preparado para o futuro" já usado em outras partes do projeto. */
const PREPARED_CATEGORIES = ["Padaria", "Eventos", "Baladas", "Pub"];

interface SearchFiltersProps {
  venues: Venue[];
  regions: RegionWithCities[];
  filters: VenueFilters;
  onChange: (filters: VenueFilters) => void;
  onClear: () => void;
  hasActiveFilters: boolean;
}

export function SearchFilters({
  venues,
  regions,
  filters,
  onChange,
  onClear,
  hasActiveFilters,
}: SearchFiltersProps) {
  const categories = Array.from(
    new Set([...venues.map((venue) => venue.category), ...PREPARED_CATEGORIES]),
  ).sort((a, b) => a.localeCompare(b, "pt-BR"));

  return (
    <div className="mt-6 rounded-2xl border border-border bg-background-elevated p-4 sm:p-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="filtro-cidade" className="text-xs font-medium text-muted">
            Cidade
          </label>
          <select
            id="filtro-cidade"
            className={selectClasses}
            value={filters.city ?? ""}
            onChange={(event) => onChange({ ...filters, city: event.target.value || null })}
          >
            <option value="">Todas as cidades</option>
            {regions.length > 0 ? (
              regions.map((region) => (
                <optgroup key={region.id} label={region.name}>
                  {region.cities.map((city) => (
                    <option key={city.id} value={city.name}>
                      {city.name}
                    </option>
                  ))}
                </optgroup>
              ))
            ) : (
              // Fallback enquanto regions/cities não estiver disponível no
              // Supabase — mantém pelo menos a cidade que já existe hoje.
              <option value="São José dos Campos">São José dos Campos</option>
            )}
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
            <option value="">Todos</option>
            {PRICE_RANGES.map((price) => (
              <option key={price} value={price}>
                {PRICE_RANGE_LABELS[price]}
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
