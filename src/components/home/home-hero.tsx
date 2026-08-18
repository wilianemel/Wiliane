import Image from "next/image";
import Link from "next/link";

/**
 * Cada chip só rola até `#match-flow` por enquanto (ver comentário abaixo)
 * — `intentAnswers` documenta qual resposta parcial de DiscoveryAnswers
 * (types/discovery.ts) cada um representaria, para um pré-preenchimento
 * futuro, mas não é usado ainda em lugar nenhum.
 */
const CHIPS = [
  { emoji: "🍽️", label: "Comer bem", intentAnswers: { intention: "comemorar" } },
  { emoji: "🎸", label: "Música ao vivo", intentAnswers: { intention: "musica-ao-vivo" } },
  { emoji: "🌹", label: "Romântico", intentAnswers: { atmosphere: "romantico" } },
  { emoji: "🎉", label: "Com amigos", intentAnswers: { companion: "amigos" } },
  { emoji: "🌿", label: "Tranquilo", intentAnswers: { atmosphere: "tranquilo" } },
  { emoji: "🔥", label: "Agito", intentAnswers: { atmosphere: "animado" } },
] as const;

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background";

/**
 * Gradiente com 6 paradas explícitas (não o padrão de 3 do Tailwind) porque
 * a foto tem composição real que importa preservar: teto escuro no topo
 * (~0-30%, já favorece leitura sozinho), rostos por volta de 45-68% (nunca
 * escurecer demais aí) e comida/mesa no primeiro plano perto da base
 * (~80-100%, onde só suavizamos pra integrar com o fundo da página, sem
 * escondê-la). Forte no topo, suave no meio, forte (mas não opaco) na base.
 */
const HERO_GRADIENT_STYLE = {
  backgroundImage:
    "linear-gradient(to bottom, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.35) 26%, rgba(0,0,0,0.08) 45%, rgba(0,0,0,0.08) 68%, rgba(0,0,0,0.42) 88%, rgba(11,11,13,0.88) 100%)",
};

function ChevronDownIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" />
    </svg>
  );
}

/**
 * Abertura visual da Home: a foto real do produto (pessoas reunidas,
 * comida e drinks — ver public/images/home/home-hero-experience.png) é a
 * protagonista, ocupando a maior parte da tela no mobile, logo abaixo do
 * cabeçalho. Título, busca, chips de intenção e o CTA principal ficam
 * todos sobre a imagem, com fundo de vidro/gradiente para legibilidade —
 * não um bloco de texto separado sobre fundo liso como antes.
 *
 * Sem campo de busca aqui — a Home é a etapa de intenção/descoberta, não
 * de busca direta (ver bottom-nav.tsx, que já tem seu próprio item
 * "Buscar" levando pra /buscar; HomeSearchShortcut continua existindo,
 * só não é mais renderizado neste componente).
 *
 * Os chips continuam só um convite: rolam até `#match-flow`, nunca filtram
 * nada sozinhos.
 */
export function HomeHero() {
  return (
    <section className="relative h-[76dvh] min-h-[560px] w-full overflow-hidden sm:h-[560px] lg:h-[640px]">
      <Image
        src="/images/home/home-hero-experience.png"
        alt="Grupo de amigos sorrindo à mesa de um bar, com drinks e petiscos à frente"
        fill
        priority
        sizes="100vw"
        className="object-cover"
      />

      <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={HERO_GRADIENT_STYLE} />

      <div className="relative z-10 flex h-full flex-col">
        <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 pt-6 sm:px-6 sm:pt-10">
          <h1 className="animate-fade-up text-4xl font-extrabold leading-[0.98] tracking-tight text-white drop-shadow-sm sm:text-6xl">
            Qual é a{" "}
            <span className="relative inline-block text-accent">
              sua boa
              <span
                aria-hidden="true"
                className="animate-glow-pulse absolute -inset-x-4 -inset-y-3 -z-10 rounded-full bg-accent/30 blur-[28px]"
              />
            </span>
            <br />
            hoje?
          </h1>
          <p className="animate-fade-up [animation-delay:120ms] mt-3 max-w-xs text-base text-white/85 sm:max-w-none sm:text-lg">
            Bares, sabores e momentos que combinam com você.
          </p>

          <div className="flex-1" aria-hidden="true" />

          <div className="animate-fade-up [animation-delay:220ms] flex flex-col gap-4 pb-5 sm:pb-7">
            <div className="-mx-4 flex gap-2.5 overflow-x-auto px-4 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] snap-x snap-mandatory [&::-webkit-scrollbar]:hidden sm:mx-0 sm:px-0">
              {CHIPS.map((chip) => (
                <Link
                  key={chip.label}
                  href="#match-flow"
                  className={`inline-flex shrink-0 snap-start items-center gap-2 whitespace-nowrap rounded-full border border-white/20 bg-black/45 px-4 py-2.5 text-sm font-medium text-white backdrop-blur-md transition-all active:scale-95 hover:border-accent/60 hover:bg-black/60 ${focusRing}`}
                >
                  <span aria-hidden="true">{chip.emoji}</span>
                  {chip.label}
                </Link>
              ))}
            </div>

            <Link
              href="#match-flow"
              className={`inline-flex items-center justify-center gap-2 rounded-full bg-accent px-6 py-3.5 text-sm font-semibold text-accent-foreground transition-transform hover:scale-[1.02] active:scale-[0.98] ${focusRing}`}
            >
              Encontrar minha boa
            </Link>
          </div>
        </div>

        <div
          aria-hidden="true"
          className="animate-bounce-soft mx-auto mb-3 flex h-6 w-6 items-center justify-center text-white/70 sm:mb-4"
        >
          <ChevronDownIcon />
        </div>
      </div>
    </section>
  );
}
