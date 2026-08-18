"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { VenueCoverImage } from "@/components/shared/venue-cover-image";

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background";
const inputClasses = `w-full rounded-xl border border-border bg-background px-4 py-3 text-base text-foreground placeholder:text-muted focus:outline-none ${focusRing}`;

/** Sem gradiente calculado por slug aqui (fora de mapVenueRow) — mesmo fallback neutro já usado em painel/page.tsx pros cards do dono. */
const CARD_GRADIENT = "from-zinc-700/40 via-zinc-900 to-black";

interface SearchableVenue {
  id: string;
  name: string;
  category: string;
  city: string;
  neighborhood: string;
  coverImageUrl: string | null;
}

/** Formato exato retornado por search_claimable_venues (RPC) — 6 colunas, nunca mais que isso. */
interface ClaimableVenueRow {
  id: string;
  name: string;
  category: string;
  city: string;
  neighborhood: string;
  cover_image_url: string | null;
}

type AuthState = "checking" | "unauthenticated" | "authenticated";

export default function ReivindicarEstabelecimentoPage() {
  const [authState, setAuthState] = useState<AuthState>("checking");
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadSession() {
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      if (cancelled) return;
      if (data.user) {
        setUser(data.user);
        setAuthState("authenticated");
      } else {
        setAuthState("unauthenticated");
      }
    }
    loadSession();
    return () => {
      cancelled = true;
    };
  }, []);

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

  if (authState === "unauthenticated") {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center sm:px-6">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Você precisa criar uma conta empresarial para assumir este estabelecimento.
        </h1>
        <Link
          href="/empresa/cadastro?fluxo=existente"
          className={`mt-8 inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground transition-transform hover:scale-[1.02] ${focusRing}`}
        >
          Criar conta empresarial
        </Link>
      </div>
    );
  }

  if (authState === "authenticated" && user) {
    return <ReivindicarContent user={user} />;
  }

  return null;
}

type Phase = "search" | "request" | "success";

