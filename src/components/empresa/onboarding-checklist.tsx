"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { listGalleryItems } from "@/lib/venues/venue-media";
import type { VenueOwnerRow } from "@/lib/venues/venue-owner";

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background";

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
 * Reflete exatamente os requisitos reais de public.publish_owned_venue()
 * (014_create_publish_owned_venue.sql): nome, categoria, descrição, pelo
 * menos 1 atmosphere, pelo menos 1 companion*, gasto médio por pessoa e
 * capa OU imagem de galeria. Vídeo e contato não são exigidos pela função,
 * então não bloqueiam aqui.
 *
 * (*) companion não é exigido pela função no banco, mas é um requisito de
 * produto pedido nesta etapa — mantido junto porque sem isso o motor de
 * afinidade não tem sinal de companhia pra esse venue.
 *
 * `hasGalleryImage` é passado por quem chama porque só quem já buscou o
 * Storage sabe isso (esta função continua síncrona e pura). Quando não
 * disponível, o chamador pode passar `false` — subestima "capa ou galeria"
 * na pior hipótese, nunca superestima.
 */
export function getOnboardingProgress(
  venue: VenueOwnerRow,
  hasGalleryImage: boolean = false,
): OnboardingProgress {
  const items: OnboardingItem[] = [
    { key: "nome", label: "Nome do estabelecimento", done: venue.name.trim().length > 0 },
    { key: "categoria", label: "Categoria", done: venue.category.trim().length > 0 },
    { key: "descricao", label: "Descrição", done: venue.description.trim().length > 0 },
    {
      key: "ambiente",
      label: "Pelo menos um ambiente",
      done: (venue.atmospheres?.length ?? 0) > 0,
    },
    {
      key: "companhia",
      label: "Pelo menos uma companhia",
      done: (venue.companions?.length ?? 0) > 0,
    },
    {
      key: "preco",
      label: "Gasto médio por pessoa",
      done: (venue.average_price_per_person ?? 0) > 0,
    },
    {
      key: "imagem",
      label: "Capa ou imagem na galeria",
      done: Boolean(venue.cover_image_url) || hasGalleryImage,
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

type PublishStatus = "idle" | "publishing" | "error";

interface OnboardingChecklistProps {
  venue: VenueOwnerRow;
  justCreated?: boolean;
  /** Chamado depois de publicar com sucesso, para o painel recarregar os dados do venue. */
  onPublished?: () => void;
}

export function OnboardingChecklist({
  venue,
  justCreated = false,
  onPublished,
}: OnboardingChecklistProps) {
  const [hasGalleryImage, setHasGalleryImage] = useState(false);
  const [publishStatus, setPublishStatus] = useState<PublishStatus>("idle");
  const [publishError, setPublishError] = useState<string | null>(null);
  const [justPublished, setJustPublished] = useState(false);

  useEffect(() => {
    let active = true;
    listGalleryItems(venue.id).then((items) => {
      if (active) setHasGalleryImage(items.length > 0);
    });
    return () => {
      active = false;
    };
  }, [venue.id]);

  const progress = getOnboardingProgress(venue, hasGalleryImage);
  const isPublished = venue.is_published || justPublished;

  async function handlePublish() {
    if (!progress.isComplete || publishStatus === "publishing") return;
    setPublishStatus("publishing");
    setPublishError(null);

    const supabase = createClient();
    const { error } = await supabase.rpc("publish_owned_venue", {
      target_venue_id: venue.id,
    });

    if (error) {
      setPublishError("Não foi possível publicar agora. Revise os dados e tente novamente.");
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
          {venue.name} já aparece no Qual é a Boa
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
        Complete os itens abaixo para publicar seu estabelecimento no Qual é a Boa.
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

      {publishError && (
        <p className="mt-4 rounded-xl border border-red-400/40 bg-red-400/5 px-4 py-3 text-sm text-red-300">
          {publishError}
        </p>
      )}

      <div className="mt-6 flex flex-wrap gap-2">
        <Link href={`/empresa/painel/${venue.id}/midias`} className={linkButtonBase}>
          Adicionar fotos e vídeo
        </Link>
        <Link href={`/empresa/painel/${venue.id}/preview`} className={linkButtonBase}>
          Ver prévia
        </Link>
        {progress.isComplete && (
          <button
            type="button"
            onClick={handlePublish}
            disabled={publishStatus === "publishing"}
            className={`inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2 text-xs font-semibold text-accent-foreground transition-transform hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100 ${focusRing}`}
          >
            {publishStatus === "publishing" ? "Publicando..." : "Publicar estabelecimento"}
          </button>
        )}
      </div>
    </section>
  );
}
