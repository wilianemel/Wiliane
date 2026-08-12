import Link from "next/link";
import { BrandLogo } from "@/components/shared/brand-logo";

const highlights = [
  "Visualizações do seu perfil",
  "Solicitações de rota",
  "Contatos recebidos",
];

export function BusinessCta() {
  return (
    <section id="empresas" className="scroll-mt-20 border-t border-border/60">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="relative overflow-hidden rounded-2xl border border-accent/40 bg-background-elevated p-8 sm:p-12">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-accent/15 blur-[100px]"
          />

          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-xl">
              <BrandLogo variant="yellow" size="large" className="mb-5" />
              <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                Seu estabelecimento para as pessoas certas.
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-muted sm:text-base">
                Apresente sua experiência, divulgue sua programação e
                acompanhe quantas pessoas visualizaram seu perfil,
                solicitaram rota ou entraram em contato.
              </p>

              <ul className="mt-5 flex flex-wrap gap-3">
                {highlights.map((item) => (
                  <li
                    key={item}
                    className="rounded-full border border-border px-3 py-1.5 text-xs text-muted sm:text-sm"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex flex-col items-start gap-2 lg:items-end">
              <Link
                href="/empresa/cadastro"
                className="rounded-full bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground transition-all hover:scale-[1.02] hover:shadow-[0_0_28px_-8px_rgba(255,194,30,0.55)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:text-base"
              >
                Cadastrar meu estabelecimento
              </Link>
              <span className="text-xs text-muted">
                Cadastro gratuito e rápido.
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