function ReivindicarContent({ user }: { user: User }) {
  const [query, setQuery] = useState("");
  const [searchStatus, setSearchStatus] = useState<"idle" | "loading">("idle");
  const [searched, setSearched] = useState(false);
  const [results, setResults] = useState<SearchableVenue[]>([]);
  const [phase, setPhase] = useState<Phase>("search");
  const [selectedVenue, setSelectedVenue] = useState<SearchableVenue | null>(null);

  const [requesterName, setRequesterName] = useState(
    typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : "",
  );
  const [requesterPhone, setRequesterPhone] = useState("");
  const [requesterEmail, setRequesterEmail] = useState(user.email ?? "");
  const [requesterMessage, setRequesterMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // RPC search_claimable_venues (SECURITY DEFINER) em vez de consultar
  // "venues" direto — só assim alcançamos estabelecimentos ainda não
  // publicados (ex.: pré-cadastrados pela equipe, sem dono ainda), que a
  // policy pública de venues nunca deixaria um usuário comum ler. A função
  // já filtra pra fora qualquer venue com venue_members ativo e exige
  // autenticação + 2 caracteres — nunca cria vínculo, só retorna os 6
  // campos públicos declarados nela.
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

  function selectVenue(venue: SearchableVenue) {
    setSelectedVenue(venue);
    setErrorMessage(null);
    setPhase("request");
  }

  function backToSearch() {
    setSelectedVenue(null);
    setErrorMessage(null);
    setPhase("search");
  }

  // Não cria vínculo nenhum aqui — só registra a solicitação. O vínculo
  // real em venue_members só acontece depois que um admin aprovar em
  // /admin/solicitacoes (chamando admin_link_venue_owner de lá).
  async function handleSendRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedVenue || sending) return;

    setSending(true);
    setErrorMessage(null);

    const supabase = createClient();
    const { error } = await supabase.from("venue_claim_requests").insert({
      venue_id: selectedVenue.id,
      user_id: user.id,
      name: requesterName.trim() || null,
      email: requesterEmail.trim() || null,
      phone: requesterPhone.trim() || null,
      message: requesterMessage.trim() || null,
      status: "pending",
      source: "organic",
    });

    if (error) {
      console.error("VENUE CLAIM REQUEST ERROR:", error);
      setErrorMessage(
        "Não foi possível enviar sua solicitação agora. Se o problema continuar, fale com a nossa equipe.",
      );
      setSending(false);
      return;
    }

    setSending(false);
    setPhase("success");
  }

  if (phase === "success" && selectedVenue) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center sm:px-6">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Solicitação enviada!
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-muted">
          Nossa equipe analisará seus dados e liberará o acesso.
        </p>
        <Link
          href="/empresa/painel"
          className={`mt-8 inline-flex items-center gap-2 rounded-full border border-border px-6 py-3 text-sm font-medium text-muted transition-colors hover:border-accent hover:text-accent ${focusRing}`}
        >
          Voltar ao painel
        </Link>
      </div>
    );
  }

  if (phase === "request" && selectedVenue) {
    return (
      <div className="mx-auto max-w-md px-4 py-10 sm:px-6 sm:py-14">
        <button
          type="button"
          onClick={backToSearch}
          className={`text-sm font-medium text-muted transition-colors hover:text-accent ${focusRing} rounded`}
        >
          ← Voltar à busca
        </button>

        <h1 className="mt-6 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Solicitar gerenciamento do estabelecimento
        </h1>
        <p className="mt-2 text-sm text-muted">Você está solicitando acesso a:</p>
        <p className="mt-1 text-lg font-semibold text-foreground">{selectedVenue.name}</p>

        <form onSubmit={handleSendRequest} className="mt-6 flex flex-col gap-4">
          <div>
            <label htmlFor="requester-name" className="text-sm font-medium text-foreground">
              Nome completo
            </label>
            <input
              id="requester-name"
              type="text"
              autoComplete="name"
              value={requesterName}
              onChange={(event) => setRequesterName(event.target.value)}
              placeholder="Seu nome completo"
              className={`mt-2 ${inputClasses}`}
              required
            />
          </div>

          <div>
            <label htmlFor="requester-phone" className="text-sm font-medium text-foreground">
              Telefone
            </label>
            <input
              id="requester-phone"
              type="tel"
              autoComplete="tel"
              value={requesterPhone}
              onChange={(event) => setRequesterPhone(event.target.value)}
              placeholder="(12) 90000-0000"
              className={`mt-2 ${inputClasses}`}
              required
            />
          </div>

          <div>
            <label htmlFor="requester-email" className="text-sm font-medium text-foreground">
              Email
            </label>
            <input
              id="requester-email"
              type="email"
              autoComplete="email"
              value={requesterEmail}
              onChange={(event) => setRequesterEmail(event.target.value)}
              placeholder="voce@empresa.com"
              className={`mt-2 ${inputClasses}`}
              required
            />
          </div>

          <div>
            <label htmlFor="requester-message" className="text-sm font-medium text-foreground">
              Mensagem <span className="font-normal text-muted">(opcional)</span>
            </label>
            <textarea
              id="requester-message"
              value={requesterMessage}
              onChange={(event) => setRequesterMessage(event.target.value)}
              placeholder="Conte um pouco sobre sua relação com o estabelecimento."
              rows={3}
              className={`mt-2 ${inputClasses} resize-none`}
            />
          </div>

          {errorMessage && (
            <p className="rounded-xl border border-red-400/40 bg-red-400/5 px-4 py-3 text-sm text-red-300">
              {errorMessage}
            </p>
          )}

          <button
            type="submit"
            disabled={sending}
            className={`mt-2 inline-flex w-full items-center justify-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground transition-transform hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100 ${focusRing}`}
          >
            {sending ? "Enviando..." : "Enviar solicitação"}
          </button>
        </form>
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
          <p className="text-sm text-muted">Não encontramos nenhum estabelecimento com esse nome.</p>
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
                    Solicitar acesso
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
