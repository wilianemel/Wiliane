import Link from "next/link";

/**
 * Atalhos de categoria — levam pra /buscar já com o filtro certo
 * pré-selecionado (VenueFilters existente, ver search-page.tsx), nunca uma
 * lógica de filtro paralela. "Música ao vivo" usa o filtro liveMusicOnly
 * que já existe; as demais usam o valor exato de VENUE_CATEGORIES.
 */
const CATEGORY_SHORTCUTS = [
  { label: "Restaurantes", href: "/buscar?category=Restaurante" },
  { label: "Bares", href: "/buscar?category=Bar" },
  { label: "Cafeterias", href: "/buscar?category=Cafeteria" },
  { label: "Música ao vivo", href: "/buscar?liveMusic=1" },
  { label: "Eventos", href: "/buscar?category=Eventos" },
  { label: "Baladas", href: "/buscar?category=Balada" },
  { label: "Pubs", href: "/buscar?category=Pub" },
];

export function HomeCategoryShortcuts() {
  return (
    <section className="border-b border-border/60">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
          Explore por categoria
        </h2>

        <div className="-mx-4 mt-4 flex gap-2.5 overflow-x-auto px-4 pb-2 sm:mx-0 sm:flex-wrap sm:px-0">
          {CATEGORY_SHORTCUTS.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="shrink-0 rounded-full border border-border bg-background-elevated px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:border-accent hover:text-accent active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
