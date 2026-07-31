import type { RecommendationCard as RecommendationCardData } from "@/lib/home-discovery/types";
import { RecommendationCard } from "./recommendation-card";

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background";

interface RecommendationResultsProps {
  results: RecommendationCardData[];
  onRestart: () => void;
}

export function RecommendationResults({ results, onRestart }: RecommendationResultsProps) {
  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Experiências com maior afinidade para o seu momento
          </h2>
          <p className="mt-2 text-sm text-muted sm:text-base">
            Recomendações calculadas a partir das suas escolhas, com dados reais dos
            estabelecimentos.
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

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {results.map((card, index) => (
          <RecommendationCard key={card.venue_id} card={card} featured={index === 0} />
        ))}
      </div>
    </div>
  );
}
