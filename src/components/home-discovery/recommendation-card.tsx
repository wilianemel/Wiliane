import Link from "next/link";
import type { RecommendationCard as RecommendationCardData } from "@/lib/home-discovery/types";
import { registerUserInteraction } from "@/lib/home-discovery/register-interaction";

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background";

interface RecommendationCardProps {
  card: RecommendationCardData;
  featured?: boolean;
}

export function RecommendationCard({ card, featured = false }: RecommendationCardProps) {
  // Todo campo além de venue_id/venue_name/match_score pode vir nulo do
  // banco — nunca assumimos presença.
  const highlights = card.highlights ?? [];
  const cuisine = card.cuisine ?? [];
  const score = Math.round(card.match_score ?? 0);

  return (
    <article
      className={`flex flex-col gap-4 rounded-2xl border p-6 transition-colors sm:p-7 ${
        featured
          ? "border-accent bg-background-elevated shadow-[0_0_45px_-18px_rgba(255,194,30,0.55)]"
          : "border-border bg-background-elevated"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-xl font-semibold text-foreground sm:text-2xl">{card.venue_name}</h3>
          {card.headline && <p className="mt-1 text-sm text-muted sm:text-base">{card.headline}</p>}
          <p className="mt-2 flex flex-wrap items-center gap-x-2 text-sm text-muted">
            {cuisine.length > 0 && <span>{cuisine.join(", ")}</span>}
            {card.price_range && (
              <>
                {cuisine.length > 0 && <span aria-hidden="true">·</span>}
                <span>{card.price_range}</span>
              </>
            )}
          </p>
        </div>

        <div className="flex flex-col items-end gap-1 text-right">
          <span className="text-2xl font-bold text-accent sm:text-3xl">{score}%</span>
          <span
            title="Compatibilidade calculada a partir das suas escolhas"
            className="text-[11px] uppercase tracking-wide text-muted"
          >
            Afinidade
          </span>
        </div>
      </div>

      {highlights.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {highlights.slice(0, 6).map((highlight) => (
            <span
              key={highlight}
              className="rounded-full border border-border px-3 py-1 text-xs text-muted"
            >
              {highlight}
            </span>
          ))}
        </div>
      )}

      {card.why_recommended && (
        <div className="rounded-xl border border-border/80 bg-background p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            Por que essa recomendação
          </p>
          <p className="mt-2 text-sm text-foreground">{card.why_recommended}</p>
        </div>
      )}

      <Link
        href={`/lugares/${card.venue_id}`}
        onClick={() => {
          // Best-effort, não bloqueia a navegação.
          void registerUserInteraction(card.venue_id, "visualizou");
        }}
        className={`mt-auto inline-flex w-fit items-center gap-2 rounded-full border border-accent px-5 py-2 text-sm font-semibold text-accent transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
      >
        Ver experiência
      </Link>
    </article>
  );
}
