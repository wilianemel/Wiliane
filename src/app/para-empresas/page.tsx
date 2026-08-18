import type { Metadata } from "next";
import Link from "next/link";
import { BrandLogo } from "@/components/shared/brand-logo";

export const metadata: Metadata = {
  title: "Para empresas — Qual é a Boa!",
  description:
    "Cadastre seu estabelecimento no Qual é a Boa e seja encontrado por pessoas que procuram exatamente o que você oferece.",
};

const BENEFITS = [
  "Crie um perfil completo que apresenta sua experiência",
  "Mostre seu espaço com fotos e vídeos reais",
  "Informe seus diferenciais, cardápio e valores",
  "Facilite reservas e contato direto",
  "Seja encontrado pelas pessoas certas",
  "Tenha controle do seu estabelecimento",
];

function ArrowLeftIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 12H5M11 18l-6-6 6-6" />
    </svg>
  );
}

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

export default function ParaEmpresasPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-border/60 bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-2 sm:px-6">
          <Link href="/" aria-label="Qual é a Boa — página inicial">
            <BrandLogo variant="dark" size="medium" priority />
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-medium text-muted transition-colors hover:border-accent hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <ArrowLeftIcon />
            Voltar para a Home
          </Link>
        </div>
      </header>

      <main className="flex-1">
        <section className="relative overflow-hidden">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-32 left-1/2 h-96 w-[36rem] -translate-x-1/2 rounded-full bg-accent/20 blur-[120px]"
          />
          <div className="relative mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-24">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent sm:text-sm">
              Para estabelecimentos
            </p>
            <h1 className="mt-4 text-3xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl">
              Coloque seu estabelecimento no Qual é a Boa
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted sm:text-lg">
              Cadastre sua empresa, apresente suas experiências e seja encontrado por
              pessoas que estão procurando exatamente o que você oferece.
            </p>

            <ul className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {BENEFITS.map((benefit) => (
                <li key={benefit}>
                  <Link
                    href="/empresa/painel"
                    className="flex cursor-pointer items-center gap-2 rounded-xl border border-border bg-background-elevated px-4 py-3 text-sm text-foreground transition-colors hover:border-accent hover:bg-accent/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  >
                    <span className="text-accent">
                      <CheckIcon />
                    </span>
                    {benefit}
                  </Link>
                </li>
              ))}
            </ul>

            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/empresa/cadastro?fluxo=novo"
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground transition-transform hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:flex-none"
              >
                Cadastrar uma nova empresa
              </Link>
              <Link
                href="/empresa/cadastro?fluxo=existente"
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-border px-6 py-3 text-sm font-semibold text-foreground transition-colors hover:border-accent hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:flex-none"
              >
                Minha empresa já está cadastrada
              </Link>
            </div>
            <p className="mt-3 max-w-2xl text-sm text-muted">
              O Qual é a Boa já pode ter criado a página do seu estabelecimento. Crie seu
              acesso, encontre sua empresa e solicite o gerenciamento para completar o
              perfil e enviar suas mídias.
            </p>
            <Link
              href="/empresa/entrar"
              className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-muted underline-offset-4 transition-colors hover:text-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded"
            >
              Já tenho uma conta empresarial
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
