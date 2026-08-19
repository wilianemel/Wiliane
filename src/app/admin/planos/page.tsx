"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { AdminGate } from "@/components/admin/admin-gate";

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background";

const PLAN_LABELS: Record<string, string> = {
  free: "Free",
  partner: "Partner",
  basico: "Plano Essencial",
  master: "Plano Master",
};
const STATUS_LABELS: Record<string, string> = {
  active: "Ativo",
  expired: "Expirado",
  canceled: "Cancelado",
  pending_payment: "Aguardando pagamento",
};

interface PlanDefinition {
  planType: string;
  videoLimit: number | null;
  imageLimit: number | null;
  viewLimit: number | null;
  regularPriceCents: number;
  introductoryPriceCents: number | null;
  introductoryMonths: number | null;
}

interface VenuePlanRow {
  venueId: string;
  venueName: string;
  planType: string;
  status: string;
  startedAt: string;
  expiresAt: string | null;
  videoLimit: number | null;
  imageLimit: number | null;
  viewLimit: number | null;
  viewCount: number;
}

/** Formato exato retornado por admin_list_venue_plans (RPC). */
interface AdminListVenuePlansRow {
  venue_id: string;
  venue_name: string;
  plan_type: string;
  status: string;
  started_at: string;
  expires_at: string | null;
  video_limit: number | null;
  image_limit: number | null;
  view_limit: number | null;
  view_count: number;
}

interface PendingPlanRequest {
  venueId: string;
  venueName: string;
  planType: string;
  requestedAt: string;
}

/** Formato exato retornado por admin_list_pending_venue_plans (RPC). */
interface AdminListPendingVenuePlansRow {
  venue_id: string;
  venue_name: string;
  plan_type: string;
  requested_at: string;
}

function formatPriceCents(cents: number): string {
  if (cents === 0) return "Grátis";
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("pt-BR");
}

export default function AdminPlanosPage() {
  return (
    <AdminGate>
      <AdminPlanosContent />
    </AdminGate>
  );
}

type LoadState = "loading" | "error" | "success";

