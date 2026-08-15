import Link from "next/link";

function SearchIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      className="h-4 w-4 shrink-0"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="6.5" />
      <path strokeLinecap="round" d="m20 20-3.2-3.2" />
    </svg>
  );
}

/**
 * Atalho pra busca — sem reimplementar a lógica de busca aqui, só um link
 * pra /buscar que já faz tudo isso. Fica visível logo no topo da Home,
 * antes do bloco emocional, pra quem já sabe o que quer não precisar rolar
 * até o fim pra encontrar a busca.
 */
export function HomeSearchShortcut() {
  return (
    <div className="mx-auto max-w-3xl px-4 pt-4 sm:px-6 sm:pt-6">
      <Link
        href="/buscar"
        className="flex items-center gap-3 rounded-full border border-border bg-background-elevated/80 px-4 py-3.5 text-sm text-muted backdrop-blur transition-colors hover:border-accent/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <SearchIcon />
        Buscar lugares ou experiências
      </Link>
    </div>
  );
}
