"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { Venue } from "@/data/venues";
import { humanizeSlug } from "@/lib/format/humanize-slug";
import { formatRecommendationReason } from "@/lib/format/format-recommendation-reason";
import { useUser } from "@/lib/auth/auth-context";
import { trackInteraction } from "@/lib/analytics/track-interaction";
import { FavoriteButton } from "@/components/favorite-button";
import { BrandLogo } from "@/components/shared/brand-logo";
import { VenueRatingSummary, useVenueRatingSummary } from "./venue-rating-summary";
import { VenueReviewForm } from "./venue-review-form";
import {
  ATMOSPHERE_TAG_LABELS,
  COMPANION_TAG_LABELS,
  MOMENT_TAG_IDS,
  MOMENT_TAG_LABELS,
  type VenueMomentTag,
} from "@/lib/venues/venue-tags";
import {
  DAYS_OF_WEEK,
  DAY_LABELS,
  type VenueBusinessHour,
  type VenueHoursStatus,
} from "@/lib/venues/venue-hours";
import { VenueVideoPlayer } from "./venue-video-player";

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background";

/** Quando o local tem exatamente esta tag, o botão de WhatsApp reflete isso em vez do texto padrão. */
const PICKUP_ONLY_TAG = "Pedidos para retirada";

/** Quantidade de tags mostradas por padrão em "A vibe desse lugar" antes do "+N mais". */
const VIBE_PREVIEW_COUNT = 6;

function ArrowLeftIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 12H5M11 18l-6-6 6-6" />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      className="h-3.5 w-3.5 shrink-0"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 21s-6.5-5.6-6.5-11A6.5 6.5 0 0 1 18.5 10c0 5.4-6.5 11-6.5 11Z"
      />
      <circle cx="12" cy="10" r="2.25" />
    </svg>
  );
}

function VerifiedIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      className="h-3.5 w-3.5 shrink-0"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <path strokeLinecap="round" strokeLinejoin="round" d="m8.5 12.5 2.5 2.5 5-5" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      className="h-3.5 w-3.5 shrink-0"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="8.5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4.3l3 1.7" />
    </svg>
  );
}

function MapIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m9 4-5 2v14l5-2 6 2 5-2V4l-5 2-6-2Z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 4v14M15 6v14" />
    </svg>
  );
}

function WhatsAppIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.39 1.26 4.81L2 22l5.4-1.36a9.9 9.9 0 0 0 4.64 1.16h.01c5.46 0 9.91-4.45 9.91-9.91C21.96 6.45 17.5 2 12.04 2Zm0 18.02a8.1 8.1 0 0 1-4.14-1.13l-.3-.18-3.2.8.86-3.12-.19-.32a8.1 8.1 0 0 1-1.24-4.16c0-4.48 3.65-8.12 8.13-8.12 2.17 0 4.21.85 5.74 2.38a8.06 8.06 0 0 1 2.38 5.74c0 4.48-3.65 8.11-8.04 8.11Zm4.44-6.08c-.24-.12-1.44-.71-1.66-.79-.22-.08-.39-.12-.55.12-.16.24-.63.79-.78.95-.14.16-.28.18-.52.06-.24-.12-1.02-.38-1.94-1.2-.72-.64-1.2-1.43-1.35-1.67-.14-.24-.02-.37.11-.49.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.55-1.33-.76-1.82-.2-.48-.4-.42-.55-.42h-.47c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2s.86 2.32.98 2.48c.12.16 1.7 2.6 4.12 3.64.58.25 1.03.4 1.38.51.58.18 1.11.16 1.53.1.47-.07 1.44-.59 1.64-1.15.2-.57.2-1.05.14-1.15-.06-.1-.22-.16-.46-.28Z" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      className="h-4 w-4"
      aria-hidden="true"
    >
      <rect x="3.5" y="5" width="17" height="15" rx="2" />
      <path strokeLinecap="round" d="M8 3v4M16 3v4M3.5 10h17" />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M7 3h10a1 1 0 0 1 1 1v16l-3-2-2 2-2-2-2 2-3-2V4a1 1 0 0 1 1-1Z"
      />
      <path strokeLinecap="round" d="M9 8h6M9 11h6M9 14h4" />
    </svg>
  );
}

function SparkleIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      className="h-3.5 w-3.5 shrink-0"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 3v3M12 18v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M3 12h3M18 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"
      />
    </svg>
  );
}

