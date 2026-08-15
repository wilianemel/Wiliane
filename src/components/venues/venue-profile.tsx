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
import { VenueRatingSummary } from "./venue-rating-summary";
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

function PeopleIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      className="h-3.5 w-3.5 shrink-0"
      aria-hidden="true"
    >
      <circle cx="9" cy="8" r="2.5" />
      <circle cx="16" cy="9" r="2" />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 19c0-2.8 2.2-5 5-5s5 2.2 5 5M13.5 14.3c2 .3 3.5 2 3.5 4.2"
      />
    </svg>
  );
}

/** Pills de destaque para as seções "A experiência" / "Combina com" / "Melhor momento". */
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
   * ainda: mantém o badge antigo baseado em venue.openNow, sem quebrar.
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
  // botão some (ver seção "Rota ou WhatsApp"), em vez de apontar para um
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
  // ids que pertencem a MOMENT_TAG_GROUPS entram na seção "Melhor momento",
  // sem tocar PICKUP_ONLY_TAG nem a lógica de WhatsApp acima.
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
  const verificationDate = venue.lastVerifiedAt ?? venue.updatedAt;
  const parsedVerificationDate = new Date(verificationDate);
  const formattedUpdatedAt = Number.isNaN(parsedVerificationDate.getTime())
    ? null
    : parsedVerificationDate.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      });

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className={`inline-flex items-center gap-2 text-sm font-medium text-muted transition-colors hover:text-accent ${focusRing} rounded`}
        >
          <ArrowLeftIcon />
          {backLabel}
        </button>
      )}

      {/* Vídeo e fotos — prioridade 1 no mobile: a pessoa vê o lugar antes de ler qualquer texto sobre ele. */}
      <section className="mt-6">
        {venue.videoUrl ? (
          <VenueVideoPlayer
            videoUrl={venue.videoUrl}
            venueName={venue.name}
            gradient={venue.gradient}
          />
        ) : venue.coverImageUrl && !coverFailed ? (
          <div className="relative aspect-video overflow-hidden rounded-2xl">
            <Image
              src={venue.coverImageUrl}
              alt={`Foto de capa de ${venue.name}`}
              fill
              sizes="(min-width: 768px) 768px, 100vw"
              className="object-cover"
              priority
              onError={() => setCoverFailed(true)}
            />
          </div>
        ) : (
          <div
            className={`relative flex aspect-video items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br ${venue.gradient}`}
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -top-10 left-1/2 h-40 w-64 -translate-x-1/2 rounded-full bg-accent/25 blur-[80px]"
            />
            <div className="relative flex flex-col items-center gap-3 px-6 text-center">
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
      </section>

      <header className="mt-6">
        {venue.isDemo && (
          <p className="mb-3 w-fit rounded-full border border-border px-3 py-1 text-xs text-muted">
            Dados demonstrativos para validação do MVP
          </p>
        )}
        <div className="flex items-center gap-3">
          {venue.logoUrl && (
            <Image
              src={venue.logoUrl}
              alt={`Logotipo de ${venue.name}`}
              width={56}
              height={56}
              className="h-14 w-14 shrink-0 rounded-full border border-border object-cover"
            />
          )}
          <div>
            <p className="text-sm text-muted">{venue.category}</p>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1.5">
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
        <p className="mt-1 flex flex-wrap items-center gap-x-2 text-sm text-muted">
          <span className="inline-flex items-center gap-1">
            <PinIcon />
            {venue.neighborhood} · {venue.city}
          </span>
          {venue.distanceKm !== null && (
            <>
              <span aria-hidden="true">·</span>
              <span>{venue.distanceKm.toFixed(1).replace(".", ",")} km</span>
            </>
          )}
        </p>
        <p className="mt-3 text-sm text-foreground sm:text-base">{venue.description}</p>
      </header>

      {/* Avaliações — resumo público sempre visível; formulário de escrita
          fica atrás de um link discreto, não exposto de cara, e só some
          para quem não está logado (VenueReviewForm cuida disso). Depende
          de public.reviews (028) — funciona com fallback gracioso se essa
          migration ainda não tiver sido aplicada. */}
      {venue.venueId && (
        <section className="mt-4 flex flex-col gap-2">
          <VenueRatingSummary venueId={venue.venueId} />
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
        </section>
      )}

      {/* Informações inteligentes coletadas no cadastro — "esse lugar combina comigo".
          Vem antes de "Motivos do match" de propósito: a sensação/experiência do
          lugar em si importa mais que o cálculo de compatibilidade. */}
      {experienceLabels.length > 0 && (
        <section className="mt-8">
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted">
            <SparkleIcon />
            A experiência
          </h2>
          <TagPillList items={experienceLabels} />
        </section>
      )}

      {/* Motivos do match — só existe vindo do fluxo de descoberta; é o "por que visitar". */}
      {match && (
        <section className="mt-8 rounded-xl border border-border/80 bg-background-elevated p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
              Motivos do match
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

      {companionLabels.length > 0 && (
        <section className="mt-8">
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted">
            <PeopleIcon />
            Combina com
          </h2>
          <TagPillList items={companionLabels} />
        </section>
      )}

      {momentLabels.length > 0 && (
        <section className="mt-8">
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted">
            <ClockIcon />
            Melhor momento
          </h2>
          <TagPillList items={momentLabels} />
        </section>
      )}

      {/* Cardápio e faixa de preço */}
      <section className="mt-8">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
            Cardápio e faixa de preço
          </h2>
          <span className="text-sm font-medium text-foreground">
            {venue.priceRange}
            {venue.averagePricePerPerson !== null && ` · média de R$ ${venue.averagePricePerPerson} por pessoa`}
          </span>
        </div>
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

      {/* Endereço — prioridade "localização", logo antes dos botões de contato */}
      <section className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
          Endereço
        </h2>
        <p className="mt-2 flex items-start gap-2 text-sm text-foreground">
          <PinIcon />
          {venue.address}
        </p>
      </section>

      {/* Ações principais — última etapa da vitrine, quando a decisão já foi
          formada: 1) WhatsApp, 2) Favoritar, 3) Reserva (se existir), 4) Ver
          rota. As três ações de contato têm o mesmo peso visual dourado —
          nenhuma delas deve parecer secundária. Empilhadas em coluna no
          mobile, lado a lado a partir de sm:. */}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
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

      {/* Galeria — listada diretamente do Storage; só aparece quando há arquivos reais. Detalhe complementar, depois do essencial. */}
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

      {businessHours && hoursStatus ? (
        <>
          {/* Horário e status calculado a partir de venue_business_hours */}
          <section className="mt-8 flex flex-col gap-2 rounded-xl border border-border/80 bg-background p-4 text-sm">
            <div className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className={`h-2 w-2 shrink-0 rounded-full ${
                  hoursStatus.isOpen ? "bg-emerald-400" : "bg-red-400"
                }`}
              />
              <span className="font-medium text-foreground">
                {hoursStatus.isOpen ? "Aberto agora" : "Fechado agora"}
              </span>
            </div>
            <p className="text-muted">{hoursStatus.label}</p>
            <p className="flex items-center gap-2 text-muted">
              <InfoIcon />
              {formattedUpdatedAt
                ? `Informações verificadas em ${formattedUpdatedAt}`
                : "Data de verificação não informada"}{" "}
              · confiabilidade {venue.isDemo ? "demonstrativa " : ""}de {venue.dataConfidence}%.
            </p>
          </section>

          {/* Horário de funcionamento (semanal) */}
          <section className="mt-8">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
              Horário de funcionamento
            </h2>
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
        <>
          {/* Programação — venue sem horário estruturado ainda, comportamento antigo intacto */}
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
          </section>

          {/* Horário e informações atualizadas */}
          <section className="mt-8 flex flex-col gap-2 rounded-xl border border-border/80 bg-background p-4 text-sm">
            <div className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className={`h-2 w-2 shrink-0 rounded-full ${
                  venue.openNow ? "bg-emerald-400" : "bg-red-400"
                }`}
              />
              <span className="font-medium text-foreground">
                {venue.openNow ? "Aberto agora" : "Fechado no momento"}
              </span>
            </div>
            <p className="flex items-center gap-2 text-muted">
              <InfoIcon />
              {formattedUpdatedAt
                ? `Informações verificadas em ${formattedUpdatedAt}`
                : "Data de verificação não informada"}{" "}
              · confiabilidade {venue.isDemo ? "demonstrativa " : ""}de {venue.dataConfidence}%.
            </p>
          </section>
        </>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2">
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
