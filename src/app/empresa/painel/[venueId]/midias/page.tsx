"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { VenueAccessGate } from "@/components/empresa/venue-access-gate";
import type { VenueOwnerRow } from "@/lib/venues/venue-owner";
import { SingleMediaSlot, GallerySlot } from "@/components/empresa/venue-media-slots";
import { VenueVideoLibrary } from "@/components/empresa/venue-video-library";

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background";

export default function MidiasEstabelecimentoPage() {
  const params = useParams<{ venueId: string }>();
  const venueId = params.venueId;

  return (
    <VenueAccessGate venueId={venueId}>
      {(venue, _role, reload) => <MidiasContent venue={venue} onVenueUpdated={reload} />}
    </VenueAccessGate>
  );
}

function MidiasContent({
  venue,
  onVenueUpdated,
}: {
  venue: VenueOwnerRow;
  onVenueUpdated: () => void;
}) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-14">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Fotos e vídeo — {venue.name}
        </h1>
        <Link
          href="/empresa/painel"
          className={`rounded-full border border-border px-4 py-2 text-sm font-medium text-muted transition-colors hover:border-accent hover:text-accent ${focusRing}`}
        >
          Voltar ao painel
        </Link>
      </div>

      <div className="mt-6 rounded-2xl border border-accent/30 bg-background-elevated p-5">
        <p className="text-sm font-semibold text-foreground">Mostre sua experiência</p>
        <p className="mt-1 text-sm text-muted">
          Fotos e vídeos ajudam as pessoas a escolherem seu estabelecimento. Capa, logo e vídeo
          têm um espaço fixo cada; a quantidade de fotos na galeria e de vídeos depende do seu
          plano atual.
        </p>
      </div>

      <div className="mt-8 flex flex-col gap-8">
        <SingleMediaSlot
          venueId={venue.id}
          folder="cover"
          kind="image"
          title="Capa"
          description="JPG, PNG ou WebP. Aparece nos cards e no topo da página do estabelecimento."
          currentUrl={venue.cover_image_url}
          urlColumn="cover_image_url"
          onVenueUpdated={onVenueUpdated}
        />

        <SingleMediaSlot
          venueId={venue.id}
          folder="logo"
          kind="image"
          title="Logo"
          description="JPG, PNG ou WebP. Aparece ao lado do nome na página do estabelecimento."
          currentUrl={venue.logo_url}
          urlColumn="logo_url"
          onVenueUpdated={onVenueUpdated}
        />

        <VenueVideoLibrary venueId={venue.id} />

        <GallerySlot venueId={venue.id} />
      </div>
    </div>
  );
}
