"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { listVenueMedia } from "@/lib/venues/venue-media";
import { getVenueBusinessHours } from "@/lib/venues/venue-hours";
import type { VenueOwnerRow } from "@/lib/venues/venue-owner";
import {
  computePublishChecklist,
  isHoursComplete,
  missingChecklistLabels,
  PUBLISH_CHECKLIST_LABELS,
  type PublishChecklistResult,
} from "@/lib/venues/venue-publish-checklist";

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background";

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

type ChecklistKey = Exclude<keyof PublishChecklistResult, "complete">;

interface ChecklistItemConfig {
  href: (venueId: string) => string;
  ariaLabelPending: string;
  ariaLabelDone: string;
}

/**
 * Destino de cada item — leva direto ao campo que falta, com âncora
 * (#dados-basicos, #categoria-experiencia, #horarios, #contato, #video)
 * pra editar/midias já rolarem até a seção certa (ver useScrollToHash e os
 * ids correspondentes nessas duas telas). Item já completo continua
 * clicável, com o mesmo destino — só muda pra "Editar".
 */
const CHECKLIST_ITEM_CONFIG: Record<ChecklistKey, ChecklistItemConfig> = {
  basicData: {
    href: (venueId) => `/empresa/painel/${venueId}/editar#dados-basicos`,
    ariaLabelPending: "Preencher dados básicos",
    ariaLabelDone: "Editar dados básicos",
  },
  categoryExperience: {
    href: (venueId) => `/empresa/painel/${venueId}/editar#categoria-experiencia`,
    ariaLabelPending: "Preencher categoria e experiência",
    ariaLabelDone: "Editar categoria e experiência",
  },
  hours: {
    href: (venueId) => `/empresa/painel/${venueId}/editar#horarios`,
    ariaLabelPending: "Preencher horários",
    ariaLabelDone: "Editar horários",
  },
  video: {
    href: (venueId) => `/empresa/painel/${venueId}/midias#video`,
    ariaLabelPending: "Adicionar vídeo",
    ariaLabelDone: "Editar vídeo",
  },
  contact: {
    href: (venueId) => `/empresa/painel/${venueId}/editar#contato`,
    ariaLabelPending: "Preencher contato",
    ariaLabelDone: "Editar contato",
  },
};

type PublishStatus = "idle" | "publishing" | "error";
type MediaCheckState = { loading: boolean; hasActiveVideo: boolean; hoursOk: boolean };

interface OnboardingChecklistProps {
  venue: VenueOwnerRow;
  justCreated?: boolean;
  /** Chamado depois de publicar com sucesso, para o painel recarregar os dados do venue. */
  onPublished?: () => void;
}

/**
 * Checklist de publicação do estabelecimento novo (Fluxo 2) — mesma regra
 * de complete_new_venue_onboarding() no banco (_venue_publish_checklist,
 * via src/lib/venues/venue-publish-checklist.ts), pra nunca divergir entre
 * tela e RPC. "Horário preenchido" e "vídeo ativo" dependem de consultas
 * assíncronas (venue_business_hours/venue_media), por isso chegam via
 * estado carregado em efeito, começando "false" até resolver (nunca
 * superestima o progresso enquanto carrega).
 */
