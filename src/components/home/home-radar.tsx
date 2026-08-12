const RADAR_HIGHLIGHTS = [
  { emoji: "☀️", label: "Lugares abertos combinam com hoje" },
  { emoji: "🎸", label: "Música ao vivo em destaque" },
  { emoji: "🍷", label: "Experiências gastronômicas" },
  { emoji: "🔥", label: "Lugares mais procurados" },
];

/**
 * MVP visual do "Radar Qual é a Boa" — sem integração externa, sem IA, sem
 * dado em tempo real ainda. Prepara só o espaço/design para uma futura
 * inteligência (Mostarda); por isso o selo "Curadoria" e o aviso abaixo dos
 * cards ficam sempre visíveis, para não parecer um dado real que o produto
 * ainda não tem — só num tom de decisão de produto, não de "isso ainda não
 * funciona".
 */
export function HomeRadar() {
  return (
    <section className="border-b border-border/60">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-3xl">
            Hoje na sua cidade
          </h2>
          <span className="rounded-full border border-accent/40 bg-accent/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent">
            Curadoria
          </span>
        </div>
        <p className="mt-1 text-sm text-muted sm:text-base">
          Descubra o que está acontecendo perto de você.
        </p>

        <div className="animate-fade-up mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {RADAR_HIGHLIGHTS.map((item) => (
            <div
              key={item.label}
              className="flex flex-col items-start gap-2 rounded-2xl border border-border bg-background-elevated px-4 py-4 sm:flex-row sm:items-center sm:gap-3"
            >
              <span className="text-2xl" aria-hidden="true">
                {item.emoji}
              </span>
              <span className="line-clamp-2 text-sm font-medium text-foreground">{item.label}</span>
            </div>
          ))}
        </div>

        <p className="mt-4 text-xs text-muted">
          Curadoria da nossa equipe — em breve, atualizado em tempo real.
        </p>
      </div>
    </section>
  );
}
