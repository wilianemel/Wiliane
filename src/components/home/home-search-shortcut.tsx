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
 * pra /buscar que já faz tudo isso. Vive dentro do Hero (ver home-hero.tsx),
 * sobre a foto: fundo escuro translúcido + blur (efeito de vidro) pra ficar
 * legível em qualquer trecho da imagem, sem precisar de uma segunda busca
 * nem duplicar este componente em outro lugar da Home.
 */
export function HomeSearchShortcut() {
  return (
    <Link
      href="/buscar"
      className="flex items-center gap-3 rounded-full border border-white/15 bg-black/40 px-4 py-3.5 text-sm text-white/80 backdrop-blur-md transition-colors hover:border-accent/60 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <SearchIcon />
      Buscar lugares ou experiências
    </Link>
  );
}
