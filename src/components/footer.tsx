import { BrandLogo } from "@/components/shared/brand-logo";

const institutionalLinks = [
  { label: "Sobre", href: "/sobre" },
  { label: "Termos de uso", href: "/termos-de-uso" },
  { label: "Privacidade", href: "/privacidade" },
  { label: "Ajuda", href: "/ajuda" },
];

export function Footer() {
  return (
    <footer className="border-t border-border/60">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="flex flex-col gap-6 sm:flex-row sm:justify-between sm:gap-8">
          <div className="max-w-sm">
            <BrandLogo variant="dark" size="small" />
            <p className="mt-3 text-sm text-muted">
              Uma plataforma inteligente de descoberta de experiências.
              Menos tempo procurando, mais tempo vivendo.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:items-end">
            <nav aria-label="Links institucionais" className="flex flex-wrap gap-x-4 gap-y-2 sm:justify-end">
              {institutionalLinks.map(({ label, href }) => (
                <a
                  key={label}
                  href={href}
                  className="text-sm text-muted underline-offset-4 transition-colors hover:text-accent hover:underline"
                >
                  {label}
                </a>
              ))}
            </nav>
            <a
              href="mailto:contato@borapraonde.app.br"
              className="text-sm text-muted transition-colors hover:text-accent"
            >
              contato@borapraonde.app.br
            </a>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-2 border-t border-border/60 pt-5 text-xs text-muted sm:mt-8 sm:flex-row sm:items-center sm:justify-between sm:pt-6">
          <span>© 2026 Bora pra onde. Todos os direitos reservados.</span>
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-border px-3 py-1 text-muted">
            Versão inicial do produto · MVP em desenvolvimento
          </span>
        </div>
      </div>
    </footer>
  );
}
