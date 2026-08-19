"use client";

import { useEffect, useState } from "react";
import { getVenueDiagnosticStats, type VenueDiagnosticStats } from "@/lib/venues/venue-dashboard";

const REPORT_PERIOD_DAYS = 30;
/** Abaixo disso, o relatório mostra a mensagem honesta de "faltam dados" em vez de números soltos pouco úteis. */
const MIN_VIEWS_FOR_REPORT = 5;
/** Mesmo limiar de "visualizações altas"/"muitos visitantes" já usado no resumo simples do dashboard (metricSectionsFromStats/diagnosticInsights). */
const HIGH_ACTIVITY_THRESHOLD = 50;

interface DiagnosticMetric {
  key: string;
  label: string;
  value: string;
  description: string;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("pt-BR");
}

function formatPercent(numerator: number, denominator: number): string {
  if (denominator === 0) return "—";
  return `${((numerator / denominator) * 100).toFixed(1).replace(".", ",")}%`;
}

function diagnosticMetrics(stats: VenueDiagnosticStats): DiagnosticMetric[] {
  return [
    { key: "views", label: "Visualizações do perfil", value: String(stats.views), description: "Vezes que seu perfil foi visualizado." },
    { key: "uniqueVisitors", label: "Visitantes únicos", value: String(stats.uniqueVisitors), description: "Pessoas diferentes que visualizaram." },
    { key: "favorites", label: "Favoritos", value: String(stats.favorites), description: "Pessoas que salvaram seu estabelecimento." },
    { key: "whatsappClicks", label: "Cliques no WhatsApp", value: String(stats.whatsappClicks), description: "Cliques para iniciar uma conversa." },
    { key: "websiteClicks", label: "Cliques no site", value: String(stats.websiteClicks), description: "Cliques para visitar seu site." },
    { key: "reservationClicks", label: "Cliques em reservas", value: String(stats.reservationClicks), description: "Cliques para fazer uma reserva." },
    { key: "routeClicks", label: "Cliques para rota", value: String(stats.routeClicks), description: "Pessoas que abriram o caminho até você." },
    { key: "recommendationCount", label: "Recomendações", value: String(stats.recommendationCount), description: "Vezes que você apareceu numa recomendação." },
    {
      key: "conversionRate",
      label: "Conversão em contato",
      value: formatPercent(stats.whatsappClicks, stats.views),
      description: "Visualizações que viraram clique no WhatsApp.",
    },
    { key: "likes", label: "Gostei", value: String(stats.likes), description: "Pessoas que aprovaram a recomendação." },
    { key: "dislikes", label: "Não gostei", value: String(stats.dislikes), description: "Pessoas que informaram que não combinava." },
  ];
}

/** Regras determinísticas, sem IA — só dispara com dados reais suficientes; nunca inventa métrica ou feedback. */
function diagnosticRuleInsights(stats: VenueDiagnosticStats): string[] {
  const insights: string[] = [];

  if (stats.views > HIGH_ACTIVITY_THRESHOLD && stats.favorites === 0) {
    insights.push(
      "Seu estabelecimento está sendo descoberto, mas poucas pessoas estão salvando. Uma apresentação mais forte pode aumentar o interesse.",
    );
  }

  if (stats.uniqueVisitors > HIGH_ACTIVITY_THRESHOLD && stats.whatsappClicks === 0) {
    insights.push(
      "As pessoas estão conhecendo seu negócio, mas poucas estão entrando em contato. Avalie melhorar sua oferta ou chamada para ação.",
    );
  }

  return insights;
}

type LoadState = "loading" | "error" | "success";

/**
 * Exclusivo do plano Master — período fixo de 30 dias ("relatório de 30 em
 * 30 dias"). Sem IA generativa: todo texto vem de regras determinísticas
 * (diagnosticRuleInsights) sobre números reais de user_interactions/
 * recommendation_history via get_venue_diagnostic_stats. Não envia e-mail —
 * só exibe o relatório atual nesta tela.
 */
export function VenueDiagnostic({ venueId }: { venueId: string }) {
  const [state, setState] = useState<LoadState>("loading");
  const [stats, setStats] = useState<VenueDiagnosticStats | null>(null);
  const [periodEnd] = useState(() => new Date());
  const [periodStart] = useState(() => {
    const start = new Date();
    start.setDate(start.getDate() - REPORT_PERIOD_DAYS);
    return start;
  });

  useEffect(() => {
    let active = true;
    getVenueDiagnosticStats(venueId, periodStart).then((result) => {
      if (!active) return;
      if (!result) {
        setState("error");
        return;
      }
      setStats(result);
      setState("success");
    });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [venueId]);

  const hasEnoughData = stats !== null && stats.views >= MIN_VIEWS_FOR_REPORT;
  const insights = stats ? diagnosticRuleInsights(stats) : [];

  return (
    <section className="mt-8 rounded-2xl border border-border bg-background-elevated p-6">
      <h2 className="text-sm font-semibold text-foreground">Diagnóstico do estabelecimento</h2>
      <p className="mt-1 text-xs text-muted">
        Período analisado: {formatDate(periodStart)} a {formatDate(periodEnd)}
      </p>

      {state === "loading" && (
        <div className="mt-6 flex items-center justify-center py-10">
          <div
            aria-hidden="true"
            className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-accent"
          />
        </div>
      )}

      {state === "error" && (
        <p className="mt-4 text-sm text-red-300">
          Não foi possível carregar o diagnóstico agora. Tente novamente mais tarde.
        </p>
      )}

      {state === "success" && stats && !hasEnoughData && (
        <p className="mt-4 text-sm text-muted">
          Ainda faltam dados destes últimos 30 dias para gerar um diagnóstico confiável. Volte
          quando seu estabelecimento tiver mais visualizações.
        </p>
      )}

      {state === "success" && stats && hasEnoughData && (
        <>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {diagnosticMetrics(stats).map((metric) => (
              <div key={metric.key} className="rounded-xl border border-border p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                  {metric.label}
                </p>
                <p className="mt-1 text-2xl font-bold text-foreground">{metric.value}</p>
                <p className="mt-0.5 text-xs text-muted">{metric.description}</p>
              </div>
            ))}
          </div>

          <div className="mt-6">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">Insights</h3>
            <ul className="mt-2 flex flex-col gap-2">
              {insights.length > 0 ? (
                insights.map((insight) => (
                  <li key={insight} className="flex items-start gap-2 text-sm text-foreground">
                    <span aria-hidden="true" className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-accent" />
                    {insight}
                  </li>
                ))
              ) : (
                <li className="text-sm text-muted">
                  Ainda não há dados suficientes para gerar um insight neste período.
                </li>
              )}
            </ul>
          </div>
        </>
      )}
    </section>
  );
}
