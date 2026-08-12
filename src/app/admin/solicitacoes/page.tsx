"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { AdminGate } from "@/components/admin/admin-gate";

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background";

interface PendingClaimRequest {
  id: string;
  venueId: string;
  userId: string;
  venueName: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  message: string | null;
}

interface ClaimRequestRow {
  id: string;
  venue_id: string;
  user_id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  message: string | null;
  venues: { name: string } | { name: string }[] | null;
}

function resolveVenueName(venues: ClaimRequestRow["venues"]): string {
  if (!venues) return "Estabelecimento";
  return Array.isArray(venues) ? (venues[0]?.name ?? "Estabelecimento") : venues.name;
}

export default function AdminSolicitacoesPage() {
  return (
    <AdminGate>
      <AdminSolicitacoesContent />
    </AdminGate>
  );
}

type LoadState = "loading" | "ready" | "error";

function AdminSolicitacoesContent() {
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [requests, setRequests] = useState<PendingClaimRequest[]>([]);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Só roda na montagem — depois de aprovar/recusar a lista é atualizada
  // localmente (filter), sem precisar recarregar do banco.
  useEffect(() => {
    let cancelled = false;

    async function loadPendingRequests() {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("venue_claim_requests")
        .select("id, venue_id, user_id, name, email, phone, message, venues (name)")
        .eq("status", "pending")
        .order("created_at", { ascending: true });

      if (cancelled) return;

      if (error) {
        console.error("CLAIM REQUESTS LOAD ERROR:", error);
        setLoadState("error");
        return;
      }

      setRequests(
        ((data ?? []) as unknown as ClaimRequestRow[]).map((row) => ({
          id: row.id,
          venueId: row.venue_id,
          userId: row.user_id,
          venueName: resolveVenueName(row.venues),
          name: row.name,
          email: row.email,
          phone: row.phone,
          message: row.message,
        })),
      );
      setLoadState("ready");
    }

    loadPendingRequests();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleApprove(request: PendingClaimRequest) {
    if (processingId) return;
    setProcessingId(request.id);
    setErrorMessage(null);

    const supabase = createClient();
    const { error: linkError } = await supabase.rpc("admin_link_venue_owner", {
      p_venue_id: request.venueId,
      p_user_id: request.userId,
    });

    if (linkError) {
      console.error("ADMIN LINK VENUE OWNER ERROR:", linkError);
      setErrorMessage("Não foi possível vincular o proprietário agora. Tente novamente.");
      setProcessingId(null);
      return;
    }

    const { error: updateError } = await supabase
      .from("venue_claim_requests")
      .update({ status: "approved" })
      .eq("id", request.id);

    if (updateError) {
      console.error("CLAIM REQUEST UPDATE ERROR:", updateError);
      // O vínculo em venue_members já foi criado nesse ponto — não desfazer.
      // Só o status da solicitação não atualizou; avisar sem fingir que nada aconteceu.
      setErrorMessage(
        "O vínculo foi criado, mas não foi possível atualizar o status da solicitação.",
      );
      setProcessingId(null);
      return;
    }

    setRequests((current) => current.filter((item) => item.id !== request.id));
    setProcessingId(null);
  }

  async function handleReject(request: PendingClaimRequest) {
    if (processingId) return;
    setProcessingId(request.id);
    setErrorMessage(null);

    const supabase = createClient();
    const { error } = await supabase
      .from("venue_claim_requests")
      .update({ status: "rejected" })
      .eq("id", request.id);

    if (error) {
      console.error("CLAIM REQUEST REJECT ERROR:", error);
      setErrorMessage("Não foi possível recusar agora. Tente novamente.");
      setProcessingId(null);
      return;
    }

    setRequests((current) => current.filter((item) => item.id !== request.id));
    setProcessingId(null);
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-14">
      <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
        Solicitações de acesso
      </h1>
      <p className="mt-2 text-sm text-muted">
        Pessoas que pediram para assumir um estabelecimento já cadastrado no Qual é a Boa.
      </p>

      {errorMessage && (
        <p className="mt-6 rounded-xl border border-red-400/40 bg-red-400/5 px-4 py-3 text-sm text-red-300">
          {errorMessage}
        </p>
      )}

      {loadState === "loading" && (
        <div className="mt-10 flex items-center justify-center">
          <div
            aria-hidden="true"
            className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-accent"
          />
        </div>
      )}

      {loadState === "error" && (
        <div className="mt-8 rounded-2xl border border-red-400/40 bg-red-400/5 p-6 text-center">
          <p className="text-sm text-red-300">Não foi possível carregar as solicitações agora.</p>
        </div>
      )}

      {loadState === "ready" && requests.length === 0 && (
        <div className="mt-8 rounded-2xl border border-border bg-background-elevated p-6 text-center">
          <p className="text-sm text-muted">Nenhuma solicitação pendente no momento.</p>
        </div>
      )}

      {loadState === "ready" && requests.length > 0 && (
        <ul className="mt-8 flex flex-col gap-4">
          {requests.map((request) => (
            <li
              key={request.id}
              className="rounded-2xl border border-border bg-background-elevated p-6"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-accent">
                Solicitação de acesso
              </p>

              <dl className="mt-3 flex flex-col gap-2 text-sm">
                <div>
                  <dt className="text-xs text-muted">Estabelecimento</dt>
                  <dd className="font-semibold text-foreground">{request.venueName}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">Solicitante</dt>
                  <dd className="text-foreground">{request.name || "Não informado"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">Email</dt>
                  <dd className="text-foreground">{request.email || "Não informado"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">Telefone</dt>
                  <dd className="text-foreground">{request.phone || "Não informado"}</dd>
                </div>
                {request.message && (
                  <div>
                    <dt className="text-xs text-muted">Mensagem</dt>
                    <dd className="text-foreground">{request.message}</dd>
                  </div>
                )}
              </dl>

              <div className="mt-5 flex gap-3">
                <button
                  type="button"
                  onClick={() => handleApprove(request)}
                  disabled={processingId === request.id}
                  className={`inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-accent px-5 py-3 text-sm font-semibold text-accent-foreground transition-transform hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100 ${focusRing}`}
                >
                  {processingId === request.id ? "Processando..." : "Aprovar"}
                </button>
                <button
                  type="button"
                  onClick={() => handleReject(request)}
                  disabled={processingId === request.id}
                  className={`inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-border px-5 py-3 text-sm font-medium text-muted transition-colors hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-40 ${focusRing}`}
                >
                  Recusar
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
