import Link from "next/link";

const CHIPS = [
  { emoji: "😌", label: "Quero desacelerar" },
  { emoji: "🔥", label: "Quero sair da rotina" },
  { emoji: "❤️", label: "Quero viver algo especial" },
  { emoji: "✨", label: "Quero ser surpreendido" },
];

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background";

/**
 * Abertura visual da Home. Os chips concentram toda a inspiração emocional
 * que antes vivia num bloco "Vibes" separado logo antes do questionário —
 * aqui eles só rolam até `#match-flow` (mesma âncora de sempre), nunca
 * filtram nada sozinhos: continuam sendo convite, não uma segunda etapa de
 * escolha antes do HomeMatchFlow real.
 */
export function HomeHero() {
  return (
    <section className="relative overflow-hidden border-b border-border/60">
      <div className="relative z-10 mx-auto max-w-3xl px-4 pb-8 pt-10 text-center sm:px-6 sm:pb-16 sm:pt-20">
        <h1 className="animate-fade-up text-5xl font-extrabold leading-[0.98] tracking-tight text-foreground sm:text-6xl">
          Qual é a{" "}
          <span className="relative inline-block text-accent">
            Boa
            <span
              aria-hidden="true"
              className="animate-glow-pulse absolute -inset-x-4 -inset-y-3 -z-10 rounded-full bg-accent/30 blur-[28px]"
            />
          </span>
          <br />
          de hoje?
        </h1>
        <p className="animate-fade-up [animation-delay:120ms] mt-4 text-base text-muted sm:text-lg">
          Descubra lugares e experiências que combinam com o seu momento.
        </p>
        <p className="animate-fade-up [animation-delay:180ms] mt-2 text-sm font-medium text-accent/90 sm:text-base">
          Me conta seu momento. Eu encontro sua próxima experiência.
        </p>

        <div className="animate-fade-up [animation-delay:280ms] mt-7 flex flex-wrap items-center justify-center gap-2.5 sm:mt-8">
          {CHIPS.map((chip) => (
            <Link
              key={chip.label}
              href="#match-flow"
              className={`inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full border border-border bg-background-elevated/80 px-4 py-2 text-sm text-foreground backdrop-blur transition-all hover:-translate-y-0.5 hover:border-accent/60 hover:shadow-[0_0_24px_-10px_rgba(255,194,30,0.5)] ${focusRing}`}
            >
              <span aria-hidden="true">{chip.emoji}</span>
              {chip.label}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