/** Pills de destaque, reaproveitada por "A vibe desse lugar". */
function TagPillList({ items }: { items: string[] }) {
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {items.map((label) => (
        <span
          key={label}
          className="rounded-full border border-accent/30 bg-accent/5 px-3 py-1 text-xs font-medium text-accent"
        >
          {label}
        </span>
      ))}
    </div>
  );
}

function InfoIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      className="h-3.5 w-3.5 shrink-0"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="8.5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 11v5M12 8v.01" />
    </svg>
  );
}

export interface VenueMatch {
  /** Pontuação de 0 a 100, calculada pelo motor de afinidade em `/descobrir`. */
  score: number;
  reasons: string[];
}

interface VenueProfileProps {
  venue: Venue;
  /** Presente apenas quando o perfil é aberto a partir do fluxo de descoberta. */
  match?: VenueMatch;
  backLabel: string;
  /** Navegação client-side (usada dentro do fluxo de descoberta, sem recarregar a página). */
  onBack?: () => void;
  /**
   * Mantido por compatibilidade de props — não é mais usado para renderizar
   * um link interno. A rota direta `/lugares/[id]` já tem seu próprio
   * cabeçalho com link de volta; um segundo "voltar" aqui dentro só
   * duplicava a navegação. Sem `onBack`, nenhum botão de voltar é
   * renderizado por este componente.
   */
  backHref?: string;
  /** Só existe dentro do fluxo de descoberta, para refazer as respostas. */
  onRestart?: () => void;
  /** Mostra o CTA para iniciar o fluxo guiado, usado na rota direta. */
  showHelpCta?: boolean;
  /**
   * Horário estruturado (venue_business_hours), já buscado e calculado no
   * Server Component da rota `/lugares/[id]` — nunca calculado aqui no
   * client, para não arriscar hydration mismatch por "agora" divergir entre
   * servidor e navegador. `null`/ausente = venue sem horário estruturado
   * ainda: mantém o status antigo baseado em venue.openNow, sem quebrar.
   */
  businessHours?: VenueBusinessHour[] | null;
  hoursStatus?: VenueHoursStatus | null;
}

