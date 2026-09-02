"use client";

import { Suspense, useEffect, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import {
  VENUE_CATEGORIES,
  OTHER_CATEGORY,
  splitCategoryValue,
  combineCategoryValue,
} from "@/lib/venues/venue-categories";
import {
  COMPANION_TAG_OPTIONS,
  MOMENT_TAG_GROUPS,
  MOMENT_TAG_IDS,
  buildAtmospheresToSave,
  extractCustomAtmosphereDescriptions,
  hasEmptyCustomAtmosphereDescription,
  isCustomAtmosphereValue,
  type CustomAtmosphereDescriptions,
  type VenueAtmosphereTag,
  type VenueCompanionTag,
  type VenueMomentTag,
} from "@/lib/venues/venue-tags";
import {
  buildCuisineTypesToSave,
  extractCustomCuisineDescription,
  hasEmptyCustomCuisineDescription,
  reconcileCuisineTypesForEditing,
} from "@/lib/venues/venue-cuisine";
import { TagToggleButton, toggleValue } from "@/components/empresa/tag-toggle-button";
import { AtmosphereGroupFields } from "@/components/empresa/atmosphere-group-fields";
import { CuisineFields } from "@/components/empresa/cuisine-fields";
import { CityAutocomplete } from "@/components/shared/city-autocomplete";
import { ClaimDraftMediaUploader } from "@/components/empresa/claim-draft-media-uploader";
import type { ClaimDraftMediaItem } from "@/lib/venues/claim-draft-media";
import { DAYS_OF_WEEK, DAY_LABELS, type DayOfWeek } from "@/lib/venues/venue-hours";
import {
  computePublishChecklist,
  missingChecklistLabels,
  isHoursComplete,
  PUBLISH_CHECKLIST_LABELS,
} from "@/lib/venues/venue-publish-checklist";

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background";
const inputClasses = `w-full rounded-xl border border-border bg-background px-4 py-3 text-base text-foreground placeholder:text-muted focus:outline-none ${focusRing}`;
const timeInputClasses = `rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none ${focusRing}`;
const labelClasses = "text-sm font-medium text-foreground";

/** Formato salvo em venue_claim_drafts.venue_data (mesmas chaves de _venue_claim_editable_fields_snapshot, no banco). */
interface DraftVenueData {
  name: string | null;
  category: string | null;
  description: string | null;
  city: string | null;
  neighborhood: string | null;
  address: string | null;
  cuisine_types: string[] | null;
  tags: string[] | null;
  music_styles: string[] | null;
  atmospheres: string[] | null;
  intentions: string[] | null;
  companions: string[] | null;
  menu_highlights: string[] | null;
  schedule: string[] | null;
  price_range: string | null;
  average_price_per_person: number | null;
  average_price_for_couple: number | null;
  whatsapp_number: string | null;
  whatsapp: string | null;
  whatsapp_url: string | null;
  instagram_url: string | null;
  website: string | null;
  menu_url: string | null;
  reservation_url: string | null;
}

interface DraftHour {
  day_of_week: DayOfWeek;
  opens_at: string | null;
  closes_at: string | null;
  is_closed: boolean;
  note: string | null;
}

function defaultDraftHours(): DraftHour[] {
  return DAYS_OF_WEEK.map((day) => ({
    day_of_week: day,
    opens_at: null,
    closes_at: null,
    is_closed: true,
    note: null,
  }));
}

function normalizeDraftHours(rows: DraftHour[] | null | undefined): DraftHour[] {
  const byDay = new Map((rows ?? []).map((row) => [row.day_of_week, row]));
  const fallback = defaultDraftHours();
  return DAYS_OF_WEEK.map((day) => byDay.get(day) ?? fallback[day]);
}

function toTimeInputValue(value: string | null): string {
  return value ? value.slice(0, 5) : "";
}

interface FormState {
  name: string;
  category: string;
  description: string;
  city: string;
  neighborhood: string;
  address: string;
  tags: string;
  music_styles: string;
  intentions: string;
  menu_highlights: string;
  schedule: string;
  price_range: string;
  average_price_per_person: string;
  average_price_for_couple: string;
  whatsapp_number: string;
  whatsapp: string;
  whatsapp_url: string;
  instagram_url: string;
  website: string;
  menu_url: string;
  reservation_url: string;
}

function toListText(value: string[] | null | undefined): string {
  return (value ?? []).join(", ");
}

function fromListText(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function nonMomentTags(tags: string[] | null | undefined): string[] {
  return (tags ?? []).filter((tag) => !MOMENT_TAG_IDS.includes(tag as VenueMomentTag));
}

function draftDataToFormState(data: DraftVenueData): FormState {
  return {
    name: data.name ?? "",
    category: splitCategoryValue(data.category ?? "").select,
    description: data.description ?? "",
    city: data.city ?? "",
    neighborhood: data.neighborhood ?? "",
    address: data.address ?? "",
    tags: toListText(nonMomentTags(data.tags)),
    music_styles: toListText(data.music_styles),
    intentions: toListText(data.intentions),
    menu_highlights: toListText(data.menu_highlights),
    schedule: toListText(data.schedule),
    price_range: data.price_range ?? "$$",
    average_price_per_person:
      data.average_price_per_person != null ? String(data.average_price_per_person) : "",
    average_price_for_couple:
      data.average_price_for_couple != null ? String(data.average_price_for_couple) : "",
    whatsapp_number: data.whatsapp_number ?? "",
    whatsapp: data.whatsapp ?? "",
    whatsapp_url: data.whatsapp_url ?? "",
    instagram_url: data.instagram_url ?? "",
    website: data.website ?? "",
    menu_url: data.menu_url ?? "",
    reservation_url: data.reservation_url ?? "",
  };
}

interface ClaimRequestRow {
  id: string;
  venue_id: string;
  user_id: string;
  status: string;
  reject_reason: string | null;
  venues: { name: string } | { name: string }[] | null;
}

interface ClaimDraftRow {
  id: string;
  venue_data: DraftVenueData;
  business_hours: DraftHour[];
}

function resolveVenueName(venues: ClaimRequestRow["venues"]): string {
  if (!venues) return "Estabelecimento";
  return Array.isArray(venues) ? (venues[0]?.name ?? "Estabelecimento") : venues.name;
}

/** Mensagens conhecidas das RPCs de rascunho/conclusão — qualquer outra vira uma mensagem genérica. */
function friendlyDraftError(message: string): string {
  const knownSubstrings = [
    "obrigatório",
    "obrigatória",
    "Cadastro incompleto",
    "proprietário ativo",
    "não pertence à sua conta",
    "não pode mais ser concluído",
    "Rascunho não encontrado",
    "Solicitação não encontrada",
    "necessário estar autenticado",
  ];
  if (knownSubstrings.some((s) => message.includes(s))) return message;
  return "Não foi possível salvar agora. Tente novamente em instantes.";
}

export default function PreencherRascunhoPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-2xl px-4 py-16 text-center sm:px-6">
          <div
            aria-hidden="true"
            className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-border border-t-accent"
          />
        </div>
      }
    >
      <PreencherContent />
    </Suspense>
  );
}

