"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  ATMOSPHERE_TAG_GROUPS,
  COMPANION_TAG_OPTIONS,
  MOMENT_TAG_GROUPS,
  MOMENT_TAG_IDS,
  type VenueAtmosphereTag,
  type VenueCompanionTag,
  type VenueMomentTag,
} from "@/lib/venues/venue-tags";
import type { VenueOwnerRow } from "@/lib/venues/venue-owner";
import { TagToggleButton, toggleValue } from "@/components/empresa/tag-toggle-button";

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background";

type Status = "idle" | "saving" | "saved" | "error";

interface ExperienceQuestionsProps {
  venue: VenueOwnerRow;
  onSaved: () => void;
}

/**
 * Edita atmospheres, companions e description — os mesmos três campos que
 * já existem em EDITABLE_VENUE_FIELDS e no formulário de
 * /empresa/painel/[venueId]/editar, só que aqui como cartões clicáveis em
 * vez de texto separado por vírgula. Mesma lista branca, mesma policy de
 * UPDATE, sem tocar is_published/is_featured/data_confidence.
 *
 * atmospheres e companions usam a taxonomia estendida de venue-tags.ts
 * (ambiente/estilo/experiência e público) — coletada aqui para alimentar
 * futuramente o motor de afinidade com mais sinais de recomendação, além
 * das opções mais restritas que o questionário de /descobrir usa hoje.
 */
export function ExperienceQuestions({ venue, onSaved }: ExperienceQuestionsProps) {
  const [atmospheres, setAtmospheres] = useState<VenueAtmosphereTag[]>(venue.atmospheres ?? []);
  const [companions, setCompanions] = useState<VenueCompanionTag[]>(venue.companions ?? []);
  // Momentos ainda não têm coluna própria — ficam dentro de `tags` (ver
  // venue-tags.ts). Ao carregar, separamos o que já foi salvo como momento
  // do restante das tags livres do estabelecimento.
  const [moments, setMoments] = useState<VenueMomentTag[]>(
    (venue.tags ?? []).filter((tag): tag is VenueMomentTag =>
      MOMENT_TAG_IDS.includes(tag as VenueMomentTag),
    ),
  );
  const [description, setDescription] = useState(venue.description);
  const [averagePricePerPerson, setAveragePricePerPerson] = useState(
    venue.average_price_per_person != null ? String(venue.average_price_per_person) : "",
  );
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const averagePriceValue = Number(averagePricePerPerson);
  const hasValidAveragePrice =
    averagePricePerPerson.trim().length > 0 &&
    Number.isFinite(averagePriceValue) &&
    averagePriceValue > 0;
  const canSave = description.trim().length > 0 && hasValidAveragePrice;

  async function handleSave() {
    if (!canSave) return;
    setStatus("saving");
    setErrorMessage(null);

    // Preserva qualquer tag livre já existente que não seja um momento —
    // nunca sobrescreve `tags` inteiro, só substitui a parte de momentos.
    const otherTags = (venue.tags ?? []).filter(
      (tag) => !MOMENT_TAG_IDS.includes(tag as VenueMomentTag),
    );
    const nextTags = [...otherTags, ...moments];

    const supabase = createClient();
    const { error } = await supabase
      .from("venues")
      .update({
        atmospheres,
        companions,
        description: description.trim(),
        tags: nextTags,
        average_price_per_person: averagePriceValue,
      })
      .eq("id", venue.id);

    if (error) {
      setErrorMessage("Não foi possível salvar agora. Tente novamente em instantes.");
      setStatus("error");
      return;
    }

    setStatus("saved");
    onSaved();
  }

  return (
    <section className="rounded-2xl border border-border bg-background-elevated p-6 sm:p-8">
      <h2 className="text-lg font-semibold text-foreground sm:text-xl">
        Personalize sua experiência
      </h2>
      <p className="mt-1 text-sm text-muted">
        Isso ajuda a mostrar seu estabelecimento para as pessoas certas no Qual é a Boa.
      </p>

      <fieldset className="mt-6">
        <legend className="text-sm font-semibold text-foreground">
          Qual é o estilo do seu estabelecimento?
        </legend>
        <p className="mt-1 text-xs text-muted">
          Escolha quantos combinarem, em qualquer grupo — não são categorias excludentes.
        </p>

        <div className="mt-4 flex flex-col gap-5">
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

      <fieldset className="mt-6">
        <legend className="text-sm font-semibold text-foreground">
          Para quem essa experiência combina?
        </legend>
        <p className="mt-1 text-xs text-muted">Escolha quantos combinarem.</p>
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

      <fieldset className="mt-6">
        <legend className="text-sm font-semibold text-foreground">
          Quando essa experiência combina?
        </legend>
        <p className="mt-1 text-xs text-muted">
          Ajude as pessoas a encontrarem seu estabelecimento no momento certo.
        </p>

        <div className="mt-4 flex flex-col gap-5">
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

      <div className="mt-6">
        <label htmlFor="venue-highlight" className="text-sm font-semibold text-foreground">
          Conte o que torna seu estabelecimento especial
        </label>
        <textarea
          id="venue-highlight"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={4}
          placeholder="Por que alguém deveria escolher você?"
          className={`mt-2 w-full resize-none rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted focus:outline-none ${focusRing}`}
        />
      </div>

      <div className="mt-6">
        <label htmlFor="venue-average-price" className="text-sm font-semibold text-foreground">
          Qual o gasto médio por pessoa?
        </label>
        <p className="mt-1 text-xs text-muted">Usado para combinar com o orçamento de quem busca. Ex.: R$ 50.</p>
        <div className="relative mt-2">
          <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-sm text-muted">
            R$
          </span>
          <input
            id="venue-average-price"
            type="number"
            min="1"
            step="1"
            value={averagePricePerPerson}
            onChange={(event) => setAveragePricePerPerson(event.target.value)}
            placeholder="50"
            required
            className={`w-full rounded-xl border border-border bg-background py-3 pl-11 pr-4 text-sm text-foreground placeholder:text-muted focus:outline-none ${focusRing}`}
          />
        </div>
      </div>

      {errorMessage && (
        <p className="mt-4 rounded-xl border border-red-400/40 bg-red-400/5 px-4 py-3 text-sm text-red-300">
          {errorMessage}
        </p>
      )}
      {status === "saved" && (
        <p className="mt-4 rounded-xl border border-emerald-400/40 bg-emerald-400/5 px-4 py-3 text-sm text-emerald-300">
          Experiência atualizada.
        </p>
      )}

      <button
        type="button"
        onClick={handleSave}
        disabled={!canSave || status === "saving"}
        className={`mt-6 inline-flex items-center justify-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground transition-transform hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100 ${focusRing}`}
      >
        {status === "saving" ? "Salvando..." : "Salvar personalização"}
      </button>
    </section>
  );
}