export function OnboardingChecklist({ venue, justCreated = false, onPublished }: OnboardingChecklistProps) {
  const [mediaCheck, setMediaCheck] = useState<MediaCheckState>({
    loading: true,
    hasActiveVideo: false,
    hoursOk: false,
  });
  const [publishStatus, setPublishStatus] = useState<PublishStatus>("idle");
  const [publishError, setPublishError] = useState<string | null>(null);
  const [justPublished, setJustPublished] = useState(false);

  useEffect(() => {
    let active = true;

    async function load() {
      const [videos, hours] = await Promise.all([
        listVenueMedia(venue.id, "video"),
        getVenueBusinessHours(venue.id),
      ]);

      if (!active) return;

      // getVenueBusinessHours sempre devolve as 7 linhas (fallback fechado
      // para qualquer dia sem linha real) — isHoursComplete exige pelo
      // menos um dia realmente aberto, então "nunca configurado" (0 linhas
      // reais, os 7 fallbacks fechados) já reprova sozinho, sem precisar
      // de uma contagem crua separada.
      const hoursOk = isHoursComplete(
        (hours ?? []).map((hour) => ({
          isClosed: hour.is_closed,
          opensAt: hour.opens_at,
          closesAt: hour.closes_at,
        })),
      );

      setMediaCheck({
        loading: false,
        hasActiveVideo: videos.length > 0,
        hoursOk,
      });
    }

    load();
    return () => {
      active = false;
    };
  }, [venue.id]);

  const checklist: PublishChecklistResult = computePublishChecklist({
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
    hoursOk: mediaCheck.hoursOk,
    hasActiveVideo: mediaCheck.hasActiveVideo,
  });
  const missingLabels = missingChecklistLabels(checklist);
  const isPublished = venue.is_published || justPublished;
  const canPublish = checklist.complete && !mediaCheck.loading;

  async function handlePublish() {
    if (!canPublish || publishStatus === "publishing") return;
    setPublishStatus("publishing");
    setPublishError(null);

    const supabase = createClient();
    const { error } = await supabase.rpc("complete_new_venue_onboarding", {
      p_venue_id: venue.id,
    });

    if (error) {
      console.error("COMPLETE NEW VENUE ONBOARDING ERROR:", error);
      setPublishError(
        error.message.includes("incompleto") || error.message.includes("obrigat")
          ? error.message
          : "Não foi possível publicar agora. Revise os dados e tente novamente.",
      );
      setPublishStatus("idle");
      return;
    }

    setPublishStatus("idle");
    setJustPublished(true);
    onPublished?.();
  }

  if (isPublished) {
    return (
      <section className="overflow-hidden rounded-2xl border border-emerald-400/40 bg-emerald-400/5 p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-300">
          Estabelecimento publicado
        </p>
        <h2 className="mt-2 text-xl font-bold tracking-tight text-foreground sm:text-2xl">
          {venue.name} já aparece no Bora pra onde
        </h2>
        <p className="mt-2 text-sm text-muted sm:text-base">
          Seu estabelecimento está visível na Home, em Descobrir e em Buscar.
        </p>
      </section>
    );
  }

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
        Complete os itens abaixo para publicar seu estabelecimento no Bora pra onde.
      </p>

      <ul className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {(Object.keys(PUBLISH_CHECKLIST_LABELS) as ChecklistKey[]).map((key) => {
          const done = checklist[key];
          const config = CHECKLIST_ITEM_CONFIG[key];
          return (
            <li key={key}>
              {/* Card inteiro clicável (inclusive o ícone, que fica dentro
                  do Link) — leva direto pro campo que falta, com âncora
                  pra editar/midias rolarem até a seção certa sozinhos. */}
              <Link
                href={config.href(venue.id)}
                aria-label={done ? config.ariaLabelDone : config.ariaLabelPending}
                className={`flex min-h-11 items-center gap-3 rounded-xl border px-4 py-2.5 text-sm transition-colors ${focusRing} ${
                  done
                    ? "border-emerald-400/30 bg-emerald-400/5 text-emerald-300 hover:border-emerald-400/60"
                    : "border-border text-muted hover:border-accent hover:text-accent"
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                    done ? "border-emerald-400 bg-emerald-400/20" : "border-border"
                  }`}
                >
                  {done && <CheckIcon />}
                </span>
                {PUBLISH_CHECKLIST_LABELS[key]}
              </Link>
            </li>
          );
        })}
      </ul>

      {!checklist.complete && !mediaCheck.loading && (
        <p className="mt-4 text-xs text-muted">Falta: {missingLabels.join(", ")}.</p>
      )}

      {publishError && (
        <p className="mt-4 rounded-xl border border-red-400/40 bg-red-400/5 px-4 py-3 text-sm text-red-300">
          {publishError}
        </p>
      )}

      <div className="mt-6 flex flex-wrap gap-2">
        <Link href={`/empresa/painel/${venue.id}/editar`} className={linkButtonBase}>
          Editar dados
        </Link>
        <Link href={`/empresa/painel/${venue.id}/midias`} className={linkButtonBase}>
          Adicionar fotos e vídeo
        </Link>
        <Link href={`/empresa/painel/${venue.id}/preview`} className={linkButtonBase}>
          Ver prévia
        </Link>
        {/* CORREÇÃO (auditoria final): o botão agora aparece sempre — desabilitado
            (baixa opacidade via disabled:opacity-40) enquanto faltar algo, em vez
            de simplesmente sumir. A validação definitiva continua no banco
            (complete_new_venue_onboarding revalida tudo de novo). */}
        <button
          type="button"
          onClick={handlePublish}
          disabled={!canPublish || publishStatus === "publishing"}
          className={`inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2 text-xs font-semibold text-accent-foreground transition-transform hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100 ${focusRing}`}
        >
          {publishStatus === "publishing" ? "Publicando..." : "Concluir cadastro e publicar"}
        </button>
      </div>
    </section>
  );
}