type LoadState = "checking" | "unauthenticated" | "not-found" | "ready" | "error";

function PreencherContent() {
  const searchParams = useSearchParams();
  const claimRequestId = searchParams.get("solicitacao");

  const [loadState, setLoadState] = useState<LoadState>("checking");
  const [user, setUser] = useState<User | null>(null);
  const [request, setRequest] = useState<ClaimRequestRow | null>(null);
  const [draft, setDraft] = useState<ClaimDraftRow | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!claimRequestId) {
        setLoadState("not-found");
        return;
      }

      const supabase = createClient();
      const { data: userData } = await supabase.auth.getUser();
      if (cancelled) return;

      if (!userData.user) {
        setLoadState("unauthenticated");
        return;
      }
      setUser(userData.user);

      const { data: requestData, error: requestError } = await supabase
        .from("venue_claim_requests")
        .select("id, venue_id, user_id, status, reject_reason, venues (name)")
        .eq("id", claimRequestId)
        .maybeSingle();

      if (cancelled) return;

      if (requestError || !requestData) {
        console.error("CLAIM REQUEST LOAD ERROR:", requestError);
        setLoadState(requestError ? "error" : "not-found");
        return;
      }

      const { data: draftData, error: draftError } = await supabase
        .from("venue_claim_drafts")
        .select("id, venue_data, business_hours")
        .eq("claim_request_id", claimRequestId)
        .maybeSingle();

      if (cancelled) return;

      if (draftError || !draftData) {
        console.error("CLAIM DRAFT LOAD ERROR:", draftError);
        setLoadState("error");
        return;
      }

      setRequest(requestData as unknown as ClaimRequestRow);
      setDraft(draftData as unknown as ClaimDraftRow);
      setLoadState("ready");
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [claimRequestId, reloadToken]);

  if (loadState === "checking") {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center sm:px-6">
        <div
          aria-hidden="true"
          className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-border border-t-accent"
        />
      </div>
    );
  }

  if (loadState === "unauthenticated") {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center sm:px-6">
        <h1 className="text-xl font-bold tracking-tight text-foreground">Entre para continuar</h1>
        <p className="mt-3 text-sm text-muted">
          Você precisa estar autenticado para acessar este cadastro.
        </p>
        <Link
          href="/empresa/entrar"
          className={`mt-6 inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground transition-transform hover:scale-[1.02] ${focusRing}`}
        >
          Entrar
        </Link>
      </div>
    );
  }

  if (loadState === "not-found") {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center sm:px-6">
        <h1 className="text-xl font-bold tracking-tight text-foreground">
          Cadastro não encontrado
        </h1>
        <p className="mt-3 text-sm text-muted">
          Este link não é válido, ou você não tem acesso a este cadastro.
        </p>
        <Link
          href="/empresa/reivindicar"
          className={`mt-6 inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground transition-transform hover:scale-[1.02] ${focusRing}`}
        >
          Buscar estabelecimento
        </Link>
      </div>
    );
  }

  if (loadState === "error") {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center sm:px-6">
        <h1 className="text-xl font-bold tracking-tight text-foreground">
          Não foi possível carregar
        </h1>
        <p className="mt-3 text-sm text-muted">Tente novamente em instantes.</p>
        <button
          type="button"
          onClick={() => {
            setLoadState("checking");
            setReloadToken((token) => token + 1);
          }}
          className={`mt-6 inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground transition-transform hover:scale-[1.02] ${focusRing}`}
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  if (!request || !draft || !user) return null;

  const isOwner = request.user_id === user.id;

  return <DraftForm key={reloadToken} request={request} draft={draft} isOwner={isOwner} />;
}

