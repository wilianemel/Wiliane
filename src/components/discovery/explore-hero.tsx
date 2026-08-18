import Image from "next/image";
import Link from "next/link";

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background";

/**
 * Gradiente forte no topo (onde o título fica — a foto já é naturalmente
 * escura ali, céu noturno) e some rapidamente depois, pra não escurecer as
 * pessoas, a comida e as bebidas, que ocupam o centro e a base da imagem.
 * Sem escurecimento no rodapé: o hero é um cartão contido (bordas
 * arredondadas), não um bleed de página, então não precisa integrar com o
 * fundo por baixo.
 */
const HERO_GRADIENT_STYLE = {
  backgroundImage:
    "linear-gradient(to bottom, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.4) 24%, rgba(0,0,0,0.05) 48%, rgba(0,0,0,0) 100%)",
};

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
 * Topo visual de /descobrir — foto real (grupo de amigos numa cobertura à
 * noite, com petiscos e drinks; diferente da imagem usada no Hero da
 * Home). Único h1 da página: tanto o modo sem filtro quanto o modo
 * filtrado (ver exploration-page.tsx) reaproveitam este mesmo componente,
 * e o nome do filtro ativo (quando existe) vira h2 abaixo dele.
 */
export function ExploreHero() {
  return (
    <div className="mx-auto max-w-6xl px-4 pt-6 sm:px-6 sm:pt-10">
      <section className="relative h-[45dvh] min-h-[300px] w-full overflow-hidden rounded-3xl sm:h-[380px] lg:h-[440px]">
        <Image
          src="/images/explore/explore-hero-nightlife.png"
          alt="Grupo de amigos brindando numa cobertura à noite, com petiscos e drinks na mesa"
          fill
          priority
          sizes="(min-width: 1024px) 1024px, (min-width: 768px) 90vw, 100vw"
          className="object-cover"
        />
        <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={HERO_GRADIENT_STYLE} />

        <div className="absolute inset-x-0 top-0 flex flex-col gap-3 p-5 sm:p-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white drop-shadow-sm sm:text-4xl">
              Explore novas experiências
            </h1>
            <p className="mt-1 max-w-sm text-sm text-white/85 sm:text-base">
              Bares, sabores, música e momentos para viver agora.
            </p>
          </div>

          <Link
            href="/buscar"
            className={`inline-flex w-fit items-center gap-2 rounded-full border border-white/20 bg-black/40 px-4 py-2.5 text-sm font-medium text-white backdrop-blur-md transition-colors hover:border-accent/60 hover:bg-black/55 ${focusRing}`}
          >
            <SearchIcon />
            Buscar
          </Link>
        </div>
      </section>
    </div>
  );
}
