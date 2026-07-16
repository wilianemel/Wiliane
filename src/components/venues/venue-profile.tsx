import Link from "next/link";
import type { Venue } from "@/data/venues";

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background";

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

function PlayIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className="h-6 w-6"
      aria-hidden="true"
    >
      <path d="M8 5v14l11-7-11-7Z" />
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
  /** Navegação por link (usada na rota direta `/lugares/[id]`). */
  backHref?: string;
  /** Só existe dentro do fluxo de descoberta, para refazer as respostas. */
  onRestart?: () => void;
  /** Mostra o CTA para iniciar o fluxo guiado, usado na rota direta. */
  showHelpCta?: boolean;
}

export function VenueProfile({
  venue,
  match,
  backLabel,
  onBack,
  backHref,
  onRestart,
  showHelpCta = false,
}: VenueProfileProps) {
  const mapsHref = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    venue.address,
  )}`;
  const whatsappHref = `https://wa.me/${venue.whatsappNumber}?text=${encodeURIComponent(
    `Olá! Vim pelo Qual é a Boa e gostaria de saber mais sobre o ${venue.name}.`,
  )}`;
  const formattedUpdatedAt = new Date(`${venue.updatedAt}T00:00:00`).toLocaleDateString(
    "pt-BR",
    { day: "2-digit", month: "long", year: "numeric" },
  );

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          className={`inline-flex items-center gap-2 text-sm font-medium text-muted transition-colors hover:text-accent ${focusRing} rounded`}
        >
          <ArrowLeftIcon />
          {backLabel}
        </button>
      ) : (
        <Link
          href={backHref ?? "/"}
          className={`inline-flex items-center gap-2 text-sm font-medium text-muted transition-colors hover:text-accent ${focusRing} rounded`}
        >
          <ArrowLeftIcon />
          {backLabel}
        </Link>
      )}

      <header className="mt-6">
        <p className="text-sm text-muted">{venue.category}</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          {venue.name}
        </h1>
        <p className="mt-1 flex flex-wrap items-center gap-x-2 text-sm text-muted">
          <span className="inline-flex items-center gap-1">
            <PinIcon />
            {venue.neighborhood} · {venue.city}
          </span>
          <span aria-hidden="true">·</span>
          <span>{venue.distanceKm.toFixed(1).replace(".", ",")} km</span>
        </p>
        <p className="mt-3 text-sm text-foreground sm:text-base">{venue.description}</p>
      </header>

      {/* Vídeo e fotos */}
      <section className="mt-8">
        <div
          className={`flex aspect-video items-center justify-center rounded-2xl bg-gradient-to-br ${venue.gradient}`}
        >
          <div className="flex flex-col items-center gap-2 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-background/40 text-foreground">
              <PlayIcon />
            </span>
            <p className="px-4 text-xs text-foreground/80">
              Vídeo e fotos reais deste local chegam em breve.
            </p>
          </div>
        </div>
      </section>

      {/* Motivos do match — só existe vindo do fluxo de descoberta */}
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
                {reason}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Cardápio e faixa de preço */}
      <section className="mt-8">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
            Cardápio e faixa de preço
          </h2>
          <span className="text-sm font-medium text-foreground">
            {venue.priceRange} · média de R$ {venue.averagePricePerPerson} por pessoa
          </span>
        </div>
        <ul className="mt-3 flex flex-col gap-1.5 text-sm text-foreground">
          {venue.menuHighlights.map((item) => (
            <li key={item} className="flex items-start gap-2">
              <span
                aria-hidden="true"
                className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-accent"
              />
              {item}
            </li>
          ))}
        </ul>
      </section>

      {/* Programação */}
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
          Informações atualizadas em {formattedUpdatedAt} · confiabilidade demonstrativa
          de {venue.dataConfidence}%.
        </p>
      </section>

      {/* Endereço */}
      <section className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
          Endereço
        </h2>
        <p className="mt-2 flex items-start gap-2 text-sm text-foreground">
          <PinIcon />
          {venue.address}
        </p>
      </section>

      {/* Rota ou WhatsApp */}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <a
          href={mapsHref}
          target="_blank"
          rel="noopener noreferrer"
          className={`inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-accent px-5 py-3 text-sm font-semibold text-accent transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
        >
          <MapIcon />
          Ver rota
        </a>
        <a
          href={whatsappHref}
          target="_blank"
          rel="noopener noreferrer"
          className={`inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-accent px-5 py-3 text-sm font-semibold text-accent-foreground transition-transform hover:scale-[1.02] ${focusRing}`}
        >
          <WhatsAppIcon />
          Chamar no WhatsApp
        </a>
      </div>

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