function AdminPlanosContent() {
  const [state, setState] = useState<LoadState>("loading");
  const [definitions, setDefinitions] = useState<PlanDefinition[]>([]);
  const [venuePlans, setVenuePlans] = useState<VenuePlanRow[]>([]);
  const [pendingRequests, setPendingRequests] = useState<PendingPlanRequest[]>([]);

  useEffect(() => {
    let active = true;
    const supabase = createClient();

    Promise.all([
      supabase
        .from("venue_plan_definitions")
        .select(
          "plan_type, video_limit, image_limit, view_limit, regular_price_cents, introductory_price_cents, introductory_months",
        )
        .order("regular_price_cents", { ascending: true }),
      supabase.rpc("admin_list_venue_plans"),
      supabase.rpc("admin_list_pending_venue_plans"),
    ]).then(([definitionsResult, venuePlansResult, pendingResult]) => {
      if (!active) return;

      if (definitionsResult.error || venuePlansResult.error || pendingResult.error) {
        console.error(
          "ADMIN PLANOS LOAD ERROR:",
          definitionsResult.error ?? venuePlansResult.error ?? pendingResult.error,
        );
        setState("error");
        return;
      }

      setDefinitions(
        (definitionsResult.data ?? []).map((row) => ({
          planType: row.plan_type as string,
          videoLimit: row.video_limit as number | null,
          imageLimit: row.image_limit as number | null,
          viewLimit: row.view_limit as number | null,
          regularPriceCents: row.regular_price_cents as number,
          introductoryPriceCents: row.introductory_price_cents as number | null,
          introductoryMonths: row.introductory_months as number | null,
        })),
      );
      setVenuePlans(
        ((venuePlansResult.data ?? []) as AdminListVenuePlansRow[]).map((row) => ({
          venueId: row.venue_id as string,
          venueName: row.venue_name as string,
          planType: row.plan_type as string,
          status: row.status as string,
          startedAt: row.started_at as string,
          expiresAt: row.expires_at as string | null,
          videoLimit: row.video_limit as number | null,
          imageLimit: row.image_limit as number | null,
          viewLimit: row.view_limit as number | null,
          viewCount: row.view_count as number,
        })),
      );
      setPendingRequests(
        ((pendingResult.data ?? []) as AdminListPendingVenuePlansRow[]).map((row) => ({
          venueId: row.venue_id as string,
          venueName: row.venue_name as string,
          planType: row.plan_type as string,
          requestedAt: row.requested_at as string,
        })),
      );
      setState("success");
    });

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-14">
      <Link
        href="/admin"
        className={`inline-flex items-center gap-2 text-sm font-medium text-muted transition-colors hover:text-accent ${focusRing} rounded`}
      >
        ← Voltar para o painel administrativo
      </Link>

      <h1 className="mt-6 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
        Planos comerciais
      </h1>
      <p className="mt-2 text-sm text-muted">
        Limites e preço de cada plano, e o plano atual de cada estabelecimento. Contratação dos
        planos Essencial e Master, e concessão do Partner, continuam sendo combinadas diretamente
        com o estabelecimento (WhatsApp) — esta tela é só de acompanhamento e confirmação manual
        de pagamento, sem aprovação editorial do estabelecimento.
      </p>

      {state === "loading" && (
        <div className="mt-8 flex items-center justify-center py-16">
          <div
            aria-hidden="true"
            className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-accent"
          />
        </div>
      )}

      {state === "error" && (
        <div className="mt-8 rounded-2xl border border-red-400/40 bg-red-400/5 p-6 text-center">
          <p className="text-sm text-red-300">
            Não foi possível carregar os planos agora. Tente novamente mais tarde.
          </p>
        </div>
      )}

      {state === "success" && (
        <>
          <section className="mt-8">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
              Planos cadastrados
            </h2>
            <div className="mt-2 flex flex-col gap-3">
              {definitions.map((plan) => (
                <div
                  key={plan.planType}
                  className="rounded-2xl border border-border bg-background-elevated p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-foreground">
                      {PLAN_LABELS[plan.planType] ?? plan.planType}
                    </p>
                    <p className="text-sm text-foreground">
                      {plan.introductoryPriceCents !== null && plan.introductoryMonths !== null
                        ? `${formatPriceCents(plan.introductoryPriceCents)}/mês por ${plan.introductoryMonths} meses, depois ${formatPriceCents(plan.regularPriceCents)}/mês`
                        : `${formatPriceCents(plan.regularPriceCents)}/mês`}
                    </p>
                  </div>
                  <p className="mt-1 text-xs text-muted">
                    {plan.videoLimit ?? "—"} vídeo{plan.videoLimit === 1 ? "" : "s"} ·{" "}
                    {plan.imageLimit ?? "—"} foto{plan.imageLimit === 1 ? "" : "s"} ·{" "}
                    {plan.viewLimit === null
                      ? "sem corte de recomendação"
                      : `até ${plan.viewLimit} visualizações antes de sair das recomendações`}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {pendingRequests.length > 0 && (
            <section className="mt-8">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-accent">
                Aguardando ativação
              </h2>
              <p className="mt-1 text-xs text-muted">
                Escolheram um plano pago no cadastro ou no painel, mas o pagamento ainda não foi
                confirmado — o plano ativo continua sendo Free até você confirmar pelo WhatsApp e
                ativar manualmente.
              </p>
              <ul className="mt-2 flex flex-col gap-3">
                {pendingRequests.map((row) => (
                  <li
                    key={`${row.venueId}-${row.planType}`}
                    className="rounded-2xl border border-accent/40 bg-accent/5 p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {row.venueName}
                      </p>
                      <p className="text-xs text-muted">{PLAN_LABELS[row.planType] ?? row.planType}</p>
                    </div>
                    <p className="mt-1 text-xs text-muted">
                      Solicitado em {formatDate(row.requestedAt)}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="mt-8">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
              Plano por estabelecimento
            </h2>
            {venuePlans.length === 0 ? (
              <p className="mt-2 text-sm text-muted">Nenhum estabelecimento com plano ativo.</p>
            ) : (
              <ul className="mt-2 flex flex-col gap-3">
                {venuePlans.map((row) => (
                  <li
                    key={row.venueId}
                    className="rounded-2xl border border-border bg-background-elevated p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {row.venueName}
                      </p>
                      <p className="text-xs text-muted">
                        {PLAN_LABELS[row.planType] ?? row.planType} ·{" "}
                        {STATUS_LABELS[row.status] ?? row.status}
                      </p>
                    </div>
                    <p className="mt-1 text-xs text-muted">
                      Início: {formatDate(row.startedAt)}
                      {row.expiresAt && ` · Expira: ${formatDate(row.expiresAt)}`}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      {row.videoLimit ?? "—"} vídeo{row.videoLimit === 1 ? "" : "s"} ·{" "}
                      {row.imageLimit ?? "—"} foto{row.imageLimit === 1 ? "" : "s"}
                      {row.viewLimit !== null && ` · ${row.viewCount}/${row.viewLimit} visualizações`}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
