import Link from "next/link";
import type { VenueOwnerRow } from "@/lib/venues/venue-owner";

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background";

/**
 * "Completar informações" combina descrição real e pelo menos um canal de
 * contato — não é uma coluna própria, só um critério sobre colunas que já
 * existem em public.venues.
 */
const MIN_DESCRIPTION_LENGTH = 40;

export interface OnboardingItem {
  key: string;
  label: string;
  done: boolean;
}

export interface OnboardingProgress {
  items: OnboardingItem[];
  completedCount: number;
  totalCount: number;
  percent: number;
  isComplete: boolean;
}

/**
 * Calculado sempre a partir de colunas reais de public.venues, nunca um
 * número fixo. "Enviar para análise" fica fora dessa conta de propósito:
 * não existe hoje nenhuma coluna de status que confirme isso (ver
 * PreviewEstabelecimentoPage) — incluir aqui seria fingir um dado que não
 * é persistido.
 */
export function getOnboardingProgress(venue: VenueOwnerRow): OnboardingProgress {
  const hasContact = Boolean(venue.whatsapp_number || venue.instagram_url || venue.website);

  const items: OnboardingItem[] = [
    { key: "cadastro", label: "Cadastro básico", done: true },
    {
      key: "experiencia",
      label: "Personalizar experiência",
      done: (venue.atmospheres?.length ?? 0) > 0 && (venue.companions?.length ?? 0) > 0,
    },
    { key: "fotos", label: "Adicionar fotos", done: Boolean(venue.cover_image_url) },
    { key: "video", label: "Adicionar vídeo", done: Boolean(venue.video_url) },
    {
      key: "informacoes",
      label: "Completar informações",
      done: venue.description.trim().length >= MIN_DESCRIPTION_LENGTH && hasContact,
    },
  ];

  const completedCount = items.filter((item) => item.done).length;
  const totalCount = items.length;

  return {
    items,
    completedCount,
    totalCount,
    percent: Math.round((completedCount / totalCount) * 100),
    isComplete: completedCount === totalCount,
  };
}

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      className="h-3.5 w-3.5"
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="m5 12 4.5 4.5L19 7" />
    </svg>
  );
}

const linkButtonBase = `rounded-full border border-border px-4 py-2 text-xs font-medium text-muted transition-colors hover:border-accent hover:text-accent ${focusRing}`;

interface OnboardingChecklistProps {
  venue: VenueOwnerRow;
  justCreated?: boolean;
}

export function OnboardingChecklist({ venue, justCreated = false }: OnboardingChecklistProps) {
  const progress = getOnboardingProgress(venue);

  return (
    <section className="overflow-hidden rounded-2xl border border-accent/40 bg-background-elevated p-6 shadow-[0_0_45px_-20px_rgba(255,194,30,0.45)] sm:p-8">
      <p className="text-xs font-semibold uppercase tracking-wide text-accent">
        {justCreated ? "Estabelecimento criado" : "Continue de onde parou"}
      </p>
      <h2 className="mt-2 text-xl font-bold tracking-tight text-foreground sm:text-2xl">
        {justCreated
          ? "Seu estabelecimento foi criado!"
          : `Falta pouco para ${venue.name} ficar completo`}
      </h2>
      <p className="mt-2 text-sm text-muted sm:text-base">
        Agora vamos deixar sua página completa para aparecer no Qual é a Boa.
      </p>

      <div className="mt-6">
        <div className="flex items-center justify-between text-xs text-muted sm:text-sm">
          <span>Progresso do perfil</span>
          <span className="font-semibold text-accent">{progress.percent}%</span>
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-border">
          <div
            className="h-full rounded-full bg-accent transition-all duration-500 ease-out"
            style={{ width: `${progress.percent}%` }}
          />
        </div>
      </div>

      <ul className="mt-6 flex flex-col gap-2">
        {progress.items.map((item) => (
          <li
            key={item.key}
            className={`flex items-center gap-3 rounded-xl border px-4 py-2.5 text-sm ${
              item.done
                ? "border-emerald-400/30 bg-emerald-400/5 text-emerald-300"
                : "border-border text-muted"
            }`}
          >
            <span
              aria-hidden="true"
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                item.done ? "border-emerald-400 bg-emerald-400/20" : "border-border"
              }`}
            >
              {item.done && <CheckIcon />}
            </span>
            {item.label}
          </li>
        ))}
      </ul>

      <div className="mt-6 flex flex-wrap gap-2">
        <Link href={`/empresa/painel/${venue.id}/midias`} className={linkButtonBase}>
          Adicionar fotos e vídeo
        </Link>
        <Link href={`/empresa/painel/${venue.id}/preview`} className={linkButtonBase}>
          Ver prévia e enviar para análise
        </Link>
      </div>
    </section>
  );
}