export function VenueProfile({
  venue,
  match,
  backLabel,
  onBack,
  onRestart,
  showHelpCta = false,
  businessHours = null,
  hoursStatus = null,
}: VenueProfileProps) {
  const user = useUser();
  const [coverFailed, setCoverFailed] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [showAllVibeTags, setShowAllVibeTags] = useState(false);
  // Buscado uma única vez aqui e reutilizado no resumo compacto (topo) e na
  // seção "Avaliações" (fim) — evita duas consultas iguais ao Supabase.
  const ratingSummary = useVenueRatingSummary(venue.venueId);

  // Best-effort: nunca bloqueia a navegação (o link abre normalmente mesmo
  // se isso falhar ou demorar) e nunca lança. Conta tanto usuário logado
  // quanto visitante anônimo — trackInteraction decide sozinho qual
  // identificador usar a partir de userId estar presente ou não.
  function trackBusinessClick(type: "whatsapp_click" | "route_click" | "reservation_click") {
    if (!venue.venueId) return;
    void trackInteraction({ userId: user?.id, venueId: venue.venueId, type });
  }

  const mapsHref = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    venue.address,
  )}`;
  // Normaliza removendo tudo que não é dígito (espaço, parênteses, hífen,
  // "+") — o dono pode ter digitado em qualquer formato, mas wa.me só
  // aceita dígitos. Sem número real, o link de WhatsApp não é montado — o
  // botão some (ver seção "Ações principais"), em vez de apontar para um
  // link quebrado.
  const normalizedWhatsappNumber = venue.whatsappNumber.replace(/\D/g, "");
  const hasValidWhatsapp = normalizedWhatsappNumber.length > 0;
  const whatsappHref = hasValidWhatsapp
    ? `https://wa.me/${normalizedWhatsappNumber}?text=${encodeURIComponent(
        `Olá! Vim pelo Qual é a Boa e gostaria de saber mais sobre o ${venue.name}.`,
      )}`
    : null;
  const whatsappLabel = venue.tags.includes(PICKUP_ONLY_TAG)
    ? PICKUP_ONLY_TAG
    : "Chamar no WhatsApp";
  // Labels corretos (com acento) vindos de venue-tags.ts — não usa
  // humanizeSlug() aqui. `tags` mistura tags livres com momentos; só os
  // ids que pertencem a MOMENT_TAG_GROUPS entram no grupo "momento" da
  // vibe, sem tocar PICKUP_ONLY_TAG nem a lógica de WhatsApp acima.
  const experienceLabels = venue.atmospheres
    .map((id) => ATMOSPHERE_TAG_LABELS[id])
    .filter((label): label is string => Boolean(label));
  const companionLabels = venue.companions
    .map((id) => COMPANION_TAG_LABELS[id])
    .filter((label): label is string => Boolean(label));
  const momentLabels = venue.tags
    .filter((tag): tag is VenueMomentTag => MOMENT_TAG_IDS.includes(tag as VenueMomentTag))
    .map((id) => MOMENT_TAG_LABELS[id])
    .filter((label): label is string => Boolean(label));
  // "A vibe desse lugar" mostra um único mural de tags em vez de três fichas
  // técnicas separadas — atmosfera, momento e companhia, nessa ordem, porque
  // é a ordem de "o que eu sinto → quando ir → com quem ir".
  const vibeTags = [...experienceLabels, ...momentLabels, ...companionLabels];
  const visibleVibeTags = showAllVibeTags ? vibeTags : vibeTags.slice(0, VIBE_PREVIEW_COUNT);
  const hasMoreVibeTags = vibeTags.length > VIBE_PREVIEW_COUNT;

  const verificationDate = venue.lastVerifiedAt ?? venue.updatedAt;
  const parsedVerificationDate = new Date(verificationDate);
  const formattedUpdatedAt = Number.isNaN(parsedVerificationDate.getTime())
    ? null
    : parsedVerificationDate.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      });

  // Mesma fonte de verdade usada na seção "Horários" mais abaixo: quando há
  // horário estruturado, o status vem de hoursStatus (calculado no server a
  // partir de venue_business_hours); sem isso, cai no venue.openNow antigo.
  // hoursStatus.label já cobre o vocabulário pedido para o hero ("Fecha às
  // X" / "Abre hoje às X" / "Abre amanhã às X" / "Fechado agora" / "Aberto
  // agora"), então o hero usa só essa frase — sem duplicar um segundo texto.
  const isOpenNow = businessHours && hoursStatus ? hoursStatus.isOpen : venue.openNow;
  const heroStatusLabel =
    businessHours && hoursStatus
      ? hoursStatus.label
      : venue.openNow
        ? "Aberto agora"
        : "Fechado no momento";

  const verificationMeta = (
    <p className="mt-3 flex items-center gap-2 text-xs text-muted">
      <InfoIcon />
      {formattedUpdatedAt
        ? `Informações verificadas em ${formattedUpdatedAt}`
        : "Data de verificação não informada"}{" "}
      · confiabilidade {venue.isDemo ? "demonstrativa " : ""}de {venue.dataConfidence}%.
    </p>
  );

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className={`mb-4 inline-flex items-center gap-2 text-sm font-medium text-muted transition-colors hover:text-accent ${focusRing} rounded`}
        >
          <ArrowLeftIcon />
          {backLabel}
        </button>
      )}

      {/* Hero — imagem/vídeo protagonista. Vídeo tem controles nativos (a
          barra de controles do <video> conflita com texto sobreposto), então
          fica em bloco próprio com um cabeçalho compacto logo abaixo, em vez
          do gradiente com texto por cima usado para foto/fallback. */}
      {venue.videoUrl ? (
        <section className="mt-2">
          <VenueVideoPlayer
            videoUrl={venue.videoUrl}
            venueName={venue.name}
            gradient={venue.gradient}
          />
          <div className="mt-4">
            {venue.isDemo && (
              <p className="mb-2 w-fit rounded-full border border-border px-3 py-1 text-xs text-muted">
                Dados demonstrativos
              </p>
            )}
            <div className="flex items-center gap-3">
              {venue.logoUrl && (
                <Image
                  src={venue.logoUrl}
                  alt={`Logotipo de ${venue.name}`}
                  width={48}
                  height={48}
                  className="h-12 w-12 shrink-0 rounded-full border border-border object-cover"
                />
              )}
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                  {venue.category}
                </p>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                  <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                    {venue.name}
                  </h1>
                  {venue.isVerified && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-accent/40 bg-accent/10 px-2.5 py-1 text-xs font-medium text-accent">
                      <VerifiedIcon />
                      Verificado pelo Qual é a Boa
                    </span>
                  )}
                </div>
              </div>
            </div>
            <p className="mt-2 flex items-center gap-2 text-sm">
              <span
                aria-hidden="true"
                className={`h-2 w-2 shrink-0 rounded-full ${isOpenNow ? "bg-emerald-400" : "bg-red-400"}`}
              />
              <span className="font-medium text-foreground">{heroStatusLabel}</span>
            </p>
          </div>
        </section>
      ) : (
        <section className="relative -mx-4 aspect-[4/5] overflow-hidden sm:mx-0 sm:aspect-[16/9] sm:rounded-3xl">
          {venue.coverImageUrl && !coverFailed ? (
            <Image
              src={venue.coverImageUrl}
              alt={`Foto de capa de ${venue.name}`}
              fill
              sizes="(min-width: 768px) 768px, 100vw"
              className="object-cover"
              priority
              onError={() => setCoverFailed(true)}
            />
          ) : (
            <div className={`absolute inset-0 bg-gradient-to-br ${venue.gradient}`}>
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -top-10 left-1/2 h-40 w-64 -translate-x-1/2 rounded-full bg-accent/25 blur-[80px]"
              />
              <div className="relative flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
                <BrandLogo variant="yellow" size="small" />
                <p className="text-sm font-semibold text-foreground">
                  Este lugar está preparando sua experiência visual.
                </p>
                <p className="text-xs text-foreground/70">
                  Em breve, fotos e vídeos reais deste estabelecimento.
                </p>
              </div>
            </div>
          )}
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-t from-black via-black/25 to-black/10"
          />

          {venue.isDemo && (
            <p className="absolute left-4 top-4 w-fit rounded-full border border-white/30 bg-black/40 px-3 py-1 text-xs text-white backdrop-blur sm:left-5 sm:top-5">
              Dados demonstrativos
            </p>
          )}

          <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
            <div className="flex items-center gap-3">
              {venue.logoUrl && (
                <Image
                  src={venue.logoUrl}
                  alt={`Logotipo de ${venue.name}`}
                  width={48}
                  height={48}
                  className="h-12 w-12 shrink-0 rounded-full border border-white/30 object-cover"
                />
              )}
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-accent">
                  {venue.category}
                </p>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                  <h1 className="text-2xl font-bold leading-tight text-white sm:text-3xl">
                    {venue.name}
                  </h1>
                  {venue.isVerified && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-accent/40 bg-black/40 px-2.5 py-1 text-xs font-medium text-accent backdrop-blur">
                      <VerifiedIcon />
                      Verificado
                    </span>
                  )}
                </div>
              </div>
            </div>
            <p className="mt-3 flex items-center gap-2 text-sm text-white/90">
              <span
                aria-hidden="true"
                className={`h-2 w-2 shrink-0 rounded-full ${isOpenNow ? "bg-emerald-400" : "bg-red-400"}`}
              />
              <span className="font-medium">{heroStatusLabel}</span>
            </p>
          </div>
        </section>
      )}

      {/* Resumo de decisão — só dados reais: preço médio quando existir,
          bairro, distância quando calculada, nota quando houver avaliação. */}
      <div className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-sm text-muted sm:mt-5">
        <span className="font-semibold text-foreground">{venue.priceRange}</span>
        {venue.averagePricePerPerson !== null && (
          <span>· R$ {venue.averagePricePerPerson} por pessoa</span>
        )}
        <span aria-hidden="true">·</span>
        <span className="inline-flex items-center gap-1">
          <PinIcon />
          {venue.neighborhood}
        </span>
        {venue.distanceKm !== null && (
          <>
            <span aria-hidden="true">·</span>
            <span>{venue.distanceKm.toFixed(1).replace(".", ",")} km</span>
          </>
        )}
        {venue.venueId && (
          <>
            <span aria-hidden="true">·</span>
            <VenueRatingSummary summary={ratingSummary} variant="compact" />
          </>
        )}
      </div>

      {/* Ações principais — logo depois do resumo, antes de qualquer texto
          longo: 1) WhatsApp, 2) Favoritar, 3) Reserva (se existir), 4) Ver
          cardápio (se existir menu_url), 5) Ver rota. Mesmo peso visual
          dourado entre as ações de contato — nenhuma delas é secundária.
          Empilhadas em coluna no mobile, lado a lado a partir de sm:. */}
      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        {whatsappHref && (
          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackBusinessClick("whatsapp_click")}
            className={`inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-accent px-5 py-3.5 text-sm font-semibold text-accent-foreground transition-all hover:scale-[1.02] hover:shadow-[0_0_28px_-8px_rgba(255,194,30,0.55)] sm:min-w-[45%] ${focusRing}`}
          >
            <WhatsAppIcon />
            {whatsappLabel}
          </a>
        )}
        <FavoriteButton venueId={venue.venueId} size="lg" />
        {venue.reservationUrl && (
          <a
            href={venue.reservationUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackBusinessClick("reservation_click")}
            className={`inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-accent bg-accent/10 px-5 py-3.5 text-sm font-semibold text-accent transition-all hover:bg-accent hover:text-accent-foreground hover:shadow-[0_0_28px_-8px_rgba(255,194,30,0.55)] sm:min-w-[45%] ${focusRing}`}
          >
            <CalendarIcon />
            Fazer reserva
          </a>
        )}
        {venue.menuUrl && (
          <a
            href={venue.menuUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-accent bg-accent/10 px-5 py-3.5 text-sm font-semibold text-accent transition-all hover:bg-accent hover:text-accent-foreground hover:shadow-[0_0_28px_-8px_rgba(255,194,30,0.55)] sm:min-w-[45%] ${focusRing}`}
          >
            <MenuIcon />
            Ver cardápio
          </a>
        )}
        <a
          href={mapsHref}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => trackBusinessClick("route_click")}
          className={`inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-accent px-5 py-3.5 text-sm font-semibold text-accent transition-all hover:bg-accent hover:text-accent-foreground hover:shadow-[0_0_28px_-8px_rgba(255,194,30,0.55)] sm:min-w-[45%] ${focusRing}`}
        >
          <MapIcon />
          Ver rota
        </a>
      </div>

      {/* A vibe desse lugar — atmosfera, momento e companhia num único mural
          de tags, em vez de três fichas técnicas separadas. Poucas tags por
          padrão; "+N mais" só aparece quando há mais do que cabe numa
          primeira leitura. */}
      {vibeTags.length > 0 && (
        <section className="mt-8">
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted">
            <SparkleIcon />A vibe desse lugar
          </h2>
          <TagPillList items={visibleVibeTags} />
          {hasMoreVibeTags && (
            <button
              type="button"
              onClick={() => setShowAllVibeTags((value) => !value)}
              className={`mt-2 text-xs font-medium text-accent transition-colors hover:underline ${focusRing} rounded`}
            >
              {showAllVibeTags ? "Mostrar menos" : `+${vibeTags.length - VIBE_PREVIEW_COUNT} mais`}
            </button>
          )}
        </section>
      )}

      {/* Por que combina com você — só existe vindo do fluxo de descoberta,
          onde há um score real calculado; sem isso, a seção não aparece
          (não inventamos motivo de match fora desse contexto). */}
      {match && (
        <section className="mt-8 rounded-2xl border border-accent/30 bg-accent/5 p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-accent">
              Por que combina com você
            </p>
            <span className="text-xl font-bold text-accent">{match.score}%</span>
          </div>
          <ul className="mt-3 flex flex-col gap-1.5 text-sm text-foreground">
            {match.reasons.map((reason) => (
              <li key={reason} className="flex items-start gap-2">
                <span
                  aria-hidden="true"
                  className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-accent"
                />
                {formatRecommendationReason(reason)}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Sobre o lugar — descrição curta, sem título de dashboard. */}
      <section className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
          Sobre o lugar
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-foreground sm:text-base">
          {venue.description}
        </p>
      </section>

      {/* Cardápio — destaques cadastrados; o link para o cardápio completo
          (menu_url) já está nas ações principais, no topo. */}
      {venue.menuHighlights.length > 0 && (
        <section className="mt-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Cardápio</h2>
          <ul className="mt-3 flex flex-col gap-1.5 text-sm text-foreground">
            {venue.menuHighlights.map((item) => (
              <li key={item} className="flex items-start gap-2">
                <span
                  aria-hidden="true"
                  className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-accent"
                />
                {humanizeSlug(item)}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Galeria — listada diretamente do Storage; só aparece quando há arquivos reais. */}
      {venue.galleryUrls && venue.galleryUrls.length > 0 && (
        <section className="mt-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Galeria</h2>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {venue.galleryUrls.map((url) => (
              <a
                key={url}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="relative aspect-square overflow-hidden rounded-xl"
              >
                <Image
                  src={url}
                  alt={`Foto da galeria de ${venue.name}`}
                  fill
                  sizes="(min-width: 640px) 25vw, 50vw"
                  className="object-cover"
                />
              </a>
            ))}
          </div>
        </section>
      )}

      {/* Horários — status resumido já está no hero; aqui entra a semana
          estruturada (quando existir) ou a programação em texto livre. */}
      {businessHours && hoursStatus ? (
        <>
          <section className="mt-8">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Horários</h2>
            <ul className="mt-3 flex flex-col gap-2">
              {DAYS_OF_WEEK.map((day) => {
                const hour = businessHours.find((item) => item.day_of_week === day);
                const isOpenDay = hour && !hour.is_closed && hour.opens_at && hour.closes_at;
                return (
                  <li
                    key={day}
                    className="flex items-center justify-between gap-2 text-sm text-foreground"
                  >
                    <span className="flex items-center gap-2">
                      <ClockIcon />
                      {DAY_LABELS[day]}
                    </span>
                    <span className="text-muted">
                      {isOpenDay
                        ? `${hour.opens_at!.slice(0, 5)} — ${hour.closes_at!.slice(0, 5)}`
                        : "Fechado"}
                    </span>
                  </li>
                );
              })}
            </ul>
            {verificationMeta}
          </section>

          {/* Informações adicionais — venues.schedule, texto livre complementar, não é mais o horário principal */}
          {venue.schedule.length > 0 && (
            <section className="mt-8">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
                Informações adicionais
              </h2>
              <ul className="mt-3 flex flex-col gap-2">
                {venue.schedule.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-foreground">
                    <ClockIcon />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      ) : (
        /* Programação — venue sem horário estruturado ainda, comportamento antigo intacto */
        <section className="mt-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
            Programação
          </h2>
          <ul className="mt-3 flex flex-col gap-2">
            {venue.schedule.map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm text-foreground">
                <ClockIcon />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          {verificationMeta}
        </section>
      )}

      {/* Como chegar — endereço completo (o resumo do topo só tem o bairro). */}
      <section className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Como chegar</h2>
        <p className="mt-2 flex items-start gap-2 text-sm text-foreground">
          <PinIcon />
          <span>
            {venue.address}
            <span className="block text-muted">
              {venue.neighborhood} · {venue.city}
            </span>
          </span>
        </p>
        <a
          href={mapsHref}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => trackBusinessClick("route_click")}
          className={`mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-accent transition-colors hover:underline ${focusRing} rounded`}
        >
          <MapIcon />
          Abrir no mapa
        </a>
      </section>

      {/* Avaliações — resumo público completo (variant default) sempre
          visível; formulário de escrita fica atrás de um link discreto, não
          exposto de cara, e só some para quem não está logado
          (VenueReviewForm cuida disso). Depende de public.reviews (028) —
          funciona com fallback gracioso se essa migration ainda não tiver
          sido aplicada. */}
      {venue.venueId && (
        <section className="mt-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Avaliações</h2>
          <div className="mt-3 flex flex-col gap-2">
            <VenueRatingSummary summary={ratingSummary} />
            {!showReviewForm ? (
              <button
                type="button"
                onClick={() => setShowReviewForm(true)}
                className={`w-fit text-sm text-accent transition-colors hover:underline ${focusRing} rounded`}
              >
                Avaliar este lugar
              </button>
            ) : (
              <VenueReviewForm venueId={venue.venueId} onSubmitted={() => setShowReviewForm(false)} />
            )}
          </div>
        </section>
      )}

      <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2">
        {onRestart && (
          <button
            type="button"
            onClick={onRestart}
            className={`text-sm font-medium text-muted underline-offset-4 transition-colors hover:text-accent hover:underline ${focusRing} rounded`}
          >
            Refazer escolha
          </button>
        )}
        {showHelpCta && (
          <Link
            href="/descobrir"
            className={`inline-flex items-center gap-2 rounded-full border border-border px-5 py-2 text-sm font-medium text-muted transition-colors hover:border-accent hover:text-accent ${focusRing}`}
          >
            Me ajude a escolher
          </Link>
        )}
      </div>
    </div>
  );
}
