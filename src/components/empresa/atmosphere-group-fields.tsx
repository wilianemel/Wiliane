"use client";

import {
  ATMOSPHERE_TAG_GROUPS,
  CUSTOM_ATMOSPHERE_MAX_LENGTH,
  type AtmosphereGroupKey,
  type CustomAtmosphereDescriptions,
  type VenueAtmosphereTag,
} from "@/lib/venues/venue-tags";
import { TagToggleButton, toggleValue } from "@/components/empresa/tag-toggle-button";

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background";

/** Rótulo e placeholder do campo de descrição, por grupo — texto pedido explicitamente para cada um. */
const CUSTOM_ATMOSPHERE_COPY: Record<AtmosphereGroupKey, { label: string; placeholder: string }> = {
  ambiente: {
    label: "Descreva outro tipo de ambiente",
    placeholder: "Ex.: Rústico, ao ar livre",
  },
  estilo: {
    label: "Descreva outro estilo",
    placeholder: "Ex.: Vintage, industrial",
  },
  diferenciais: {
    label: "Descreva outro diferencial",
    placeholder: "Ex.: Estacionamento privativo",
  },
};

interface AtmosphereGroupFieldsProps {
  /** Só valores fixos (opções dos grupos) — nunca inclui os personalizados, que vivem em `customDescriptions`. */
  atmospheres: VenueAtmosphereTag[];
  onAtmospheresChange: (next: VenueAtmosphereTag[]) => void;
  customDescriptions: CustomAtmosphereDescriptions;
  onCustomDescriptionsChange: (next: CustomAtmosphereDescriptions) => void;
}

/**
 * Renderiza os três grupos de "Qual é o estilo do seu estabelecimento?"
 * (Ambiente, Estilo, Diferenciais): opções fixas como botões de seleção
 * múltipla + um botão "Outro" próprio por grupo que revela um campo de
 * descrição livre logo abaixo. Reaproveitado por experience-questions.tsx e
 * por editar/page.tsx — a mesma lógica de "Outro" não é duplicada nos dois
 * formulários.
 *
 * `atmospheres` nunca deve conter valores personalizados (ver
 * isCustomAtmosphereValue) — quem chama é responsável por filtrar isso ao
 * carregar o estado inicial (extractCustomAtmosphereDescriptions cuida da
 * outra metade, extraindo a descrição personalizada de cada grupo).
 */
export function AtmosphereGroupFields({
  atmospheres,
  onAtmospheresChange,
  customDescriptions,
  onCustomDescriptionsChange,
}: AtmosphereGroupFieldsProps) {
  return (
    <div className="flex flex-col gap-5">
      {ATMOSPHERE_TAG_GROUPS.map((group) => {
        const isCustomChecked = customDescriptions[group.key] !== null;
        const customValue = customDescriptions[group.key] ?? "";
        const copy = CUSTOM_ATMOSPHERE_COPY[group.key];
        const inputId = `atmosphere-custom-${group.key}`;
        const isEmpty = isCustomChecked && customValue.trim().length === 0;

        return (
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
                    onClick={() => onAtmospheresChange(toggleValue(atmospheres, value))}
                  />
                );
              })}
              <TagToggleButton
                label="Outro"
                isActive={isCustomChecked}
                onClick={() =>
                  onCustomDescriptionsChange({
                    ...customDescriptions,
                    // Desmarcar limpa a descrição (volta pra null); marcar começa vazio.
                    [group.key]: isCustomChecked ? null : "",
                  })
                }
              />
            </div>

            {isCustomChecked && (
              <div className="mt-2">
                <label htmlFor={inputId} className="text-xs font-medium text-foreground">
                  {copy.label}
                </label>
                <input
                  id={inputId}
                  type="text"
                  value={customValue}
                  onChange={(event) =>
                    onCustomDescriptionsChange({
                      ...customDescriptions,
                      [group.key]: event.target.value.slice(0, CUSTOM_ATMOSPHERE_MAX_LENGTH),
                    })
                  }
                  placeholder={copy.placeholder}
                  maxLength={CUSTOM_ATMOSPHERE_MAX_LENGTH}
                  aria-invalid={isEmpty}
                  className={`mt-1 w-full rounded-xl border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted focus:outline-none ${focusRing} ${
                    isEmpty ? "border-red-400/60" : "border-border"
                  }`}
                />
                {isEmpty && (
                  <p className="mt-1 text-xs text-red-300">
                    Escreva uma descrição para salvar, ou desmarque &quot;Outro&quot;.
                  </p>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
