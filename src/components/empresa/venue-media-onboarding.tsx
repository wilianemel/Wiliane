"use client";

import type { VenueOwnerRow } from "@/lib/venues/venue-owner";
import { SingleMediaSlot, GallerySlot } from "@/components/empresa/venue-media-slots";

interface VenueMediaOnboardingProps {
  venue: VenueOwnerRow;
  onVenueUpdated: () => void;
}

/**
 * Bloco de mídia dentro do fluxo principal de onboarding (`/empresa/painel`),
 * logo depois de `ExperienceQuestions` — antes ficava só acessível via link
 * para a página separada `/empresa/painel/[venueId]/midias`. Reusa os mesmos
 * slots de upload (`venue-media-slots.tsx`), sem duplicar lógica; a página
 * dedicada de mídias continua existindo para gestão contínua (inclusive
 * logo, que não faz parte deste bloco de onboarding).
 */
export function VenueMediaOnboarding({ venue, onVenueUpdated }: VenueMediaOnboardingProps) {
  return (
    <section className="rounded-2xl border border-border bg-background-elevated p-6 sm:p-8">
      <h2 className="text-lg font-semibold text-foreground sm:text-xl">
        Mostre seu estabelecimento
      </h2>
      <p className="mt-1 text-sm text-muted">
        Fotos e vídeo ajudam as pessoas a escolherem seu estabelecimento antes mesmo de chegar lá.
      </p>

      <div className="mt-6 flex flex-col gap-6">
        <SingleMediaSlot
          venueId={venue.id}
          folder="cover"
          kind="image"
          title="Capa"
          description="JPG, PNG, WebP ou HEIC/HEIF. Aparece nos cards e no topo da página do estabelecimento."
          currentUrl={venue.cover_image_url}
          urlColumn="cover_image_url"
          onVenueUpdated={onVenueUpdated}
        />

        <SingleMediaSlot
          venueId={venue.id}
          folder="video"
          kind="video"
          title="Vídeo"
          description="MP4, WebM ou HEVC/H.265, até 100 MB e 60 segundos. HEVC pode não reproduzir em todos os navegadores sem conversão. Nunca inicia automaticamente com som na página pública."
          currentUrl={venue.video_url}
          urlColumn="video_url"
          onVenueUpdated={onVenueUpdated}
        />

        <GallerySlot venueId={venue.id} />
      </div>
    </section>
  );
}
