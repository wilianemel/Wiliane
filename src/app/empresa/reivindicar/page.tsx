"use client";

import { Suspense, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { VenueCoverImage } from "@/components/shared/venue-cover-image";
import {
  CLAIM_VENUE_STORAGE_KEY,
  isValidUuid,
  storeSelectedClaimVenue,
  type SelectedClaimVenue,
} from "@/lib/venues/claim-flow";

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background";
const inputClasses = `w-full rounded-xl border border-border bg-background px-4 py-3 text-base text-foreground placeholder:text-muted focus:outline-none ${focusRing}`;
const CARD_GRADIENT = "from-zinc-700/40 via-zinc-900 to-black";

/** Formato exato retornado por search_claimable_venues (RPC) — 6 colunas, nunca mais que isso. */
interface ClaimableVenueRow {
  id: string;
  name: string;
  category: string;
  city: string;
  neighborhood: string;
  cover_image_url: string | null;
}

/** Mensagens conhecidas de start_or_resume_venue_claim — qualquer outra vira uma mensagem genérica, nunca o erro técnico do Postgres. */
function friendlyClaimError(message: string): string {
  const known = [
    "Este estabelecimento já está em processo de atualização. Fale com nossa equipe se precisar de ajuda.",
    "Este estabelecimento já tem um proprietário ativo.",
    "Estabelecimento não encontrado.",
  ];
  if (known.some((k) => message.includes(k))) return message;
  return "Não foi possível continuar agora. Tente novamente em instantes.";
}

export default function ReivindicarEstabelecimentoPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-md px-4 py-16 text-center sm:px-6">
          <div
            aria-hidden="true"
            className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-border border-t-accent"
          />
        </div>
      }
    >
      <ReivindicarContent />
    </Suspense>
  );
}

type AuthState = "checking" | "unauthenticated" | "authenticated";

function ReivindicarContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedVenueId = searchParams.get("venue");

  const [authState, setAuthState] = useState<AuthState>("checking");
  const [query, setQuery] = useState("");
  const [searchStatus, setSearchStatus] = useState<"idle" | "loading">("idle");
  const [searched, setSearched] = useState(false);
  const [results, setResults] = useState<SelectedClaimVenue[]>([]);
  // `?venue=` volta preenchido depois de criar conta/entrar (ver
  // claim-flow.ts) — o valor inicial recupera o resumo salvo no
  // sessionStorage (nome, categoria etc.) só para exibição; a fonte de
  // verdade continua sendo o UUID validado, nunca o texto solto da URL.
  // Leitura acontece uma vez, no inicializador preguiçoso do useState (não
  // num efeito) para não disparar um setState extra logo no primeiro render.
  const [selectedVenue, setSelectedVenue] = useState<SelectedClaimVenue | null>(() => {
    if (!preselectedVenueId || !isValidUuid(preselectedVenueId)) return null;
    try {
      const raw = sessionStorage.getItem(CLAIM_VENUE_STORAGE_KEY);
      if (!raw) return null;
      const saved = JSON.parse(raw) as SelectedClaimVenue;
      return saved.id === preselectedVenueId ? saved : null;
    } catch {
      return null;
    }
  });
  const [continuing, setContinuing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadSession() {
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      if (cancelled) return;
      setUser(data.user ?? null);
      setAuthState(data.user ? "authenticated" : "unauthenticated");
    }
    loadSession();
    return () => {
      cancelled = true;
    };
  }, []);

  // Já autenticado com um venue pré-selecionado (voltando do cadastro/login)
  // — continua o processo automaticamente, sem exigir clique de novo.
  useEffect(() => {
    if (authState !== "authenticated") return;
    if (!preselectedVenueId || !isValidUuid(preselectedVenueId)) return;
    continueClaim(preselectedVenueId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authState, preselectedVenueId]);

  async function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedQuery = query.trim();
    if (trimmedQuery.length < 2 || searchStatus === "loading") return;

    setSearchStatus("loading");
    setSearched(true);

    const supabase = createClient();
    const { data, error } = await supabase.rpc("search_claimable_venues", {
      search_query: trimmedQuery,
    });

    if (error) {
      console.error("VENUE SEARCH ERROR:", error);
      setResults([]);
      setSearchStatus("idle");
      return;
    }

    const rows = (data ?? []) as ClaimableVenueRow[];
    setResults(
      rows.map((row) => ({
        id: row.id,
        name: row.name,
        category: row.category,
        city: row.city,
        neighborhood: row.neighborhood,
        coverImageUrl: row.cover_image_url ?? null,
      })),
    );
    setSearchStatus("idle");
  }

  function selectVenue(venue: SelectedClaimVenue) {
    setSelectedVenue(venue);
    setErrorMessage(null);
    storeSelectedClaimVenue(venue);
  }

  function backToSearch() {
    setSelectedVenue(null);
    setErrorMessage(null);
  }

  async function continueClaim(venueId: string) {
    if (continuing) return;
    setContinuing(true);
    setErrorMessage(null);

    const supabase = createClient();
    // p_requester_name é só um snapshot de exibição (histórico) — vem da
    // própria sessão do usuário, nunca usado para autorização. O e-mail
    // não é mais enviado pelo cliente: a RPC sempre lê de auth.users via
    // auth.uid() (CORREÇÃO — nunca via user_metadata).
    const { data, error } = await supabase.rpc("start_or_resume_venue_claim", {
      p_venue_id: venueId,
      p_requester_name:
        typeof user?.user_metadata?.full_name === "string" ? user.user_metadata.full_name : null,
    });

    if (error) {
      console.error("START OR RESUME VENUE CLAIM ERROR:", error);
      setErrorMessage(friendlyClaimError(error.message));
      setContinuing(false);
      return;
    }

    const row = (Array.isArray(data) ? data[0] : data) as
      | { claim_request_id: string; draft_id: string; status: string }
      | undefined;

    if (!row?.claim_request_id) {
      setErrorMessage("Não foi possível continuar agora. Tente novamente em instantes.");
      setContinuing(false);
      return;
    }

    router.push(`/empresa/reivindicar/preencher?solicitacao=${row.claim_request_id}`);
  }

  if (authState === "checking") {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center sm:px-6">
        <div
          aria-hidden="true"
          className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-border border-t-accent"
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-14">
      <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
        Encontre seu estabelecimento
      </h1>
      <p className="mt-2 text-sm text-muted">
        Seu estabelecimento já pode estar no Qual é a Boa. Procure pelo nome e assuma o controle
        da sua página.
      </p>

      {!selectedVenue && (
        <>
          <form onSubmit={handleSearch} className="mt-8 flex gap-2">
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Digite o nome do estabelecimento"
              className={inputClasses}
            />
            <button
              type="submit"
              disabled={searchStatus === "loading"}
              className={`shrink-0 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground transition-transform hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-40 ${focusRing}`}
            >
              {searchStatus === "loading" ? "Buscando..." : "Buscar"}
            </button>
          </form>

          {searched && searchStatus === "idle" && results.length === 0 && (
            <div className="mt-8 rounded-2xl border border-border bg-background-elevated p-6 text-center">
              <p className="text-sm text-muted">
                Não encontramos nenhum estabelecimento com esse nome.
              </p>
            </div>
          )}

          {results.length > 0 && (
            <ul className="mt-8 flex flex-col gap-4">
              {results.map((venue) => (
                <li
                  key={venue.id}
                  className="overflow-hidden rounded-2xl border border-border bg-background-elevated"
                >
                  <div className="flex flex-col sm:flex-row">
                    <VenueCoverImage
                      venue={{
                        coverImageUrl: venue.coverImageUrl ?? undefined,
                        gradient: CARD_GRADIENT,
                        name: venue.name,
                      }}
                      className="h-32 w-full sm:h-auto sm:w-40 sm:shrink-0"
                      sizes="(min-width: 640px) 160px, 100vw"
                    />
                    <div className="flex flex-1 flex-col justify-between gap-3 p-5">
                      <div>
                        <p className="text-base font-semibold text-foreground">{venue.name}</p>
                        <p className="text-xs text-muted">
                          {venue.category} · {venue.neighborhood}, {venue.city}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => selectVenue(venue)}
                        className={`inline-flex w-fit items-center gap-2 rounded-full border border-accent px-5 py-2 text-sm font-semibold text-accent transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
                      >
                        É meu estabelecimento
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {selectedVenue && (
        <div className="mt-8 overflow-hidden rounded-2xl border border-accent/40 bg-background-elevated">
          <div className="flex flex-col sm:flex-row">
            <VenueCoverImage
              venue={{
                coverImageUrl: selectedVenue.coverImageUrl ?? undefined,
                gradient: CARD_GRADIENT,
                name: selectedVenue.name,
              }}
              className="h-32 w-full sm:h-auto sm:w-40 sm:shrink-0"
              sizes="(min-width: 640px) 160px, 100vw"
            />
            <div className="flex flex-1 flex-col justify-between gap-4 p-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-accent">
                  Estabelecimento selecionado
                </p>
                <p className="mt-1 text-base font-semibold text-foreground">
                  {selectedVenue.name}
                </p>
                <p className="text-xs text-muted">
                  {selectedVenue.category} · {selectedVenue.neighborhood}, {selectedVenue.city}
                </p>
              </div>

              {errorMessage && (
                <p className="rounded-xl border border-red-400/40 bg-red-400/5 px-4 py-3 text-sm text-red-300">
                  {errorMessage}
                </p>
              )}

              <div className="flex flex-col gap-3 sm:flex-row">
                {authState === "unauthenticated" ? (
                  <Link
                    href={`/empresa/cadastro?fluxo=existente&venue=${selectedVenue.id}`}
                    className={`inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground transition-transform hover:scale-[1.02] ${focusRing}`}
                  >
                    Entrar para completar cadastro
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={() => continueClaim(selectedVenue.id)}
                    disabled={continuing}
                    className={`inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground transition-transform hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-40 ${focusRing}`}
                  >
                    {continuing ? "Continuando..." : "Continuar cadastro"}
                  </button>
                )}
                <button
                  type="button"
                  onClick={backToSearch}
                  className={`inline-flex items-center justify-center gap-2 rounded-full border border-border px-6 py-3 text-sm font-medium text-muted transition-colors hover:border-accent hover:text-accent ${focusRing}`}
                >
                  Buscar outro
                </button>
              </div>

              {authState === "unauthenticated" && (
                <p className="text-center text-xs text-muted sm:text-left">
                  Já tem uma conta empresarial?{" "}
                  <Link
                    href={`/empresa/entrar?next=/empresa/reivindicar&venue=${selectedVenue.id}`}
                    className="text-accent hover:underline"
                  >
                    Entrar
                  </Link>
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
