"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { VenueAccessGate } from "@/components/empresa/venue-access-gate";
import type { VenueOwnerRow } from "@/lib/venues/venue-owner";

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background";

function TagList({ title, values }: { title: string; values: string[] | null }) {
  if (!values || values.length === 0) return null;
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">{title}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {values.map((value) => (
          <span
            key={value}
            className="rounded-full border border-border px-3 py-1 text-xs text-foreground"
          >
            {value}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function PreviewEstabelecimentoPage() {
  const params = useParams<{ venueId: string }>();
  const venueId = params.venueId;

  return (
    <VenueAccessGate venueId={venueId}>{(venue) => <PreviewContent venue={venue} />}</VenueAccessGate>
  );
}

function PreviewContent({ venue }: { venue: VenueOwnerRow }) {
  const [publishing, setPublishing] = useState(false);
  const [published, setPublished] = useState(venue.is_published);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handlePublish() {
    setPublishing(true);
    setErrorMessage(null);

    const supabase = createClient();
    const { error } = await supabase.rpc("publish_owned_venue", {
      target_venue_id: venue.id,
    });

    if (error) {
      setErrorMessage(error.message);
      setPublishing(false);
      return;
    }

    setPublishing(false);
    setPublished(true);
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-14">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Prévia</h1>
        <Link
          href="/empresa/painel"
          className={`rounded-full border border-border px-4 py-2 text-sm font-medium text-muted transition-colors hover:border-accent hover:text-accent ${focusRing}`}
        >
          Voltar ao painel
        </Link>
      </div>

      <div className="mt-8 overflow-hidden rounded-2xl border border-border bg-background-elevated">
        {venue.cover_image_url ? (
          <div className="relative h-48 w-full">
            <Image
              src={venue.cover_image_url}
              alt={`Capa de ${venue.name}`}
              fill
              sizes="700px"
              className="object-cover"
            />
          </div>
        ) : (
          <div className="relative flex h-48 w-full items-center justify-center bg-gradient-to-br from-zinc-700/40 via-zinc-900 to-black">
            <span className="rounded-full bg-black/50 px-3 py-1 text-xs text-white/70 backdrop-blur">
              Área reservada para imagem
            </span>
          </div>
        )}

        <div className="flex flex-col gap-5 p-6">
          <div className="flex items-center gap-3">
            {venue.logo_url && (
              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full border border-border">
                <Image src={venue.logo_url} alt={`Logo de ${venue.name}`} fill sizes="56px" className="object-cover" />
              </div>
            )}
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-accent">
                {venue.category}
              </p>
              <h2 className="text-xl font-bold text-foreground">{venue.name}</h2>
              <p className="text-xs text-muted">
                {venue.neighborhood}, {venue.city} · {venue.address}
              </p>
            </div>
          </div>

          <p className="text-sm leading-relaxed text-muted">{venue.description}</p>

          {venue.video_url && (
            <video src={venue.video_url} controls muted className="w-full rounded-xl bg-black" />
          )}

          <div className="flex flex-wrap gap-4 text-sm text-foreground">
            <span>Faixa de preço: {venue.price_range ?? "não informado"}</span>
            {venue.average_price_per_person != null && (
              <span>Média por pessoa: R$ {venue.average_price_per_person}</span>
            )}
            {venue.average_price_for_couple != null && (
              <span>Média para casal: R$ {venue.average_price_for_couple}</span>
            )}
          </div>

          <div className="flex flex-col gap-1 text-sm text-muted">
            {venue.whatsapp_number && <span>WhatsApp: {venue.whatsapp_number}</span>}
            {venue.instagram_url && <span>Instagram: {venue.instagram_url}</span>}
            {venue.website && <span>Site: {venue.website}</span>}
            {venue.menu_url && <span>Cardápio: {venue.menu_url}</span>}
            {venue.reservation_url && <span>Reserva: {venue.reservation_url}</span>}
          </div>

          <div className="flex flex-col gap-4 border-t border-border pt-4">
            <TagList title="Tags" values={venue.tags} />
            <TagList title="Intenções" values={venue.intentions} />
            <TagList title="Companhias" values={venue.companions} />
            <TagList title="Destaques do cardápio" values={venue.menu_highlights} />
          </div>
        </div>
      </div>

      <div className="mt-8 rounded-2xl border border-border bg-background-elevated p-6">
        {published ? (
          <p className="text-sm text-foreground">Seu estabelecimento foi publicado com sucesso!</p>
        ) : (
          <>
            <p className="text-sm text-muted">
              Quando terminar de preencher os dados e as mídias, publique seu estabelecimento no
              Qual é a Boa.
            </p>
            {errorMessage && (
              <p className="mt-3 rounded-xl border border-red-400/40 bg-red-400/5 px-4 py-2 text-sm text-red-300">
                {errorMessage}
              </p>
            )}
            <button
              type="button"
              onClick={handlePublish}
              disabled={publishing}
              className={`mt-4 inline-flex items-center justify-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground transition-transform hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100 ${focusRing}`}
            >
              {publishing ? "Publicando estabelecimento..." : "Publicar estabelecimento"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
