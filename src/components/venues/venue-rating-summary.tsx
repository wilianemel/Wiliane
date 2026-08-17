"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface RatingSummary {
  average: number | null;
  count: number;
}

const EMPTY_SUMMARY: RatingSummary = { average: null, count: 0 };

/**
 * Busca o resumo de avaliações (média + contagem) uma única vez por
 * venueId. Extraído para hook porque o perfil público (venue-profile.tsx)
 * renderiza o resumo em dois lugares (compacto no topo, completo em
 * "Avaliações") — sem isso, cada <VenueRatingSummary> disparava seu próprio
 * fetch e a mesma consulta ao Supabase rodava duas vezes por carregamento.
 * Calcula a média no cliente a partir das notas publicadas — sem função
 * nova no banco, já que a leitura já é pública (mesma policy de SELECT de
 * reviews). Se a tabela `reviews` ainda não existir (028 não aplicada) ou a
 * consulta falhar por qualquer motivo, cai silenciosamente no estado "sem
 * avaliações" em vez de quebrar o perfil do estabelecimento.
 */
export function useVenueRatingSummary(venueId: string): RatingSummary | null {
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

  return summary;
}

/**
 * Resumo público de avaliações (estrelas + média + contagem) — puramente
 * apresentacional. Recebe o resumo já calculado via useVenueRatingSummary
 * em vez de buscar sozinho, para que os dois pontos do perfil onde ele
 * aparece (resumo compacto do topo e seção "Avaliações") compartilhem a
 * mesma consulta em vez de duplicá-la.
 *
 * `variant="compact"`: pensado pra caber na faixa de resumo de decisão do
 * topo do perfil — sem a frase "ainda não possui avaliações" (não renderiza
 * nada até existir uma nota real), só "★ 4.8 (12)". `variant="default"`
 * (padrão) preserva exatamente o comportamento/visual que já existia, usado
 * na seção "Avaliações".
 */
export function VenueRatingSummary({
  summary,
  variant = "default",
}: {
  summary: RatingSummary | null;
  variant?: "default" | "compact";
}) {
  if (!summary) return null;

  if (summary.count === 0 || summary.average === null) {
    if (variant === "compact") return null;
    return <p className="text-sm text-muted">Este lugar ainda não possui avaliações.</p>;
  }

  const roundedStars = Math.round(summary.average);

  if (variant === "compact") {
    return (
      <span className="inline-flex items-center gap-1">
        <span className="text-accent" aria-hidden="true">
          ★
        </span>
        <span className="font-medium text-foreground">{summary.average.toFixed(1)}</span>
        <span className="text-muted">({summary.count})</span>
      </span>
    );
  }

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
