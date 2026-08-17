const INSTAGRAM_URL = "https://www.instagram.com/qualeaboa.brasil/";
const INSTAGRAM_HANDLE = "@qualeaboa.brasil";

function InstagramIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      className="h-5 w-5"
      aria-hidden="true"
    >
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.3" cy="6.7" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

/**
 * CTA discreto para o Instagram oficial (@qualeaboa.brasil), perto do fim da
 * Home, antes do Footer. Não é o site institucional (que ainda não existe) —
 * só a rede social, sem prometer nada além disso.
 */
export function InstagramFollow() {
  return (
    <section className="border-t border-border/60">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="flex flex-col items-start gap-4 rounded-2xl border border-accent/20 bg-background-elevated px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-accent/30 bg-accent/10 text-accent">
              <InstagramIcon />
            </span>
            <div>
              <p className="text-sm font-semibold text-foreground">
                Siga o Qual é a Boa no Instagram
              </p>
              <p className="text-sm text-muted">{INSTAGRAM_HANDLE}</p>
            </div>
          </div>
          <a
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-accent px-5 py-2.5 text-sm font-semibold text-accent transition-all hover:bg-accent hover:text-accent-foreground sm:w-auto"
          >
            Seguir
          </a>
        </div>
      </div>
    </section>
  );
}
