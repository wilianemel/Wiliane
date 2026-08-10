"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { VenueAccessGate } from "@/components/empresa/venue-access-gate";
import type { VenueOwnerRow } from "@/lib/venues/venue-owner";
import { getVenueDashboardStats, type VenueDashboardStats } from "@/lib/venues/venue-dashboard";

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background";

const PERIOD_DAYS = 30;

interface MetricCard {
  label: string;
  value: number;
  description: string;
}

function metricsFromStats(stats: VenueDashboardStats): MetricCard[] {
  return [
    {
      label: "Visualizações",
      value: stats.views,
      description: "Total de vezes que seu estabelecimento foi visualizado.",
    },
    {
      label: "Visitantes únicos",
      value: stats.uniqueVisitors,
      description: "Pessoas diferentes que visualizaram seu estabelecimento.",
    },
    {
      label: "Gostei",
      value: stats.likes,
      description: "Pessoas que aprovaram uma recomendação do seu estabelecimento.",
    },
    {
      label: "Não gostei",
      value: stats.dislikes,
      description: "Pessoas que disseram que a recomendação não combinou com elas.",
    },
    {
      label: "Favoritos",
      value: stats.favorites,
      description: "Pessoas que salvaram seu estabelecimento nos favoritos.",
    },
    {
      label: "Cliques no WhatsApp",
      value: stats.whatsappClicks,
      description: "Cliques para entrar em contato pelo WhatsApp.",
    },
    {
      label: "Rotas abertas",
      value: stats.routeClicks,
      description: "Pessoas que abriram a rota para chegar ao estabelecimento.",
    },
  ];
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
  const [statsState, setStatsState] = useState<StatsState>("loading");
  const [stats, setStats] = useState<VenueDashboardStats | null>(null);

  useEffect(() => {
    let active = true;

    Promise.resolve().then(() => {
      if (active) setStatsState("loading");
    });

    const since = new Date();
    since.setDate(since.getDate() - PERIOD_DAYS);

    getVenueDashboardStats(venue.id, since).then((result) => {
      if (!active) return;
      if (!result) {
        setStatsState("error");
        return;
      }
      setStats(result);
      setStatsState("success");
    });

    return () => {
      active = false;
    };
  }, [venue.id]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-14">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-muted">{venue.name}</p>
        </div>
        <Link
          href="/empresa/painel"
          className={`rounded-full border border-border px-4 py-2 text-sm font-medium text-muted transition-colors hover:border-accent hover:text-accent ${focusRing}`}
        >
          Voltar ao painel
        </Link>
      </div>

      <p className="mt-6 text-xs font-semibold uppercase tracking-wide text-muted">
        Últimos {PERIOD_DAYS} dias
      </p>

      {statsState === "loading" && (
        <div className="mt-4 flex items-center justify-center py-16">
          <div
            aria-hidden="true"
            className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-accent"
          />
        </div>
      )}

      {statsState === "error" && (
        <div className="mt-4 rounded-2xl border border-red-400/40 bg-red-400/5 p-6 text-center">
          <p className="text-sm text-red-300">
            Não foi possível carregar as métricas agora. Tente novamente mais tarde.
          </p>
        </div>
      )}

      {statsState === "success" && stats && (
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {metricsFromStats(stats).map((metric) => (
            <div
              key={metric.label}
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
      )}
    </div>
  );
}
