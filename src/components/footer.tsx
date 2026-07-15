const institutionalLinks = ["Sobre", "Termos de uso", "Privacidade", "Ajuda"];

export function Footer() {
  return (
    <footer className="border-t border-border/60">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="flex flex-col gap-8 sm:flex-row sm:justify-between">
          <div className="max-w-sm">
            <span className="text-lg font-bold tracking-tight text-foreground">
              Qual é a Boa<span className="text-accent">!</span>
            </span>
            <p className="mt-2 text-sm text-muted">
              Uma plataforma inteligente de descoberta de experiências.
              Menos tempo procurando, mais tempo vivendo.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:items-end">
            <nav aria-label="Links institucionais" className="flex flex-wrap gap-x-4 gap-y-2 sm:justify-end">
              {institutionalLinks.map((label) => (
                <button
                  key={label}
                  type="button"
                  title="Página em construção"
                  className="text-sm text-muted underline-offset-4 transition-colors hover:text-accent hover:underline"
                >
                  {label}
                </button>
              ))}
            </nav>
            <a
              href="mailto:contato@qualeaboa.com.br"
              className="text-sm text-muted transition-colors hover:text-accent"
            >
              contato@qualeaboa.com.br
            </a>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-2 border-t border-border/60 pt-6 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
          <span>© 2026 Qual é a Boa. Todos os direitos reservados.</span>
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-border px-3 py-1 text-muted">
            Versão inicial do produto · MVP em desenvolvimento
          </span>
        </div>
      </div>
    </footer>
  );
}
