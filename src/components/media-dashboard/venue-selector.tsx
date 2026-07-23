export interface VenueOption {
  slug: string;
  name: string;
  category: string;
}

interface VenueSelectorProps {
  options: VenueOption[];
  selectedSlug: string;
  onChange: (slug: string) => void;
}

export function VenueSelector({ options, selectedSlug, onChange }: VenueSelectorProps) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor="venue-selector" className="text-xs font-medium text-muted">
        Estabelecimento (visão administrativa)
      </label>
      <select
        id="venue-selector"
        value={selectedSlug}
        onChange={(event) => onChange(event.target.value)}
        className="w-full max-w-sm rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-accent sm:w-auto"
      >
        {options.map((option) => (
          <option key={option.slug} value={option.slug}>
            {option.name} · {option.category}
          </option>
        ))}
      </select>
    </div>
  );
}
