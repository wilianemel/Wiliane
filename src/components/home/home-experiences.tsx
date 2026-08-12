import Link from "next/link";
import type { Venue } from "@/data/venues";
import { VenueCoverImage } from "@/components/shared/venue-cover-image";

/** Vitrine "Netflix" — mais itens que os cards de FeaturedVenues (que ficam num grid mais abaixo). */
const MAX_EXPERIENCES_SHOWN = 8;
const MAX_EMOTIONAL_TAGS = 3;

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background";

interface EmotionalTag {
  emoji: string;
  label: string;
}

/**
 * Tags emocionais derivadas só de campos reais do venue (musicStyles, tags,
 * atmospheres, intentions, category) — nunca texto inventado por local.
 * Ordem de prioridade fixa; para assim que junta MAX_EMOTIONAL_TAGS.
 */
function buildEmotionalTags(venue: Venue): EmotionalTag[] {
  const { atmospheres, intentions, musicStyles, tags, category } = venue;
  const haystack = [category, ...tags].join(" ").toLowerCase();
  const found: EmotionalTag[] = [];

  const add = (emoji: string, label: string) => {
    if (found.length < MAX_EMOTIONAL_TAGS && !found.some((tag) => tag.label === label)) {
      found.push({ emoji, label });
    }
  };

  if (
    musicStyles.length > 0 ||
    atmospheres.includes("musica-ao-vivo") ||
    intentions.includes("musica-ao-vivo")
  ) {
    add("🎸", "Música");
  }
  if (/bar|drink|coquet|chopp|cervej|rooftop/.test(haystack)) {
    add("🍹", "Drinks");
  }
  if (haystack.includes("vista") || haystack.includes("rooftop") || haystack.includes("por-do-sol")) {
    add("🌅", "Pôr do sol");
  }
  if (atmospheres.includes("romantico") || atmospheres.includes("intimista")) {
    add("🍷", "Romântico");
  }
  if (atmospheres.includes("tranquilo") || atmospheres.includes("aconchegante")) {
    add("🌿", "Tranquilo");
  }
  if (intentions.includes("amigos") || atmospheres.includes("badalado") || atmospheres.includes("animado")) {
    add("🎉", "Animado");
  }
  if (intentions.includes("familia") || atmospheres.includes("familiar")) {
    add("👨‍👩‍👧", "Família");
  }

  return found;
}

/**
 * Frase curta só a partir de sinais reais do venue (atmospheres/intentions)
 * — nunca texto inventado por local. Cai num fallback neutro com a
 * categoria real quando nenhum sinal mais específico é encontrado.
 */
function buildExperiencePhrase(venue: Venue): string {
  const { atmospheres, intentions, category } = venue;

  if (atmospheres.includes("romantico")) return "Perfeito para um encontro especial";
  if (intentions.includes("comemorar")) return "Perfeito para comemorar";
  if (intentions.includes("musica-ao-vivo") || atmospheres.includes("musica-ao-vivo")) {
    return "Perfeito para uma noite diferente";
  }
  if (
    intentions.includes("amigos") ||
    atmospheres.includes("badalado") ||
    atmospheres.includes("animado")
  ) {
    return "Ideal para reunir a turma";
  }
  if (intentions.includes("familia") || atmospheres.includes("familiar")) {
    return "Ótimo para levar a família";
  }
  if (atmospheres.includes("tranquilo") || atmospheres.includes("aconchegante")) {
    return "Ideal para desacelerar";
  }
  return `Combina com quem curte ${category.toLowerCase()}`;
}

function ExperienceCard({ venue }: { venue: Venue }) {
  const emotionalTags = buildEmotionalTags(venue);
  const phrase = buildExperiencePhrase(venue);

  return (
    <Link
      href={`/lugares/${venue.id}`}
      className={`group relative block h-72 w-52 shrink-0 snap-start overflow-hidden rounded-2xl shadow-lg shadow-black/40 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_18px_40px_-12px_rgba(255,194,30,0.35)] sm:h-80 sm:w-60 ${focusRing}`}
    >
      <VenueCoverImage
        venue={venue}
        className="h-full w-full transition-transform duration-300 group-hover:scale-105"
        sizes="(min-width: 640px) 240px, 208px"
      />

      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/55 to-transparent p-4 pt-14">
        <p className="line-clamp-2 text-sm font-semibold text-white">{venue.name}</p>

        {emotionalTags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {emotionalTags.map((tag) => (
              <span
                key={tag.label}
                className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-[11px] text-white"
              >
                <span aria-hidden="true">{tag.emoji}</span>
                {tag.label}
              </span>
            ))}
          </div>
        )}

        <p className="line-clamp-1 mt-2 text-xs italic text-white/80">{phrase}</p>
      </div>
    </Link>
  );
}

export function HomeExperiences({ venues }: { venues: Venue[] }) {
  const displayedVenues = venues.slice(0, MAX_EXPERIENCES_SHOWN);

  return (
    <section className="border-b border-border/60">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
        <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-3xl">
          Lugares que combinam com sua vibe
        </h2>
        <p className="mt-1 text-sm text-muted sm:text-base">
          Selecionados para o seu momento — não uma lista genérica.
        </p>

        {displayedVenues.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-border bg-background-elevated p-8 text-center text-sm text-muted">
            Nenhuma experiência publicada no momento. Volte em breve para descobrir novas opções.
          </div>
        ) : (
          <div className="animate-fade-up -mx-4 mt-6 flex gap-4 overflow-x-auto px-4 pb-4 snap-x snap-mandatory sm:mx-0 sm:px-0">
            {displayedVenues.map((venue) => (
              <ExperienceCard key={venue.id} venue={venue} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
