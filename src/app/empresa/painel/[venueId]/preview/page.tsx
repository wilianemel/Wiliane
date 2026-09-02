"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { VenueAccessGate } from "@/components/empresa/venue-access-gate";
import type { VenueOwnerRow } from "@/lib/venues/venue-owner";
import {
  listVenueMedia,
  resolveFeaturedMediaUrl,
  resolveVenueMainImageUrl,
  type VenueMediaListItem,
} from "@/lib/venues/venue-media";
import { getVenueBusinessHours } from "@/lib/venues/venue-hours";
import {
  computePublishChecklist,
  isHoursComplete,
  missingChecklistLabels,
} from "@/lib/venues/venue-publish-checklist";

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
  const [checklistLoading, setChecklistLoading] = useState(true);
  const [hasActiveVideo, setHasActiveVideo] = useState(false);
  const [hoursOk, setHoursOk] = useState(false);
  const [mainImageUrl, setMainImageUrl] = useState<string | undefined>(venue.cover_image_url ?? undefined);
  const [heroVideoUrl, setHeroVideoUrl] = useState<string | undefined>(venue.video_url ?? undefined);
  const [galleryImages, setGalleryImages] = useState<VenueMediaListItem[]>([]);

  // Mesma checklist completa usada em complete_new_venue_onboarding() —
  // CORREÇÃO: esta tela chamava publish_owned_venue direto, cuja validação
  // antiga era mais fraca que a nova (permitia publicar sem horário/vídeo/
  // WhatsApp). Agora mostra o que falta e só habilita o botão quando tudo
  // estiver completo, além da RPC revalidar tudo de novo no banco.
  useEffect(() => {
    let active = true;

    async function load() {
      const [images, videos, hours] = await Promise.all([
        listVenueMedia(venue.id, "image"),
        listVenueMedia(venue.id, "video"),
        getVenueBusinessHours(venue.id),
      ]);
      if (!active) return;

      setGalleryImages(images);
      setMainImageUrl(resolveVenueMainImageUrl(images, venue.cover_image_url));
      setHeroVideoUrl(resolveFeaturedMediaUrl(videos, "video", venue.video_url));
      setHasActiveVideo(videos.length > 0);
      setHoursOk(
        isHoursComplete(
          (hours ?? []).map((hour) => ({
            isClosed: hour.is_closed,
            opensAt: hour.opens_at,
            closesAt: hour.closes_at,
          })),
        ),
      );
      setChecklistLoading(false);
    }

    load();
    return () => {
      active = false;
    };
  }, [venue.id, venue.cover_image_url, venue.video_url]);

  const checklist = computePublishChecklist({
    name: venue.name,
    category: venue.category,
    description: venue.description,
    city: venue.city,
    neighborhood: venue.neighborhood,
    address: venue.address,
    priceRange: venue.price_range,
    averagePricePerPerson: venue.average_price_per_person,
    whatsappNumber: venue.whatsapp_number,
    whatsapp: venue.whatsapp,
    whatsappUrl: venue.whatsapp_url,
    atmospheres: venue.atmospheres,
    intentions: venue.intentions,
    companions: venue.companions,
    hoursOk,
    hasActiveVideo,
  });
  const missingLabels = missingChecklistLabels(checklist);
  const canPublish = checklist.complete && !checklistLoading;

  async function handlePublish() {
    if (!canPublish || publishing) return;
    setPublishing(true);
    setErrorMessage(null);

    const supabase = createClient();
    const { error } = await supabase.rpc("complete_new_venue_onboarding", {
      p_venue_id: venue.id,
    });

    if (error) {
      console.error("COMPLETE NEW VENUE ONBOARDING ERROR:", error);
      setErrorMessage(
        error.message.includes("incompleto") || error.message.includes("obrigat")
          ? error.message
          : "Não foi possível publicar agora. Tente novamente.",
      );
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
        {/* Vídeo ativo tem prioridade sobre foto; sem vídeo, cai pra primeira
            foto ativa da galeria (resolveVenueMainImageUrl). Nunca exige
            capa — sem nenhuma mídia, simplesmente não mostra nada aqui
            (nenhum placeholder de "área reservada"). */}
        {heroVideoUrl ? (
          <div className="relative aspect-[9/16] w-full bg-black">
            <video src={heroVideoUrl} controls muted className="h-full w-full object-cover" />
          </div>
        ) : mainImageUrl ? (
          <div className="relative aspect-[9/16] w-full">
            <Image
              src={mainImageUrl}
              alt={`Foto de ${venue.name}`}
              fill
              sizes="700px"
              className="object-cover"
            />
          </div>
        ) : null}

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

      {/* Galeria — mesmos dados reais de venue_media já usados no perfil
          público e no painel de mídias; só aparece quando há foto ativa. */}
      {galleryImages.length > 0 && (
        <section className="mt-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Galeria</h2>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {galleryImages.map((item) => (
              <div
                key={item.id}
                className="relative aspect-[9/16] overflow-hidden rounded-xl border border-border"
              >
                <Image
                  src={item.url}
                  alt={`Foto de ${venue.name}`}
                  fill
                  sizes="200px"
                  className="object-cover"
                />
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="mt-8 rounded-2xl border border-border bg-background-elevated p-6">
        {published ? (
          <p className="text-sm text-foreground">Seu estabelecimento foi publicado com sucesso!</p>
        ) : (
          <>
            <p className="text-sm text-muted">
              Quando terminar de preencher os dados e as mídias, publique seu estabelecimento no
              Bora pra onde.
            </p>
            {!checklistLoading && !checklist.complete && (
              <p className="mt-3 text-xs text-muted">Falta: {missingLabels.join(", ")}.</p>
            )}
            {errorMessage && (
              <p className="mt-3 rounded-xl border border-red-400/40 bg-red-400/5 px-4 py-2 text-sm text-red-300">
                {errorMessage}
              </p>
            )}
            <button
              type="button"
              onClick={handlePublish}
              disabled={publishing || !canPublish}
              className={`mt-4 inline-flex items-center justify-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground transition-transform hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100 ${focusRing}`}
            >
              {publishing ? "Publicando estabelecimento..." : "Concluir cadastro e publicar"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
