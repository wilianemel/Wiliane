const criteria = [
  "Momento",
  "Companhia",
  "Orçamento",
  "Distância",
  "Ambiente",
  "Programação",
  "Atualidade das informações",
];

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      className="h-4 w-4 shrink-0"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="8.5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="m8.5 12.2 2.4 2.4 4.6-5" />
    </svg>
  );
}

export function TrustSection() {
  return (
    <section id="confianca" className="scroll-mt-20 border-t border-border/60">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <h2 className="max-w-3xl text-2xl font-bold leading-snug tracking-tight text-foreground sm:text-3xl">
          Não mostramos dezenas de opções. Selecionamos as que realmente fazem
          sentido.
        </h2>
        <p className="mt-3 max-w-2xl text-sm text-muted sm:text-base">
          Para isso, a plataforma considera:
        </p>

        <ul className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {criteria.map((item) => (
            <li
              key={item}
              className="flex items-center gap-2 rounded-xl border border-border bg-background-elevated px-4 py-3 text-sm text-foreground"
            >
              <span className="text-accent">
                <CheckIcon />
              </span>
              {item}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
