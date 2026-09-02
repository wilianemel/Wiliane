"use client";

import { Fragment, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { VenueAccessGate } from "@/components/empresa/venue-access-gate";
import { MostardaCard } from "@/components/empresa/mostarda-card";
import type { VenueOwnerRow } from "@/lib/venues/venue-owner";
import { getVenueDashboardStats, type VenueDashboardStats } from "@/lib/venues/venue-dashboard";
import { getVenueEffectiveLimits, type VenueEffectiveLimits } from "@/lib/venues/venue-media";
import { UpgradeToBasicoCta } from "@/components/empresa/upgrade-to-basico-cta";
import { VenueDiagnostic } from "@/components/empresa/venue-diagnostic";

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background";

interface PeriodOption {
  label: string;
  days: number;
}

const PERIOD_OPTIONS: PeriodOption[] = [
  { label: "Últimos 7 dias", days: 7 },
  { label: "Últimos 30 dias", days: 30 },
  { label: "Últimos 90 dias", days: 90 },
];

const DEFAULT_PERIOD_DAYS = 30;

interface MetricCard {
  key: string;
  label: string;
  value: number;
  description: string;
}

interface MetricSection {
  title: string;
  metrics: MetricCard[];
}

function metricSectionsFromStats(stats: VenueDashboardStats): MetricSection[] {
  return [
    {
      title: "Alcance",
      metrics: [
        {
          key: "views",
          label: "Visualizações",
          value: stats.views,
          description: "Quantidade de vezes que seu estabelecimento foi visualizado.",
        },
        {
          key: "uniqueVisitors",
          label: "Visitantes únicos",
          value: stats.uniqueVisitors,
          description: "Pessoas diferentes que visualizaram seu estabelecimento.",
        },
      ],
    },
    {
      title: "Interesse",
      metrics: [
        {
          key: "favorites",
          label: "Favoritos",
          value: stats.favorites,
          description: "Pessoas que salvaram seu estabelecimento.",
        },
        {
          key: "likes",
          label: "Gostei",
          value: stats.likes,
          description: "Pessoas que aprovaram a recomendação do seu estabelecimento.",
        },
        {
          key: "dislikes",
          label: "Não gostei",
          value: stats.dislikes,
          description: "Pessoas que informaram que essa experiência não combinava com elas.",
        },
      ],
    },
    {
      title: "Intenção de visita",
      metrics: [
        {
          key: "whatsappClicks",
          label: "WhatsApp",
          value: stats.whatsappClicks,
          description: "Cliques para iniciar uma conversa.",
        },
        {
          key: "routeClicks",
          label: "Rotas abertas",
          value: stats.routeClicks,
          description: "Pessoas que abriram o caminho até seu estabelecimento.",
        },
      ],
    },
  ];
}

/** Frases simples, geradas por regra — nenhuma IA envolvida. */
function summarySentences(stats: VenueDashboardStats): string[] {
  const sentences: string[] = [];

  if (stats.views > 0) {
    sentences.push(`Seu estabelecimento foi descoberto por ${stats.views} pessoas.`);
  }
  if (stats.routeClicks > 0) {
    sentences.push(`${stats.routeClicks} pessoas demonstraram intenção de visitar.`);
  }
  if (stats.whatsappClicks > 0) {
    sentences.push(`${stats.whatsappClicks} pessoas quiseram entrar em contato.`);
  }

  return sentences;
}

interface FunnelStep {
  label: string;
  value: number;
}

function funnelSteps(stats: VenueDashboardStats): FunnelStep[] {
  return [
    { label: "Visualizações", value: stats.views },
    { label: "Favoritos", value: stats.favorites },
    { label: "WhatsApp", value: stats.whatsappClicks },
    { label: "Rotas", value: stats.routeClicks },
  ];
}

/** Regras simples, geradas por comparação direta — nenhuma IA envolvida. */
function diagnosticInsights(stats: VenueDashboardStats): string[] {
  const insights: string[] = [];

  if (stats.views > 0) {
    insights.push(
      `Seu estabelecimento foi descoberto por ${stats.views} visualizações no período analisado.`,
    );
  }
  if (stats.uniqueVisitors > 0) {
    insights.push(`${stats.uniqueVisitors} pessoas diferentes conheceram seu estabelecimento.`);
  }
  if (stats.favorites > 0) {
    insights.push(`${stats.favorites} pessoas salvaram seu estabelecimento nos favoritos.`);
  }
  if (stats.whatsappClicks > 0) {
    insights.push(`${stats.whatsappClicks} pessoas demonstraram interesse entrando em contato.`);
  }
  if (stats.routeClicks > 0) {
    insights.push(`${stats.routeClicks} pessoas abriram a rota para chegar até você.`);
  }
  if (stats.views > 50 && stats.favorites === 0) {
    insights.push(
      "Seu estabelecimento está recebendo atenção, mas ainda pode aumentar o interesse das pessoas.",
    );
  }
  if (stats.routeClicks > 0) {
    insights.push("As pessoas estão demonstrando intenção real de visitar seu estabelecimento.");
  }
  if (stats.whatsappClicks > 0) {
    insights.push("Existe interesse comercial acontecendo através do WhatsApp.");
  }

  return insights;
}

function SparkleIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 3v3M12 18v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M3 12h3M18 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"
      />
    </svg>
  );
}

