"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { VenueAccessGate } from "@/components/empresa/venue-access-gate";
import type { VenueOwnerRow } from "@/lib/venues/venue-owner";
import { VENUE_CATEGORIES } from "@/lib/venues/venue-categories";
import {
  ATMOSPHERE_TAG_GROUPS,
  COMPANION_TAG_OPTIONS,
  MOMENT_TAG_GROUPS,
  MOMENT_TAG_IDS,
  type VenueAtmosphereTag,
  type VenueCompanionTag,
  type VenueMomentTag,
} from "@/lib/venues/venue-tags";
import { TagToggleButton, toggleValue } from "@/components/empresa/tag-toggle-button";

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background";
const inputClasses = `w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted focus:outline-none ${focusRing}`;
const labelClasses = "text-sm font-medium text-foreground";

type Status = "idle" | "saving" | "saved" | "error";

/** Estado do formulário: campos-lista viram texto separado por vírgula para edição simples. */
interface FormState {
  name: string;
  category: string;
  description: string;
  city: string;
  neighborhood: string;
  address: string;
  cuisine_types: string;
  /** Só tags livres — momento (café da manhã, jantar etc.) fica separado, no estado `moments`. */
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

function toListText(value: string[] | null): string {
  return (value ?? []).join(", ");
}

function fromListText(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

/** Tags que não são "momento" — as de momento ficam fora do texto livre, no estado `moments` do formulário. */
function nonMomentTags(tags: string[] | null): string[] {
  return (tags ?? []).filter((tag) => !MOMENT_TAG_IDS.includes(tag as VenueMomentTag));
}

function venueToFormState(venue: VenueOwnerRow): FormState {
  return {
    name: venue.name,
    category: venue.category,
    description: venue.description,
    city: venue.city,
    neighborhood: venue.neighborhood,
    address: venue.address,
    cuisine_types: toListText(venue.cuisine_types),
    tags: toListText(nonMomentTags(venue.tags)),
    music_styles: toListText(venue.music_styles),
    intentions: toListText(venue.intentions),
    menu_highlights: toListText(venue.menu_highlights),
    schedule: toListText(venue.schedule),
    price_range: venue.price_range ?? "$$",
    average_price_per_person:
      venue.average_price_per_person != null ? String(venue.average_price_per_person) : "",
    average_price_for_couple:
      venue.average_price_for_couple != null ? String(venue.average_price_for_couple) : "",
    whatsapp_number: venue.whatsapp_number ?? "",
    whatsapp: venue.whatsapp ?? "",
    whatsapp_url: venue.whatsapp_url ?? "",
    instagram_url: venue.instagram_url ?? "",
    website: venue.website ?? "",
    menu_url: venue.menu_url ?? "",
    reservation_url: venue.reservation_url ?? "",
  };
}

export default function EditarEstabelecimentoPage() {
  const params = useParams<{ venueId: string }>();
  const venueId = params.venueId;

  return (
    <VenueAccessGate venueId={venueId}>
      {(venue, role) => <EditForm venue={venue} role={role} />}
    </VenueAccessGate>
  );
}

function EditForm({ venue }: { venue: VenueOwnerRow; role: string }) {
  const [form, setForm] = useState<FormState>(() => venueToFormState(venue));
  const [atmospheres, setAtmospheres] = useState<VenueAtmosphereTag[]>(venue.atmospheres ?? []);
  const [companions, setCompanions] = useState<VenueCompanionTag[]>(venue.companions ?? []);
  const [moments, setMoments] = useState<VenueMomentTag[]>(
    (venue.tags ?? []).filter((tag): tag is VenueMomentTag =>
      MOMENT_TAG_IDS.includes(tag as VenueMomentTag),
    ),
  );
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function updateField<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [field]: value }));
    setStatus("idle");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("saving");
    setErrorMessage(null);

    const supabase = createClient();

    // Lista branca explícita — nunca inclui is_published, is_featured ou
    // data_confidence, mesmo que o estado do formulário tivesse essas chaves.
    const { error } = await supabase
      .from("venues")
      .update({
        name: form.name.trim(),
        category: form.category.trim(),
        description: form.description.trim(),
        city: form.city.trim(),
        neighborhood: form.neighborhood.trim(),
        address: form.address.trim(),
        cuisine_types: fromListText(form.cuisine_types),
        tags: [...fromListText(form.tags), ...moments],
        music_styles: fromListText(form.music_styles),
        atmospheres,
        intentions: fromListText(form.intentions),
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
      })
      .eq("id", venue.id);

    if (error) {
      setErrorMessage("Não foi possível salvar agora. Tente novamente em instantes.");
      setStatus("error");
      return;
    }

    setStatus("saved");
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-14">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Editar {venue.name}
        </h1>
        <Link
          href="/empresa/painel"
          className={`rounded-full border border-border px-4 py-2 text-sm font-medium text-muted transition-colors hover:border-accent hover:text-accent ${focusRing}`}
        >
          Voltar ao painel
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-6">
        <section className="flex flex-col gap-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
            Dados básicos
          </h2>
          <div>
            <label className={labelClasses}>Nome</label>
            <input
              value={form.name}
              onChange={(event) => updateField("name", event.target.value)}
              className={`mt-2 ${inputClasses}`}
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
          <div>
            <label className={labelClasses}>Descrição</label>
            <textarea
              value={form.description}
              onChange={(event) => updateField("description", event.target.value)}
              rows={4}
              className={`mt-2 ${inputClasses} resize-none`}
              required
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClasses}>Cidade</label>
              <input
                value={form.city}
                onChange={(event) => updateField("city", event.target.value)}
                className={`mt-2 ${inputClasses}`}
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
          <div>
            <label className={labelClasses}>Tipos de culinária</label>
            <input
              value={form.cuisine_types}
              onChange={(event) => updateField("cuisine_types", event.target.value)}
              placeholder="Ex.: Japonesa, Brasileira"
              className={`mt-2 ${inputClasses}`}
            />
          </div>
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
            <legend className={labelClasses}>Ambiente</legend>
            <div className="mt-3 flex flex-col gap-5">
              {ATMOSPHERE_TAG_GROUPS.map((group) => (
                <div key={group.title}>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                    {group.title}
                  </p>
                  <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {group.options.map((option) => {
                      const value = option.id as VenueAtmosphereTag;
                      return (
                        <TagToggleButton
                          key={option.id}
                          label={option.label}
                          isActive={atmospheres.includes(value)}
                          onClick={() => setAtmospheres((current) => toggleValue(current, value))}
                        />
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </fieldset>
          <div>
            <label className={labelClasses}>Intenções</label>
            <input
              value={form.intentions}
              onChange={(event) => updateField("intentions", event.target.value)}
              placeholder="Ex.: casal, comemorar"
              className={`mt-2 ${inputClasses}`}
            />
          </div>
          <fieldset>
            <legend className={labelClasses}>Companhias</legend>
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
          <div>
            <label className={labelClasses}>Horário de funcionamento</label>
            <input
              value={form.schedule}
              onChange={(event) => updateField("schedule", event.target.value)}
              placeholder="Ex.: Ter a Dom, 18h às 00h"
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
            <label className={labelClasses}>WhatsApp (número, formato internacional sem &quot;+&quot;)</label>
            <input
              value={form.whatsapp_number}
              onChange={(event) => updateField("whatsapp_number", event.target.value)}
              placeholder="5512900000000"
              className={`mt-2 ${inputClasses}`}
            />
          </div>
          <div>
            <label className={labelClasses}>WhatsApp (texto alternativo)</label>
            <input
              value={form.whatsapp}
              onChange={(event) => updateField("whatsapp", event.target.value)}
              className={`mt-2 ${inputClasses}`}
            />
          </div>
          <div>
            <label className={labelClasses}>Link direto do WhatsApp</label>
            <input
              type="url"
              value={form.whatsapp_url}
              onChange={(event) => updateField("whatsapp_url", event.target.value)}
              placeholder="https://wa.me/5512900000000"
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

        {errorMessage && (
          <p className="rounded-xl border border-red-400/40 bg-red-400/5 px-4 py-3 text-sm text-red-300">
            {errorMessage}
          </p>
        )}
        {status === "saved" && (
          <p className="rounded-xl border border-emerald-400/40 bg-emerald-400/5 px-4 py-3 text-sm text-emerald-300">
            Alterações salvas.
          </p>
        )}

        <button
          type="submit"
          disabled={status === "saving"}
          className={`inline-flex items-center justify-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground transition-transform hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100 ${focusRing}`}
        >
          {status === "saving" ? "Salvando..." : "Salvar alterações"}
        </button>
      </form>
    </div>
  );
}
