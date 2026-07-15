"use client";

import { useState } from "react";

const searchFilters = [
  "Cidade",
  "Nome do estabelecimento",
  "Categoria",
  "Culinária",
  "Bairro",
  "Evento",
  "Promoção",
  "Música ao vivo",
];

function ArrowIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      className="h-4 w-4"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="6.5" />
      <path strokeLinecap="round" d="m20 20-3.2-3.2" />
    </svg>
  );
}

export function Hero() {
  const [activeFilters, setActiveFilters] = useState<string[]>([]);

  function toggleFilter(filter: string) {
    setActiveFilters((current) =>
      current.includes(filter)
        ? current.filter((item) => item !== filter)
        : [...current, filter],
    );
  }

  return (
    <section id="hero" className="relative overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-32 left-1/2 h-96 w-[36rem] -translate-x-1/2 rounded-full bg-accent/20 blur-[120px]"
      />

      <div className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent sm:text-sm">
          Menos tempo procurando. Mais tempo vivendo.
        </p>
        <h1 className="mt-4 max-w-2xl text-3xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl">
          Como você quer viver seu tempo hoje?
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted sm:text-lg">
          Conte o que deseja, com quem vai sair e quanto pretende gastar.
          Selecionamos as experiências com maior chance de combinar com o seu
          momento.
        </p>

        <div className="mt-10 grid gap-6 md:grid-cols-2">
          <div className="flex flex-col justify-between rounded-2xl border border-border bg-background-elevated p-6 shadow-[0_0_40px_-20px_rgba(255,194,30,0.4)] sm:p-8">
            <div>
              <h2 className="text-xl font-semibold text-foreground sm:text-2xl">
                Não sabe por onde começar?
              </h2>
              <p className="mt-2 text-sm text-muted sm:text-base">
                Responda algumas perguntas e receba três recomendações
                personalizadas.
              </p>
            </div>
            <a
              href="#intencoes"
              className="mt-6 inline-flex w-fit items-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground transition-transform hover:scale-[1.02]"
            >
              Me ajude a escolher
              <ArrowIcon />
            </a>
          </div>

          <div
            id="busca"
            className="scroll-mt-24 rounded-2xl border border-border bg-background-elevated p-6 sm:p-8"
          >
            <h2 className="text-xl font-semibold text-foreground sm:text-2xl">
              Já sabe o que procura?
            </h2>

            <form
              onSubmit={(event) => event.preventDefault()}
              className="mt-4 flex flex-col gap-3 sm:flex-row"
            >
              <label htmlFor="search-input" className="sr-only">
                Buscar experiência
              </label>
              <div className="flex flex-1 items-center gap-2 rounded-full border border-border bg-background px-4 py-3">
                <SearchIcon />
                <input
                  id="search-input"
                  type="text"
                  placeholder="Busque por restaurante, bar, comida, evento ou lugar..."
                  className="w-full bg-transparent text-sm text-foreground placeholder:text-muted focus:outline-none"
                />
              </div>
              <button
                type="submit"
                className="rounded-full bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground transition-transform hover:scale-[1.02]"
              >
                Buscar
              </button>
            </form>

            <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Filtros de busca">
              {searchFilters.map((filter) => {
                const isActive = activeFilters.includes(filter);
                return (
                  <button
                    key={filter}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => toggleFilter(filter)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                      isActive
                        ? "border-accent bg-accent text-accent-foreground"
                        : "border-border text-muted hover:border-accent/60 hover:text-accent"
                    }`}
                  >
                    {filter}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
