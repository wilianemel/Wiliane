"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { VenueCoverImage } from "@/components/shared/venue-cover-image";
import { AdminGate } from "@/components/admin/admin-gate";

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background";
const inputClasses = `w-full rounded-xl border border-border bg-background px-4 py-3 text-base text-foreground placeholder:text-muted focus:outline-none ${focusRing}`;
const CARD_GRADIENT = "from-zinc-700/40 via-zinc-900 to-black";

interface SearchableVenue {
  id: string;
  name: string;
  category: string;
  city: string;
  neighborhood: string;
  coverImageUrl: string | null;
  isVerified: boolean;
}

interface ReclaimBlock {
  blockedUserId: string;
  blockedUserEmailSnapshot: string | null;
  reason: string | null;
  createdAt: string;
}

export default function AdminEstabelecimentosPage() {
  return (
    <AdminGate>
      <AdminEstabelecimentosContent />
    </AdminGate>
  );
}

function AdminEstabelecimentosContent() {
  const [venueQuery, setVenueQuery] = useState("");
  const [venueSearchStatus, setVenueSearchStatus] = useState<"idle" | "loading">("idle");
  const [venueSearched, setVenueSearched] = useState(false);
  const [venueResults, setVenueResults] = useState<SearchableVenue[]>([]);
  const [selectedVenue, setSelectedVenue] = useState<SearchableVenue | null>(null);

  const [verifyStatus, setVerifyStatus] = useState<"idle" | "loading">("idle");
  const [verifyError, setVerifyError] = useState<string | null>(null);

  const [ownerInfo, setOwnerInfo] = useState<{ hasActiveOwner: boolean } | null>(null);
  const [removeStep, setRemoveStep] = useState<"idle" | "confirming" | "confirming2" | "loading">("idle");
  const [removeReason, setRemoveReason] = useState("");
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [removeSuccess, setRemoveSuccess] = useState<string | null>(null);

  const [blocks, setBlocks] = useState<ReclaimBlock[]>([]);
  const [releasingUserId, setReleasingUserId] = useState<string | null>(null);
  const [releaseError, setReleaseError] = useState<string | null>(null);

  // Sem filtro de is_published/is_active de propósito: quem chega aqui já
  // passou pela checagem de admin, e RLS de venues já libera todo o
  // catálogo (publicado ou não) pra quem passa em is_platform_admin() —
  // nenhuma policy nova foi criada, isso já existia.
  async function handleVenueSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!venueQuery.trim() || venueSearchStatus === "loading") return;

    setVenueSearchStatus("loading");
    setVenueSearched(true);

    const supabase = createClient();
    const { data, error } = await supabase
      .from("venues")
      .select("id, name, category, city, neighborhood, cover_image_url, is_verified")
      .ilike("name", `%${venueQuery.trim()}%`)
      .order("name")
      .limit(20);

    if (error) {
      console.error("ADMIN VENUE SEARCH ERROR:", error);
      setVenueResults([]);
      setVenueSearchStatus("idle");
      return;
    }

    setVenueResults(
      (data ?? []).map((row) => ({
        id: row.id as string,
        name: row.name as string,
        category: row.category as string,
        city: row.city as string,
        neighborhood: row.neighborhood as string,
        coverImageUrl: (row.cover_image_url as string | null) ?? null,
        isVerified: Boolean(row.is_verified),
      })),
    );
    setVenueSearchStatus("idle");
  }

  async function loadOwnerAndBlocks(venueId: string) {
    const supabase = createClient();
    const [{ data: ownerRows }, { data: blockRows }] = await Promise.all([
      supabase
        .from("venue_members")
        .select("id")
        .eq("venue_id", venueId)
        .eq("member_role", "owner")
        .eq("is_active", true)
        .limit(1),
      supabase
        .from("venue_owner_reclaim_blocks")
        // CORREÇÃO (auditoria final 2): filtra/lê pelos snapshots
        // (identidade permanente, not null) — venue_id/blocked_user_id
        // podem virar null via ON DELETE SET NULL.
        .select("blocked_user_id_snapshot, blocked_user_email_snapshot, reason, created_at")
        .eq("venue_id_snapshot", venueId)
        .eq("is_active", true)
        .order("created_at", { ascending: false }),
    ]);

    setOwnerInfo({ hasActiveOwner: (ownerRows?.length ?? 0) > 0 });
    setBlocks(
      (blockRows ?? []).map((row) => ({
        blockedUserId: row.blocked_user_id_snapshot as string,
        blockedUserEmailSnapshot: row.blocked_user_email_snapshot as string | null,
        reason: row.reason as string | null,
        createdAt: row.created_at as string,
      })),
    );
  }

  async function selectVenue(venue: SearchableVenue) {
    setSelectedVenue(venue);
    setVerifyStatus("idle");
    setVerifyError(null);
    setRemoveStep("idle");
    setRemoveReason("");
    setRemoveError(null);
    setRemoveSuccess(null);
    setOwnerInfo(null);
    setBlocks([]);
    setReleaseError(null);

    await loadOwnerAndBlocks(venue.id);
  }

  /**
   * "Liberar nova tentativa" — corrige uma remoção feita por engano.
   * admin_release_venue_owner_block() só desativa o bloqueio; nunca apaga
   * a linha nem a auditoria original da remoção (venue_owner_removal_audit
   * continua intacta).
   */
  async function handleReleaseBlock(blockedUserId: string) {
    if (!selectedVenue || releasingUserId) return;
    setReleasingUserId(blockedUserId);
    setReleaseError(null);

    const supabase = createClient();
    const { error } = await supabase.rpc("admin_release_venue_owner_block", {
      p_venue_id: selectedVenue.id,
      p_user_id: blockedUserId,
    });

    if (error) {
      console.error("ADMIN RELEASE VENUE OWNER BLOCK ERROR:", error);
      setReleaseError("Não foi possível liberar agora. Tente novamente.");
      setReleasingUserId(null);
      return;
    }

    setBlocks((current) => current.filter((block) => block.blockedUserId !== blockedUserId));
    setReleasingUserId(null);
  }

  /**
   * Remoção administrativa de proprietário — soft delete via
   * admin_remove_venue_owner() (SEÇÃO 5 da migration): nunca apaga
   * usuário/venue/mídia/plano, só desativa o vínculo e despublica.
   * Registrada em venue_owner_removal_audit (RLS: só admin lê).
   */
  async function handleRemoveOwner() {
    if (!selectedVenue || !removeReason.trim() || removeStep === "loading") return;
    setRemoveStep("loading");
    setRemoveError(null);

    const supabase = createClient();
    const { error } = await supabase.rpc("admin_remove_venue_owner", {
      p_venue_id: selectedVenue.id,
      p_reason: removeReason.trim(),
    });

    if (error) {
      console.error("ADMIN REMOVE VENUE OWNER ERROR:", error);
      setRemoveError("Não foi possível remover o proprietário agora. Tente novamente.");
      setRemoveStep("confirming2");
      return;
    }

    await loadOwnerAndBlocks(selectedVenue.id);
    setRemoveSuccess(
      `Proprietário removido e bloqueado de reivindicar ${selectedVenue.name} de novo. O estabelecimento foi despublicado e voltou a aparecer na busca para outro proprietário. Use "Liberar nova tentativa" abaixo se a remoção foi um engano.`,
    );
    setRemoveReason("");
    setRemoveStep("idle");
  }

  async function handleToggleVerified() {
    if (!selectedVenue || verifyStatus === "loading") return;

    setVerifyStatus("loading");
    setVerifyError(null);

    const nextVerified = !selectedVenue.isVerified;
    const supabase = createClient();
    const { error } = await supabase.rpc("set_venue_verified_status", {
      target_venue_id: selectedVenue.id,
      p_verified: nextVerified,
    });

    if (error) {
      console.error("SET VENUE VERIFIED STATUS ERROR:", error);
      setVerifyError("Não foi possível atualizar o selo agora. Tente novamente.");
      setVerifyStatus("idle");
      return;
    }

    setSelectedVenue((current) => (current ? { ...current, isVerified: nextVerified } : current));
    setVenueResults((current) =>
      current.map((venue) =>
        venue.id === selectedVenue.id ? { ...venue, isVerified: nextVerified } : venue,
      ),
    );
    setVerifyStatus("idle");
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-14">
      <Link
        href="/admin"
        className={`inline-flex items-center gap-2 text-sm font-medium text-muted transition-colors hover:text-accent ${focusRing} rounded`}
      >
        ← Voltar para o painel administrativo
      </Link>

      <h1 className="mt-6 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
        Gerenciar estabelecimentos
      </h1>
      <p className="mt-2 text-sm text-muted">
        Encontre um estabelecimento para gerenciar sua verificação ou remover o proprietário
        ativo. Vínculo de proprietário acontece automaticamente quando o próprio empresário
        conclui o cadastro pelo painel — não há mais aprovação manual.
      </p>

      <section className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
          Estabelecimento
        </h2>
        <form onSubmit={handleVenueSearch} className="mt-2 flex gap-2">
          <input
            type="text"
            value={venueQuery}
            onChange={(event) => setVenueQuery(event.target.value)}
            placeholder="Buscar estabelecimento"
            className={inputClasses}
          />
          <button
            type="submit"
            disabled={venueSearchStatus === "loading"}
            className={`shrink-0 rounded-full border border-border px-5 py-3 text-sm font-medium text-muted transition-colors hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-40 ${focusRing}`}
          >
            {venueSearchStatus === "loading" ? "Buscando..." : "Buscar"}
          </button>
        </form>

        {venueSearched && venueSearchStatus === "idle" && venueResults.length === 0 && (
          <p className="mt-3 text-sm text-muted">Nenhum estabelecimento encontrado.</p>
        )}

        {venueResults.length > 0 && (
          <ul className="mt-4 flex flex-col gap-3">
            {venueResults.map((venue) => {
              const isSelected = selectedVenue?.id === venue.id;
              return (
                <li
                  key={venue.id}
                  className={`overflow-hidden rounded-2xl border transition-colors ${
                    isSelected ? "border-accent" : "border-border"
                  } bg-background-elevated`}
                >
                  <div className="flex items-center gap-3 p-3">
                    <VenueCoverImage
                      venue={{
                        coverImageUrl: venue.coverImageUrl ?? undefined,
                        gradient: CARD_GRADIENT,
                        name: venue.name,
                      }}
                      className="h-14 w-14 shrink-0 rounded-xl"
                      sizes="56px"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground">{venue.name}</p>
                      <p className="truncate text-xs text-muted">
                        {venue.category} · {venue.neighborhood}, {venue.city}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => selectVenue(venue)}
                      className={`shrink-0 rounded-full border px-4 py-2 text-xs font-medium transition-colors ${focusRing} ${
                        isSelected
                          ? "border-accent bg-accent text-accent-foreground"
                          : "border-border text-muted hover:border-accent hover:text-accent"
                      }`}
                    >
                      {isSelected ? "Selecionado" : "Selecionar"}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {selectedVenue && (
        <>
          <section className="mt-8">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
              Verificação
            </h2>
            <div className="mt-2 flex items-center justify-between gap-3 rounded-2xl border border-border bg-background-elevated p-4">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">
                  {selectedVenue.name}
                </p>
                <p className="mt-0.5 text-xs text-muted">
                  {selectedVenue.isVerified
                    ? "Selo de verificado ativo."
                    : "Sem selo de verificado."}
                </p>
              </div>
              <button
                type="button"
                onClick={handleToggleVerified}
                disabled={verifyStatus === "loading"}
                className={`shrink-0 rounded-full border px-4 py-2 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${focusRing} ${
                  selectedVenue.isVerified
                    ? "border-border text-muted hover:border-red-400 hover:text-red-300"
                    : "border-accent bg-accent text-accent-foreground"
                }`}
              >
                {verifyStatus === "loading"
                  ? "Salvando..."
                  : selectedVenue.isVerified
                    ? "Remover verificação"
                    : "Marcar como verificado"}
              </button>
            </div>
            {verifyError && (
              <p className="mt-3 rounded-xl border border-red-400/40 bg-red-400/5 px-4 py-3 text-sm text-red-300">
                {verifyError}
              </p>
            )}
          </section>

          <section className="mt-8">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
              Proprietário
            </h2>
            <div className="mt-2 rounded-2xl border border-border bg-background-elevated p-4">
              <p className="text-xs text-muted">
                {ownerInfo === null
                  ? "Carregando..."
                  : ownerInfo.hasActiveOwner
                    ? "Este estabelecimento tem um proprietário ativo."
                    : "Sem proprietário ativo no momento — já aparece na busca para um novo cadastro."}
              </p>

              {removeSuccess && (
                <p className="mt-3 rounded-xl border border-emerald-400/40 bg-emerald-400/5 px-4 py-3 text-sm text-emerald-300">
                  {removeSuccess}
                </p>
              )}
              {removeError && (
                <p className="mt-3 rounded-xl border border-red-400/40 bg-red-400/5 px-4 py-3 text-sm text-red-300">
                  {removeError}
                </p>
              )}

              {ownerInfo?.hasActiveOwner && removeStep === "idle" && (
                <button
                  type="button"
                  onClick={() => setRemoveStep("confirming")}
                  className={`mt-3 rounded-full border border-red-400/60 px-4 py-2 text-xs font-semibold text-red-300 transition-colors hover:bg-red-400/10 ${focusRing}`}
                >
                  Remover proprietário
                </button>
              )}

              {removeStep === "confirming" && (
                <div className="mt-3 flex flex-col gap-2">
                  <p className="text-xs text-foreground">
                    O estabelecimento ficará indisponível (despublicado) até outro proprietário
                    completar o cadastro. Explique o motivo da remoção:
                  </p>
                  <textarea
                    value={removeReason}
                    onChange={(event) => setRemoveReason(event.target.value)}
                    rows={2}
                    placeholder="Ex.: Proprietário solicitou remoção por e-mail."
                    className={inputClasses}
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => removeReason.trim() && setRemoveStep("confirming2")}
                      disabled={!removeReason.trim()}
                      className={`rounded-full border border-red-400/60 px-4 py-2 text-xs font-semibold text-red-300 transition-colors hover:bg-red-400/10 disabled:cursor-not-allowed disabled:opacity-40 ${focusRing}`}
                    >
                      Continuar
                    </button>
                    <button
                      type="button"
                      onClick={() => setRemoveStep("idle")}
                      className={`rounded-full border border-border px-4 py-2 text-xs font-medium text-muted transition-colors hover:border-accent hover:text-accent ${focusRing}`}
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}

              {removeStep === "confirming2" && (
                <div className="mt-3 flex flex-col gap-2">
                  <p className="text-xs font-semibold text-red-300">
                    Confirma remover o proprietário de {selectedVenue.name}? O estabelecimento é
                    despublicado imediatamente. Motivo: &quot;{removeReason.trim()}&quot;
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleRemoveOwner}
                      className={`rounded-full bg-red-500 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-red-600 ${focusRing}`}
                    >
                      Confirmar remoção
                    </button>
                    <button
                      type="button"
                      onClick={() => setRemoveStep("idle")}
                      className={`rounded-full border border-border px-4 py-2 text-xs font-medium text-muted transition-colors hover:border-accent hover:text-accent ${focusRing}`}
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}

              {removeStep === "loading" && <p className="mt-3 text-xs text-muted">Removendo...</p>}
            </div>
          </section>

          {blocks.length > 0 && (
            <section className="mt-8">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
                Bloqueios ativos
              </h2>
              <p className="mt-2 text-xs text-muted">
                Estas contas foram removidas como proprietárias deste estabelecimento e não
                conseguem reivindicá-lo de novo até você liberar.
              </p>
              {releaseError && (
                <p className="mt-3 rounded-xl border border-red-400/40 bg-red-400/5 px-4 py-3 text-sm text-red-300">
                  {releaseError}
                </p>
              )}
              <ul className="mt-3 flex flex-col gap-2">
                {blocks.map((block) => (
                  <li
                    key={block.blockedUserId}
                    className="flex flex-col gap-2 rounded-2xl border border-border bg-background-elevated p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-xs text-foreground">
                        {block.blockedUserEmailSnapshot ?? `Conta ${block.blockedUserId.slice(0, 8)}…`}
                      </p>
                      <p className="mt-0.5 text-xs text-muted">
                        {block.reason ? `Motivo: ${block.reason}` : "Sem motivo registrado"} ·{" "}
                        {new Date(block.createdAt).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleReleaseBlock(block.blockedUserId)}
                      disabled={releasingUserId === block.blockedUserId}
                      className={`shrink-0 rounded-full border border-border px-4 py-2 text-xs font-medium text-muted transition-colors hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-40 ${focusRing}`}
                    >
                      {releasingUserId === block.blockedUserId ? "Liberando..." : "Liberar nova tentativa"}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}
