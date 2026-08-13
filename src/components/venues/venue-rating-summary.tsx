"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface RatingSummary {
  average: number | null;
  count: number;
}

const EMPTY_SUMMARY: RatingSummary = { average: null, count: 0 };

/**
 * Resumo público de avaliações (estrelas + média + contagem). Calcula a
 * média no cliente a partir das notas publicadas — sem função nova no
 * banco, já que a leitura já é pública (mesma policy de SELECT de
 * reviews). Se a tabela `reviews` ainda não existir (028 não aplicada) ou
 * a consulta falhar por qualquer motivo, cai silenciosamente no estado
 * "sem avaliações" em vez de quebrar o perfil do estabelecimento.
 */
export function VenueRatingSummary({ venueId }: { venueId: string }) {
  const [summary, setSummary] = useState<RatingSummary | null>(() =>
    venueId ? null : EMPTY_SUMMARY,
  );

  useEffect(() => {
    if (!venueId) return;

    let active = true;
    const supabase = createClient();

    supabase
      .from("reviews")
      .select("rating")
      .eq("venue_id", venueId)
      .eq("status", "published")
      .then(({ data, error }) => {
        if (!active) return;
        if (error || !data || data.length === 0) {
          setSummary(EMPTY_SUMMARY);
          return;
        }
        const ratings = data as { rating: number }[];
        const average = ratings.reduce((sum, row) => sum + row.rating, 0) / ratings.length;
        setSummary({ average, count: ratings.length });
      });

    return () => {
      active = false;
    };
  }, [venueId]);

  if (!summary) return null;

  if (summary.count === 0 || summary.average === null) {
    return <p className="text-sm text-muted">Este lugar ainda não possui avaliações.</p>;
  }

  const roundedStars = Math.round(summary.average);

  return (
    <div className="flex items-center gap-2">
      <span className="text-accent" aria-hidden="true">
        {"★".repeat(roundedStars)}
        {"☆".repeat(5 - roundedStars)}
      </span>
      <span className="text-sm font-semibold text-foreground">{summary.average.toFixed(1)}</span>
      <span className="text-sm text-muted">
        {summary.count} {summary.count === 1 ? "avaliação" : "avaliações"}
      </span>
    </div>
  );
}
