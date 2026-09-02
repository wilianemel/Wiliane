"use client";

import { useState } from "react";
import Image from "next/image";
import type { Venue } from "@/data/venues";

/**
 * Imagem de capa de um estabelecimento, com fallback elegante quando não há
 * `coverImageUrl` real cadastrada (ou quando a URL cadastrada falha ao
 * carregar — link quebrado, arquivo removido do Storage etc.) — gradiente
 * de marca + textura sutil + um ícone de categoria (nunca as iniciais do
 * nome gigantes no centro, que em teste real parecia protótipo/placeholder
 * quebrado). O nome e a categoria do local já aparecem como texto normal em
 * todo lugar que usa este componente, então o fallback não precisa
 * duplicá-los como texto — só precisa parecer uma identidade visual de
 * marca, nunca uma foto real (nenhuma fotografia é inventada aqui).
 *
 * "use client" só por causa do onError da imagem (precisa de estado para
 * saber quando cair no fallback); não muda nada do que os componentes
 * server que renderizam isto fazem.
 *
 * O container (via `className`) precisa definir altura/aspect-ratio e
 * `relative` já vem embutido — só falta o chamador passar `h-36`,
 * `aspect-video` etc.
 */

interface VenueCoverImageProps {
  venue: Pick<Venue, "coverImageUrl" | "gradient" | "name" | "logoUrl"> &
    Partial<Pick<Venue, "category">>;
  className?: string;
  /** Obrigatório para o Next.js otimizar corretamente o tamanho servido da imagem. */
  sizes: string;
  priority?: boolean;
}

type CategoryIconKind = "food" | "drink" | "cafe" | "event" | "leisure" | "generic";

/** Combinação por palavra-chave — cobre as VENUE_CATEGORIES e categorias livres/"Outros" com um ícone plausível, sem inventar dado nenhum. */
function categoryIconKind(category?: string): CategoryIconKind {
  if (!category) return "generic";
  const value = category.toLowerCase();
  if (/(bar|pub|adega|vinho|drink|rooftop)/.test(value)) return "drink";
  if (/(evento|show|balada)/.test(value)) return "event";
  if (/(caf[eé]|padaria|doce|sorvete)/.test(value)) return "cafe";
  if (/(parque|lazer)/.test(value)) return "leisure";
  if (/(restaurante|pizza|hambur|lanch|churrasc)/.test(value)) return "food";
  return "generic";
}

function ForkKnifeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-5 w-5" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 3v6a2 2 0 0 0 4 0V3M9 9v12M17 3c-1.6 0-2.5 1.7-2.5 4.5S15.4 12 17 12v9" />
    </svg>
  );
}

function GlassIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-5 w-5" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 4h14l-6.3 7.6v6.6M12 18.2H8.3M12 18.2h3.7" />
    </svg>
  );
}

function CupIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-5 w-5" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 9h11v6a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4V9Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 10.5h1.3a2.3 2.3 0 0 1 0 4.6H16" />
      <path strokeLinecap="round" d="M8 5.5c0-1 .8-1 .8-2M12 5.5c0-1 .8-1 .8-2" />
    </svg>
  );
}

function MusicNoteIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-5 w-5" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 18V5l10-2v13" />
      <circle cx="7" cy="18" r="2.2" />
      <circle cx="17" cy="16" r="2.2" />
    </svg>
  );
}

function LeafIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-5 w-5" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 20c8 0 12-4 12-12 0-1 0-2-.3-3C10 5.3 6 9 6 16c0 1.4.2 2.8.5 4Z" />
      <path strokeLinecap="round" d="M7 19c3-3 6-7 11-13" />
    </svg>
  );
}

function SparkleIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-5 w-5" aria-hidden="true">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 3v3M12 18v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M3 12h3M18 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"
      />
    </svg>
  );
}

const CATEGORY_ICONS: Record<CategoryIconKind, () => React.ReactNode> = {
  food: ForkKnifeIcon,
  drink: GlassIcon,
  cafe: CupIcon,
  event: MusicNoteIcon,
  leisure: LeafIcon,
  generic: SparkleIcon,
};

export function VenueCoverImage({
  venue,
  className = "",
  sizes,
  priority = false,
}: VenueCoverImageProps) {
  const [coverFailed, setCoverFailed] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);

  if (venue.coverImageUrl && !coverFailed) {
    return (
      <div className={`relative overflow-hidden ${className}`}>
        <Image
          src={venue.coverImageUrl}
          alt={`Foto de ${venue.name}`}
          fill
          sizes={sizes}
          priority={priority}
          className="object-cover"
          onError={() => setCoverFailed(true)}
        />
      </div>
    );
  }

  const CategoryIcon = CATEGORY_ICONS[categoryIconKind(venue.category)];

  return (
    <div
      className={`relative overflow-hidden bg-gradient-to-br ${venue.gradient} ${className}`}
    >
      <div
        aria-hidden="true"
        className="absolute -left-6 -top-8 h-28 w-28 rounded-full bg-white/10 blur-2xl"
      />
      <div
        aria-hidden="true"
        className="absolute -bottom-10 -right-4 h-32 w-32 rounded-full bg-black/30 blur-2xl"
      />
      {/* Sheen diagonal sutil — reforça a sensação "identidade visual premium", não foto vazia. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.04] to-white/[0.08]"
      />

      {venue.logoUrl && !logoFailed ? (
        <div aria-hidden="true" className="absolute inset-0 flex items-center justify-center p-6">
          <Image
            src={venue.logoUrl}
            alt=""
            width={72}
            height={72}
            className="max-h-16 max-w-16 object-contain opacity-90"
            onError={() => setLogoFailed(true)}
          />
        </div>
      ) : (
        <div aria-hidden="true" className="absolute inset-0 flex items-center justify-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white/75 backdrop-blur-sm">
            <CategoryIcon />
          </span>
        </div>
      )}
    </div>
  );
}
