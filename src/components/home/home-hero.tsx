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
 * Abertura visual da Home. Os chips concentram toda a inspiração emocional
 * que antes vivia num bloco "Vibes" separado logo antes do questionário —
 * aqui eles só rolam até `#match-flow` (mesma âncora de sempre), nunca
 * filtram nada sozinhos: continuam sendo convite, não uma segunda etapa de
 * escolha antes do HomeMatchFlow real.
 *
 * Pré-preenchimento (NÃO implementado nesta etapa, de propósito): cada chip
 * já documenta em `intentAnswers` qual resposta parcial de DiscoveryAnswers
 * ele representaria. Para ativar de verdade, HomeMatchFlow precisaria expor
 * um jeito de iniciar `answers`/`stepIndex` a partir de uma resposta já
 * dada (hoje ele sempre começa do zero) — mudança em HomeMatchFlow, fora do
 * escopo desta etapa (só UX do Hero).
 */
export function HomeHero() {
  return (
    <section className="relative overflow-hidden border-b border-border/60">
      <div className="relative z-10 mx-auto max-w-3xl px-4 pb-8 pt-10 text-center sm:px-6 sm:pb-16 sm:pt-20">
        <h1 className="animate-fade-up text-5xl font-extrabold leading-[0.98] tracking-tight text-foreground sm:text-6xl">
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
        <p className="animate-fade-up [animation-delay:120ms] mt-4 text-base text-muted sm:text-lg">
          Me conta o clima. A gente encontra a experiência.
        </p>

        <div className="animate-fade-up [animation-delay:280ms] mt-7 flex flex-wrap items-center justify-center gap-2.5 sm:mt-8">
          {CHIPS.map((chip) => (
            <Link
              key={chip.label}
              href="#match-flow"
              className={`inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full border border-border bg-background-elevated/80 px-4 py-2.5 text-sm font-medium text-foreground backdrop-blur transition-all hover:-translate-y-0.5 hover:border-accent/60 hover:shadow-[0_0_24px_-10px_rgba(255,194,30,0.5)] ${focusRing}`}
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