type SaveStatus = "idle" | "saving" | "saved" | "error";
type CompleteStatus = "idle" | "completing" | "error";

function DraftForm({
  request,
  draft,
  isOwner,
}: {
  request: ClaimRequestRow;
  draft: ClaimDraftRow;
  isOwner: boolean;
}) {
  const router = useRouter();
  const venueName = resolveVenueName(request.venues);
  // 'rejected' é aceito de propósito: sem rejeição manual no fluxo novo,
  // uma linha legada com esse status continua editável pelo próprio dono.
  const editable = isOwner && ["draft", "submitted", "rejected"].includes(request.status);
  const isDone = request.status === "completed" || request.status === "approved";

  const [form, setForm] = useState<FormState>(() => draftDataToFormState(draft.venue_data));
  const [customCategory, setCustomCategory] = useState(
    () => splitCategoryValue(draft.venue_data.category ?? "").custom,
  );
  const [atmospheres, setAtmospheres] = useState<VenueAtmosphereTag[]>(
    (draft.venue_data.atmospheres ?? []).filter(
      (value) => !isCustomAtmosphereValue(value),
    ) as VenueAtmosphereTag[],
  );
  const [customAtmosphereDescriptions, setCustomAtmosphereDescriptions] =
    useState<CustomAtmosphereDescriptions>(() =>
      extractCustomAtmosphereDescriptions(draft.venue_data.atmospheres ?? []),
    );
  const [cuisineTypes, setCuisineTypes] = useState<string[]>(() =>
    reconcileCuisineTypesForEditing(draft.venue_data.cuisine_types ?? []),
  );
  const [customCuisineDescription, setCustomCuisineDescription] = useState<string | null>(() =>
    extractCustomCuisineDescription(draft.venue_data.cuisine_types ?? []),
  );
  const [companions, setCompanions] = useState<VenueCompanionTag[]>(
    (draft.venue_data.companions ?? []) as VenueCompanionTag[],
  );
  const [moments, setMoments] = useState<VenueMomentTag[]>(
    (draft.venue_data.tags ?? []).filter((tag): tag is VenueMomentTag =>
      MOMENT_TAG_IDS.includes(tag as VenueMomentTag),
    ),
  );
  const [hours, setHours] = useState<DraftHour[]>(() => normalizeDraftHours(draft.business_hours));
  const [mediaItems, setMediaItems] = useState<ClaimDraftMediaItem[]>([]);

  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [completeStatus, setCompleteStatus] = useState<CompleteStatus>("idle");
  const [completeError, setCompleteError] = useState<string | null>(null);

  function updateField<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [field]: value }));
    setSaveStatus("idle");
  }

  function updateHour(day: DayOfWeek, patch: Partial<DraftHour>) {
    setHours((current) =>
      current.map((hour) => (hour.day_of_week === day ? { ...hour, ...patch } : hour)),
    );
    setSaveStatus("idle");
  }

  const canSaveAtmospheres = !hasEmptyCustomAtmosphereDescription(customAtmosphereDescriptions);
  const canSaveCuisine = !hasEmptyCustomCuisineDescription(customCuisineDescription);

  const intentions = fromListText(form.intentions);
  const hoursOk = isHoursComplete(
    hours.map((hour) => ({ isClosed: hour.is_closed, opensAt: hour.opens_at, closesAt: hour.closes_at })),
  );
  const hasActiveVideo = mediaItems.some((item) => item.mediaType === "video");

  const checklist = computePublishChecklist({
    name: form.name,
    category: combineCategoryValue(form.category, customCategory),
    description: form.description,
    city: form.city,
    neighborhood: form.neighborhood,
    address: form.address,
    priceRange: form.price_range,
    averagePricePerPerson: form.average_price_per_person ? Number(form.average_price_per_person) : null,
    whatsappNumber: form.whatsapp_number,
    whatsapp: form.whatsapp,
    whatsappUrl: form.whatsapp_url,
    atmospheres,
    intentions,
    companions,
    hoursOk,
    hasActiveVideo,
  });
  const missingLabels = missingChecklistLabels(checklist);

  function buildVenueDataPayload(): DraftVenueData {
    return {
      name: form.name.trim(),
      category: combineCategoryValue(form.category, customCategory).trim(),
      description: form.description.trim(),
      city: form.city.trim(),
      neighborhood: form.neighborhood.trim(),
      address: form.address.trim(),
      cuisine_types: buildCuisineTypesToSave(cuisineTypes, customCuisineDescription),
      tags: [...fromListText(form.tags), ...moments],
      music_styles: fromListText(form.music_styles),
      atmospheres: buildAtmospheresToSave(atmospheres, customAtmosphereDescriptions),
      intentions,
      companions,
      menu_highlights: fromListText(form.menu_highlights),
      schedule: fromListText(form.schedule),
      price_range: form.price_range,
      average_price_per_person: form.average_price_per_person
        ? Number(form.average_price_per_person)
        : null,
      average_price_for_couple: form.average_price_for_couple
        ? Number(form.average_price_for_couple)
        : null,
      whatsapp_number: form.whatsapp_number.trim() || null,
      whatsapp: form.whatsapp.trim() || null,
      whatsapp_url: form.whatsapp_url.trim() || null,
      instagram_url: form.instagram_url.trim() || null,
      website: form.website.trim() || null,
      menu_url: form.menu_url.trim() || null,
      reservation_url: form.reservation_url.trim() || null,
    };
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSaveAtmospheres || !canSaveCuisine || !editable) return;

    setSaveStatus("saving");
    setSaveError(null);

    const supabase = createClient();
    const { error } = await supabase.rpc("save_venue_claim_draft", {
      p_claim_request_id: request.id,
      p_venue_data: buildVenueDataPayload(),
      p_business_hours: hours,
    });

    if (error) {
      console.error("SAVE VENUE CLAIM DRAFT ERROR:", error);
      setSaveError(friendlyDraftError(error.message));
      setSaveStatus("error");
      return;
    }

    setSaveStatus("saved");
  }

  /**
   * Concluir cadastro e publicar — uma etapa só, sem aprovação
   * administrativa: salva o rascunho e chama complete_existing_venue_
   * onboarding(), que valida tudo de novo no banco, aplica os dados,
   * vincula o próprio usuário como owner e publica. Sucesso leva direto
   * ao painel.
   */
  async function handleCompleteAndPublish() {
    if (!editable || completeStatus === "completing" || !checklist.complete) return;

    setCompleteStatus("completing");
    setCompleteError(null);
    setSaveError(null);

    const supabase = createClient();

    const { error: saveErr } = await supabase.rpc("save_venue_claim_draft", {
      p_claim_request_id: request.id,
      p_venue_data: buildVenueDataPayload(),
      p_business_hours: hours,
    });

    if (saveErr) {
      console.error("SAVE BEFORE COMPLETE ERROR:", saveErr);
      setCompleteError(friendlyDraftError(saveErr.message));
      setCompleteStatus("idle");
      return;
    }

    const { data, error } = await supabase.rpc("complete_existing_venue_onboarding", {
      p_claim_request_id: request.id,
    });

    if (error) {
      console.error("COMPLETE EXISTING VENUE ONBOARDING ERROR:", error);
      setCompleteError(friendlyDraftError(error.message));
      setCompleteStatus("idle");
      return;
    }

    const venueId = Array.isArray(data) ? data[0]?.venue_id : (data as { venue_id?: string } | null)?.venue_id;
    router.push(venueId ? `/empresa/painel?publicado=${venueId}` : "/empresa/painel");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-14">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          {venueName}
        </h1>
        <Link
          href="/empresa/painel"
          className={`rounded-full border border-border px-4 py-2 text-sm font-medium text-muted transition-colors hover:border-accent hover:text-accent ${focusRing}`}
        >
          Voltar ao painel
        </Link>
      </div>

      {!isOwner && (
        <p className="mt-4 rounded-xl border border-accent/40 bg-accent/5 px-4 py-3 text-sm text-accent">
          Você está vendo este cadastro como administrador — a edição é feita só pelo próprio
          proprietário.
        </p>
      )}

      {isDone && (
        <p className="mt-4 rounded-xl border border-emerald-400/40 bg-emerald-400/5 px-4 py-3 text-sm text-emerald-300">
          Este estabelecimento já está publicado.
        </p>
      )}

      {request.status === "rejected" && request.reject_reason && (
        <p className="mt-4 rounded-xl border border-border bg-background-elevated px-4 py-3 text-sm text-muted">
          <strong className="font-semibold text-foreground">Observação anterior:</strong>{" "}
          {request.reject_reason}
        </p>
      )}

      {editable && (
        <div className="mt-6 rounded-2xl border border-border bg-background-elevated p-4">
          <p className="text-sm font-semibold text-foreground">
            {checklist.complete ? "Tudo pronto para publicar" : "Falta pouco para publicar"}
          </p>
          <ul className="mt-3 grid grid-cols-1 gap-1.5 text-xs sm:grid-cols-2">
            {(Object.keys(PUBLISH_CHECKLIST_LABELS) as (keyof typeof PUBLISH_CHECKLIST_LABELS)[]).map(
              (key) => (
                <li
                  key={key}
                  className={`flex items-center gap-2 ${checklist[key] ? "text-emerald-300" : "text-muted"}`}
                >
                  <span aria-hidden="true">{checklist[key] ? "✓" : "○"}</span>
                  {PUBLISH_CHECKLIST_LABELS[key]}
                </li>
              ),
            )}
          </ul>
        </div>
      )}

      <form onSubmit={handleSave} className="mt-8 flex flex-col gap-6">
        <fieldset disabled={!editable} className="contents">
          <section className="flex flex-col gap-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
              Dados básicos
            </h2>
            <div>
              <label className={labelClasses}>Nome</label>
              <input
                value={form.name}
                onChange={(event) => updateField("name", event.target.value)}
                className={`mt-2 ${inputClasses} ${!form.name.trim() ? "border-accent/60" : ""}`}
                required
              />
            </div>
            <div>
              <label className={labelClasses}>Categoria</label>
              <select
                value={form.category}
                onChange={(event) => updateField("category", event.target.value)}
                className={`mt-2 ${inputClasses}`}
                required
              >
                <option value="" disabled>
                  Selecione uma categoria
                </option>
                {!VENUE_CATEGORIES.includes(form.category as (typeof VENUE_CATEGORIES)[number]) &&
                  form.category && <option value={form.category}>{form.category}</option>}
                {VENUE_CATEGORIES.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            {form.category === OTHER_CATEGORY && (
              <div>
                <label className={labelClasses}>
                  Qual categoria descreve melhor seu estabelecimento?
                </label>
                <input
                  value={customCategory}
                  onChange={(event) => setCustomCategory(event.target.value)}
                  placeholder="Ex.: Casa de shows, Vinícola, Empório..."
                  className={`mt-2 ${inputClasses}`}
                  required
                />
              </div>
            )}
            <div>
              <label className={labelClasses}>Descrição</label>
              <textarea
                value={form.description}
                onChange={(event) => updateField("description", event.target.value)}
                rows={4}
                className={`mt-2 ${inputClasses} resize-none ${!form.description.trim() ? "border-accent/60" : ""}`}
                required
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClasses}>Cidade</label>
                <CityAutocomplete
                  id="claim-draft-city"
                  value={form.city}
                  onChange={(value) => updateField("city", value)}
                  wrapperClassName="mt-2"
                  required
                />
              </div>
              <div>
                <label className={labelClasses}>Bairro</label>
                <input
                  value={form.neighborhood}
                  onChange={(event) => updateField("neighborhood", event.target.value)}
                  className={`mt-2 ${inputClasses}`}
                  required
                />
              </div>
            </div>
            <div>
              <label className={labelClasses}>Endereço</label>
              <input
                value={form.address}
                onChange={(event) => updateField("address", event.target.value)}
                className={`mt-2 ${inputClasses}`}
                required
              />
            </div>
          </section>

          <section className="flex flex-col gap-4 border-t border-border pt-6">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
              Experiência (separe por vírgula)
            </h2>
            <fieldset>
              <legend className={labelClasses}>Tipos de culinária</legend>
              <div className="mt-3">
                <CuisineFields
                  cuisineTypes={cuisineTypes}
                  onCuisineTypesChange={setCuisineTypes}
                  customDescription={customCuisineDescription}
                  onCustomDescriptionChange={setCustomCuisineDescription}
                />
              </div>
            </fieldset>
            <div>
              <label className={labelClasses}>Outras tags</label>
              <input
                value={form.tags}
                onChange={(event) => updateField("tags", event.target.value)}
                placeholder="Ex.: ao ar livre, delivery"
                className={`mt-2 ${inputClasses}`}
              />
            </div>
            <div>
              <label className={labelClasses}>Estilos musicais</label>
              <input
                value={form.music_styles}
                onChange={(event) => updateField("music_styles", event.target.value)}
                placeholder="Ex.: mpb, sertanejo"
                className={`mt-2 ${inputClasses}`}
              />
            </div>
            <fieldset>
              <legend className={`${labelClasses} ${atmospheres.length === 0 ? "text-accent" : ""}`}>
                Ambiente {atmospheres.length === 0 && "(obrigatório)"}
              </legend>
              <div className="mt-3">
                <AtmosphereGroupFields
                  atmospheres={atmospheres}
                  onAtmospheresChange={setAtmospheres}
                  customDescriptions={customAtmosphereDescriptions}
                  onCustomDescriptionsChange={setCustomAtmosphereDescriptions}
                />
              </div>
            </fieldset>
            <div>
              <label className={`${labelClasses} ${intentions.length === 0 ? "text-accent" : ""}`}>
                Intenções {intentions.length === 0 && "(obrigatório)"}
              </label>
              <input
                value={form.intentions}
                onChange={(event) => updateField("intentions", event.target.value)}
                placeholder="Ex.: casal, comemorar"
                className={`mt-2 ${inputClasses}`}
              />
            </div>
            <fieldset>
              <legend className={`${labelClasses} ${companions.length === 0 ? "text-accent" : ""}`}>
                Companhias {companions.length === 0 && "(obrigatório)"}
              </legend>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {COMPANION_TAG_OPTIONS.map((option) => {
                  const value = option.id as VenueCompanionTag;
                  return (
                    <TagToggleButton
                      key={option.id}
                      label={option.label}
                      isActive={companions.includes(value)}
                      onClick={() => setCompanions((current) => toggleValue(current, value))}
                    />
                  );
                })}
              </div>
            </fieldset>
            <fieldset>
              <legend className={labelClasses}>Momento</legend>
              <div className="mt-3 flex flex-col gap-5">
                {MOMENT_TAG_GROUPS.map((group) => (
                  <div key={group.title}>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                      {group.title}
                    </p>
                    <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {group.options.map((option) => {
                        const value = option.id as VenueMomentTag;
                        return (
                          <TagToggleButton
                            key={option.id}
                            label={option.label}
                            isActive={moments.includes(value)}
                            onClick={() => setMoments((current) => toggleValue(current, value))}
                          />
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </fieldset>
            <div>
              <label className={labelClasses}>Destaques do cardápio</label>
              <input
                value={form.menu_highlights}
                onChange={(event) => updateField("menu_highlights", event.target.value)}
                className={`mt-2 ${inputClasses}`}
              />
            </div>
          </section>

          <section className="border-t border-border pt-6">
            <h2 className={`text-sm font-semibold uppercase tracking-wide ${hoursOk ? "text-muted" : "text-accent"}`}>
              Horário de funcionamento {!hoursOk && "(obrigatório)"}
            </h2>
            <div className="mt-4 flex flex-col gap-3">
              {DAYS_OF_WEEK.map((day) => {
                const hour = hours.find((item) => item.day_of_week === day);
                if (!hour) return null;
                return (
                  <div
                    key={day}
                    className="flex flex-col gap-3 rounded-xl border border-border px-4 py-3 sm:flex-row sm:items-center sm:gap-4"
                  >
                    <span className="text-sm font-medium text-foreground sm:w-24 sm:shrink-0">
                      {DAY_LABELS[day]}
                    </span>
                    <label className="flex items-center gap-2 text-sm text-muted sm:w-28 sm:shrink-0">
                      <input
                        type="checkbox"
                        checked={hour.is_closed}
                        onChange={(event) => updateHour(day, { is_closed: event.target.checked })}
                        className="h-4 w-4 rounded border-border accent-accent"
                      />
                      Fechado
                    </label>
                    {!hour.is_closed && (
                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          type="time"
                          value={toTimeInputValue(hour.opens_at)}
                          onChange={(event) => updateHour(day, { opens_at: event.target.value })}
                          aria-label={`Horário de abertura de ${DAY_LABELS[day]}`}
                          className={timeInputClasses}
                        />
                        <span className="text-sm text-muted">até</span>
                        <input
                          type="time"
                          value={toTimeInputValue(hour.closes_at)}
                          onChange={(event) => updateHour(day, { closes_at: event.target.value })}
                          aria-label={`Horário de fechamento de ${DAY_LABELS[day]}`}
                          className={timeInputClasses}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          <section className="flex flex-col gap-4 border-t border-border pt-6">
            <div>
              <label className={labelClasses}>Observações</label>
              <p className="mt-1 text-xs text-muted">
                Informações adicionais sobre o funcionamento — música ao vivo, eventos, rodízio,
                avisos.
              </p>
              <input
                value={form.schedule}
                onChange={(event) => updateField("schedule", event.target.value)}
                placeholder="Ex.: Sexta com música ao vivo às 21h"
                className={`mt-2 ${inputClasses}`}
              />
            </div>
          </section>

          <section className="flex flex-col gap-4 border-t border-border pt-6">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Preços</h2>
            <div>
              <label className={labelClasses}>Faixa de preço</label>
              <select
                value={form.price_range}
                onChange={(event) => updateField("price_range", event.target.value)}
                className={`mt-2 ${inputClasses}`}
              >
                <option value="$">$ (econômico)</option>
                <option value="$$">$$ (moderado)</option>
                <option value="$$$">$$$ (alto)</option>
              </select>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClasses}>Média por pessoa (R$)</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={form.average_price_per_person}
                  onChange={(event) => updateField("average_price_per_person", event.target.value)}
                  className={`mt-2 ${inputClasses}`}
                  required
                />
              </div>
              <div>
                <label className={labelClasses}>Média para casal (R$)</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={form.average_price_for_couple}
                  onChange={(event) => updateField("average_price_for_couple", event.target.value)}
                  className={`mt-2 ${inputClasses}`}
                />
              </div>
            </div>
          </section>

          <section className="flex flex-col gap-4 border-t border-border pt-6">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Contatos</h2>
            <div>
              <label className={`${labelClasses} ${checklist.contact ? "" : "text-accent"}`}>
                WhatsApp (número, formato internacional sem &quot;+&quot;) {!checklist.contact && "(obrigatório)"}
              </label>
              <input
                value={form.whatsapp_number}
                onChange={(event) => updateField("whatsapp_number", event.target.value)}
                placeholder="5512900000000"
                className={`mt-2 ${inputClasses}`}
              />
            </div>
            <div>
              <label className={labelClasses}>Instagram</label>
              <input
                type="url"
                value={form.instagram_url}
                onChange={(event) => updateField("instagram_url", event.target.value)}
                placeholder="https://instagram.com/seu-estabelecimento"
                className={`mt-2 ${inputClasses}`}
              />
            </div>
            <div>
              <label className={labelClasses}>Site</label>
              <input
                type="url"
                value={form.website}
                onChange={(event) => updateField("website", event.target.value)}
                className={`mt-2 ${inputClasses}`}
              />
            </div>
            <div>
              <label className={labelClasses}>Cardápio (link)</label>
              <input
                type="url"
                value={form.menu_url}
                onChange={(event) => updateField("menu_url", event.target.value)}
                className={`mt-2 ${inputClasses}`}
              />
            </div>
            <div>
              <label className={labelClasses}>Reserva (link)</label>
              <input
                type="url"
                value={form.reservation_url}
                onChange={(event) => updateField("reservation_url", event.target.value)}
                className={`mt-2 ${inputClasses}`}
              />
            </div>
          </section>
        </fieldset>

        {saveError && (
          <p className="rounded-xl border border-red-400/40 bg-red-400/5 px-4 py-3 text-sm text-red-300">
            {saveError}
          </p>
        )}
        {saveStatus === "saved" && (
          <p className="rounded-xl border border-emerald-400/40 bg-emerald-400/5 px-4 py-3 text-sm text-emerald-300">
            Rascunho salvo.
          </p>
        )}

        {editable && (
          <button
            type="submit"
            disabled={saveStatus === "saving" || !canSaveAtmospheres || !canSaveCuisine}
            className={`inline-flex items-center justify-center gap-2 rounded-full border border-accent px-6 py-3 text-sm font-semibold text-accent transition-colors hover:bg-accent hover:text-accent-foreground disabled:cursor-not-allowed disabled:opacity-40 ${focusRing}`}
          >
            {saveStatus === "saving" ? "Salvando..." : "Salvar e continuar"}
          </button>
        )}
      </form>

      <div className="mt-6">
        <ClaimDraftMediaUploader
          venueId={request.venue_id}
          claimRequestId={request.id}
          draftId={draft.id}
          editable={editable}
          onItemsChange={setMediaItems}
        />
      </div>

      {editable && (
        <div className="mt-8 border-t border-border pt-6">
          {completeError && (
            <p className="mb-4 rounded-xl border border-red-400/40 bg-red-400/5 px-4 py-3 text-sm text-red-300">
              {completeError}
            </p>
          )}
          {!checklist.complete && (
            <p className="mb-4 text-xs text-muted">Falta: {missingLabels.join(", ")}.</p>
          )}
          <button
            type="button"
            onClick={handleCompleteAndPublish}
            disabled={
              completeStatus === "completing" ||
              !canSaveAtmospheres ||
              !canSaveCuisine ||
              !checklist.complete
            }
            className={`inline-flex w-full items-center justify-center gap-2 rounded-full bg-accent px-6 py-3.5 text-sm font-semibold text-accent-foreground transition-transform hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100 ${focusRing}`}
          >
            {completeStatus === "completing" ? "Publicando..." : "Concluir cadastro e publicar"}
          </button>
          <p className="mt-2 text-center text-xs text-muted">
            Assim que concluído, seu estabelecimento é publicado automaticamente e você entra no
            painel.
          </p>
        </div>
      )}
    </div>
  );
}
