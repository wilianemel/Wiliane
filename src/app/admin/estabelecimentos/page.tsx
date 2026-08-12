"use client";

import { useState, type FormEvent } from "react";
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

  const [ownerCode, setOwnerCode] = useState("");
  const [linkStatus, setLinkStatus] = useState<"idle" | "loading" | "success">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
      .select("id, name, category, city, neighborhood, cover_image_url")
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
      })),
    );
    setVenueSearchStatus("idle");
  }

  function selectVenue(venue: SearchableVenue) {
    setSelectedVenue(venue);
    setLinkStatus("idle");
    setErrorMessage(null);
  }

  async function handleLink() {
    if (!selectedVenue || !ownerCode.trim() || linkStatus === "loading") return;

    setLinkStatus("loading");
    setErrorMessage(null);

    const supabase = createClient();
    const { error } = await supabase.rpc("admin_link_venue_owner", {
      p_venue_id: selectedVenue.id,
      p_user_id: ownerCode.trim(),
    });

    if (error) {
      console.error("ADMIN LINK VENUE OWNER ERROR:", error);
      setErrorMessage(
        "Não foi possível vincular agora. Confira o estabelecimento selecionado e o código do usuário.",
      );
      setLinkStatus("idle");
      return;
    }

    setLinkStatus("success");
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-14">
      <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
        Vincular proprietário
      </h1>
      <p className="mt-2 text-sm text-muted">
        Busque o estabelecimento e informe o usuário que deve virar o proprietário dele.
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

      <section className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Proprietário</h2>
        <label htmlFor="owner-code" className="mt-2 block text-sm font-medium text-foreground">
          Código do usuário
        </label>
        <p className="mt-1 text-xs text-muted">
          Encontre esse código no painel do Supabase, em Authentication → Users, na conta da
          pessoa que deve virar proprietária.
        </p>
        <input
          id="owner-code"
          type="text"
          value={ownerCode}
          onChange={(event) => setOwnerCode(event.target.value)}
          placeholder="Código do usuário"
          className={`mt-2 ${inputClasses}`}
        />
      </section>

      {errorMessage && (
        <p className="mt-6 rounded-xl border border-red-400/40 bg-red-400/5 px-4 py-3 text-sm text-red-300">
          {errorMessage}
        </p>
      )}
      {linkStatus === "success" && (
        <p className="mt-6 rounded-xl border border-emerald-400/40 bg-emerald-400/5 px-4 py-3 text-sm text-emerald-300">
          Proprietário vinculado com sucesso.
        </p>
      )}

      <button
        type="button"
        onClick={handleLink}
        disabled={!selectedVenue || !ownerCode.trim() || linkStatus === "loading"}
        className={`mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground transition-transform hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100 ${focusRing}`}
      >
        {linkStatus === "loading" ? "Vinculando..." : "Vincular proprietário"}
      </button>
    </div>
  );
}
