import Image from "next/image";

/**
 * Gradiente suave, só no rodapé da foto (onde o texto fica) — a imagem em
 * si já é bem iluminada (cena diurna), então não precisa de um véu forte
 * cobrindo tudo. Sobe até ~75% da altura e some, preservando crianças,
 * playground, responsáveis e o restaurante nitidamente visíveis no resto
 * do quadro.
 */
const HERO_GRADIENT_STYLE = {
  backgroundImage:
    "linear-gradient(to top, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.15) 45%, rgba(0,0,0,0) 75%)",
};

/**
 * Topo visual de /buscar — foto real (crianças no playground, responsáveis
 * à mesa, restaurante ao ar livre; diferente das imagens usadas no Hero da
 * Home e no topo do Explorar). Único h1 da página — ver buscar/page.tsx,
 * que passa `showHeader={false}` pro SearchPage não duplicar o título.
 * Bem mais baixo que os outros dois heros, de propósito: a busca é a
 * protagonista real desta tela, a imagem só ambienta o topo.
 */
export function SearchHero() {
  return (
    <div className="mx-auto max-w-5xl px-4 pt-6 sm:px-6 sm:pt-10">
      <section className="relative h-[38dvh] min-h-[220px] w-full overflow-hidden rounded-3xl sm:h-[260px] lg:h-[300px]">
        <Image
          src="/images/search/search-family-playground.png"
          alt="Crianças brincando no playground enquanto os responsáveis conversam à mesa, num restaurante ao ar livre"
          fill
          priority
          sizes="(min-width: 1024px) 1024px, (min-width: 768px) 90vw, 100vw"
          className="object-cover"
        />
        <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={HERO_GRADIENT_STYLE} />

        <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
          <h1 className="text-2xl font-bold tracking-tight text-white drop-shadow-sm sm:text-3xl">
            Encontre o lugar ideal
          </h1>
          <p className="mt-1 max-w-sm text-sm text-white/85 sm:text-base">
            Busque experiências para toda a família e para todos os momentos.
          </p>
        </div>
      </section>
    </div>
  );
}
