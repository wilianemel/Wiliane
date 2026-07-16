import type { MatchResult } from "@/types/discovery";
import { MAX_RESULTS } from "@/lib/match-engine";
import { ResultCard } from "./result-card";

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background";

interface ResultsProps {
  results: MatchResult[];
  onRestart: () => void;
}

export function Results({ results, onRestart }: ResultsProps) {
  const hasResults = results.length > 0;
  const isPartial = hasResults && results.length < MAX_RESULTS;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="max-w-2xl text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Estas são as três experiências com maior afinidade para hoje.
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted sm:text-base">
            Os percentuais são calculados localmente a partir das suas
            respostas e dos dados de demonstração dos estabelecimentos.
            Nenhuma informação real foi usada.
          </p>
        </div>
        <button
          type="button"
          onClick={onRestart}
          className={`inline-flex w-fit shrink-0 items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-medium text-muted transition-colors hover:border-accent hover:text-accent ${focusRing}`}
        >
          Refazer escolha
        </button>
      </div>

      {!hasResults && (
        <div className="mt-8 rounded-2xl border border-border bg-background-elevated p-8 text-center">
          <p className="text-lg font-semibold text-foreground">
            Não encontramos nenhuma experiência dentro dos critérios escolhidos.
          </p>
          <p className="mt-2 text-sm text-muted">
            Tente ampliar a distância máxima ou o orçamento e refaça sua escolha.
          </p>
          <button
            type="button"
            onClick={onRestart}
            className={`mt-6 inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground transition-transform hover:scale-[1.02] ${focusRing}`}
          >
            Refazer escolha
          </button>
        </div>
      )}

      {isPartial && (
        <p className="mt-6 rounded-xl border border-accent/40 bg-accent/5 px-4 py-3 text-sm text-muted">
          Encontramos {results.length}{" "}
          {results.length === 1 ? "experiência compatível" : "experiências compatíveis"}{" "}
          com os critérios escolhidos, não as três habituais.
        </p>
      )}

      {hasResults && (
        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
          {results.map((result, index) => (
            <ResultCard
              key={result.venue.id}
              result={result}
              position={index + 1}
              featured={index === 0}
              onRestart={onRestart}
            />
          ))}
        </div>
      )}
    </div>
  );
}