const PLAN_LABELS: Record<string, string> = {
  free: "Free",
  partner: "Partner",
  basico: "Plano Essencial",
  master: "Plano Master",
};

function formatLastUpdated(date: Date): string {
  const formattedDate = date.toLocaleDateString("pt-BR");
  const formattedTime = date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  return `Dados atualizados em ${formattedDate} às ${formattedTime}`;
}

interface UpsellPlan {
  title: string;
  price: string;
  features: string[];
  ctaLabel: string;
}

const UPSELL_PLANS: UpsellPlan[] = [
  {
    title: "Plano Essencial",
    price: "R$ 97,00/mês",
    features: ["3 vídeos", "4 fotos"],
    ctaLabel: "Quero o Plano Essencial",
  },
  {
    title: "Plano Master",
    price: "R$ 187,00/mês",
    features: ["5 vídeos", "6 fotos", "Diagnóstico mensal"],
    ctaLabel: "Quero o Plano Master",
  },
];

/**
 * Upsell mostrado para quem está no Free ou no Partner (planos sem os
 * limites de vídeo/foto do Essencial/Master) — contratação continua sendo
 * sempre humana (WhatsApp), nunca automática: nenhum botão aqui chama RPC
 * nenhuma, só abre o link. Copy fixa (sem IA), pedida explicitamente.
 */
function PlanUpsellSection() {
  return (
    <section className="mt-8 rounded-2xl border border-accent/30 bg-accent/5 p-6">
      <h2 className="text-base font-semibold text-foreground">
        Quer aparecer mais e receber mais contatos?
      </h2>
      <p className="mt-2 text-sm text-muted">
        Faça upgrade e tenha mais vídeos, mais fotos e mais oportunidades de ser recomendado.
      </p>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {UPSELL_PLANS.map((plan) => (
          <div key={plan.title} className="rounded-2xl border border-border bg-background-elevated p-4">
            <p className="text-sm font-semibold text-foreground">{plan.title}</p>
            <p className="mt-0.5 text-xs font-semibold text-accent">{plan.price}</p>
            <ul className="mt-3 flex flex-col gap-1.5">
              {plan.features.map((feature) => (
                <li key={feature} className="text-xs text-muted">
                  {feature}
                </li>
              ))}
            </ul>
            <UpgradeToBasicoCta className="mt-3" label={plan.ctaLabel} />
          </div>
        ))}
      </div>
    </section>
  );
}

function ArrowDownIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      className="h-4 w-4 sm:-rotate-90"
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12l7 7 7-7" />
    </svg>
  );
}

export default function DashboardEstabelecimentoPage() {
  const params = useParams<{ venueId: string }>();
  const venueId = params.venueId;

  return (
    <VenueAccessGate venueId={venueId}>{(venue) => <DashboardContent venue={venue} />}</VenueAccessGate>
  );
}

type StatsState = "loading" | "error" | "success";

function DashboardContent({ venue }: { venue: VenueOwnerRow }) {
  const [periodDays, setPeriodDays] = useState(DEFAULT_PERIOD_DAYS);
  const [statsState, setStatsState] = useState<StatsState>("loading");
  const [stats, setStats] = useState<VenueDashboardStats | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [planLimits, setPlanLimits] = useState<VenueEffectiveLimits | null>(null);

  useEffect(() => {
    let active = true;
    getVenueEffectiveLimits(venue.id).then((limits) => {
      if (active) setPlanLimits(limits);
    });
    return () => {
      active = false;
    };
  }, [venue.id]);

  const selectedPeriod =
    PERIOD_OPTIONS.find((option) => option.days === periodDays) ?? PERIOD_OPTIONS[1];

  useEffect(() => {
    let active = true;

    Promise.resolve().then(() => {
      if (active) setStatsState("loading");
    });

    const since = new Date();
    since.setDate(since.getDate() - periodDays);

    getVenueDashboardStats(venue.id, since).then((result) => {
      if (!active) return;
      if (!result) {
        setStatsState("error");
        return;
      }
      setStats(result);
      setStatsState("success");
      setLastUpdated(new Date());
    });

    return () => {
      active = false;
    };
  }, [venue.id, periodDays]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-accent">{venue.name}</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Desempenho do seu estabelecimento
          </h1>
          <p className="mt-2 max-w-md text-sm text-muted">
            Acompanhe como as pessoas estão descobrindo e interagindo com seu negócio.
          </p>
        </div>
        <Link
          href="/empresa/painel"
          className={`rounded-full border border-border px-4 py-2 text-sm font-medium text-muted transition-colors hover:border-accent hover:text-accent ${focusRing}`}
        >
          Voltar ao painel
        </Link>
      </div>

      {planLimits && (
        <section className="mt-6 rounded-2xl border border-border bg-background-elevated p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Seu plano</p>
          <p className="mt-1 text-sm text-foreground">
            {PLAN_LABELS[planLimits.planType] ?? planLimits.planType} — até{" "}
            {planLimits.videoLimit} vídeo{planLimits.videoLimit === 1 ? "" : "s"} e{" "}
            {planLimits.imageLimit} foto{planLimits.imageLimit === 1 ? "" : "s"} na galeria.
          </p>
          {planLimits.viewLimit !== null ? (
            <p className="mt-1 text-xs text-muted">
              {planLimits.viewCount}/{planLimits.viewLimit} visualizações — depois disso o
              estabelecimento continua publicado e pesquisável, mas para de aparecer nas
              recomendações.
            </p>
          ) : (
            <p className="mt-1 text-xs text-muted">Recomendações sem limite de visualizações.</p>
          )}
        </section>
      )}

      {(planLimits?.planType === "free" || planLimits?.planType === "partner") && (
        <PlanUpsellSection />
      )}
      {planLimits?.planType === "master" && <VenueDiagnostic venueId={venue.id} />}

      <div className="mt-8 flex flex-wrap gap-2">
        {PERIOD_OPTIONS.map((option) => (
          <button
            key={option.days}
            type="button"
            onClick={() => setPeriodDays(option.days)}
            aria-pressed={option.days === periodDays}
            className={`rounded-full border px-4 py-2 text-xs font-medium transition-colors ${focusRing} ${
              option.days === periodDays
                ? "border-accent bg-accent/10 text-accent"
                : "border-border text-muted hover:border-accent/60 hover:text-accent"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="mt-4 flex flex-col gap-0.5">
        <p className="text-xs text-muted">
          Período analisado: {selectedPeriod.label.toLowerCase()}
        </p>
        <p className="text-xs text-muted">
          {lastUpdated ? formatLastUpdated(lastUpdated) : "Atualizando dados..."}
        </p>
      </div>

      {statsState === "loading" && (
        <div className="mt-8 flex items-center justify-center py-16">
          <div
            aria-hidden="true"
            className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-accent"
          />
        </div>
      )}

      {statsState === "error" && (
        <div className="mt-8 rounded-2xl border border-red-400/40 bg-red-400/5 p-6 text-center">
          <p className="text-sm text-red-300">
            Não foi possível carregar as métricas agora. Tente novamente mais tarde.
          </p>
        </div>
      )}

      {statsState === "success" && stats && (
        <>
          <div className="mt-8 flex flex-col gap-8">
            {metricSectionsFromStats(stats).map((section) => (
              <section key={section.title}>
                <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">
                  {section.title}
                </h2>
                <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
                  {section.metrics.map((metric) => (
                    <div
                      key={metric.key}
                      className="rounded-2xl border border-border bg-background-elevated p-6"
                    >
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                        {metric.label}
                      </p>
                      <p className="mt-2 text-3xl font-bold text-foreground">{metric.value}</p>
                      <p className="mt-1 text-xs text-muted">{metric.description}</p>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>

          <section className="mt-10 rounded-2xl border border-accent/30 bg-accent/5 p-6">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-accent">
              Resumo da performance
            </h2>
            <p className="mt-1 text-xs text-muted">Nos {selectedPeriod.label.toLowerCase()}</p>

            <ul className="mt-4 flex flex-col gap-2">
              {summarySentences(stats).length > 0 ? (
                summarySentences(stats).map((sentence) => (
                  <li key={sentence} className="flex items-start gap-2 text-sm text-foreground">
                    <span
                      aria-hidden="true"
                      className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-accent"
                    />
                    {sentence}
                  </li>
                ))
              ) : (
                <li className="text-sm text-muted">
                  Ainda não há atividade suficiente neste período para gerar um resumo.
                </li>
              )}
            </ul>
          </section>

          <section className="mt-10">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">
              Seu funil de interesse
            </h2>
            <div className="mt-3 flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:gap-3">
              {funnelSteps(stats).map((step, index) => (
                <Fragment key={step.label}>
                  <div className="flex-1 rounded-2xl border border-border bg-background-elevated p-5 text-center">
                    <p className="text-2xl font-bold text-accent">{step.value}</p>
                    <p className="mt-1 text-xs font-medium uppercase tracking-wide text-muted">
                      {step.label}
                    </p>
                  </div>
                  {index < funnelSteps(stats).length - 1 && (
                    <span
                      aria-hidden="true"
                      className="flex shrink-0 items-center justify-center self-center text-muted"
                    >
                      <ArrowDownIcon />
                    </span>
                  )}
                </Fragment>
              ))}
            </div>
          </section>

          <section className="mt-10 rounded-2xl border border-border bg-background-elevated p-6">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <SparkleIcon />
              Análise do seu estabelecimento
            </h2>
            <p className="mt-1 text-xs text-muted">
              Insights baseados no comportamento das pessoas que descobriram seu negócio.
            </p>

            <ul className="mt-4 flex flex-col gap-2">
              {diagnosticInsights(stats).length > 0 ? (
                diagnosticInsights(stats).map((insight) => (
                  <li key={insight} className="flex items-start gap-2 text-sm text-foreground">
                    <span
                      aria-hidden="true"
                      className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-accent"
                    />
                    {insight}
                  </li>
                ))
              ) : (
                <li className="text-sm text-muted">
                  Ainda não há dados suficientes neste período para gerar uma análise.
                </li>
              )}
            </ul>
          </section>
        </>
      )}

      <MostardaCard />
    </div>
  );
}
