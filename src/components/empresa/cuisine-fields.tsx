"use client";

import { CUISINE_TAG_GROUPS, CUSTOM_CUISINE_MAX_LENGTH } from "@/lib/venues/venue-cuisine";
import { TagToggleButton, toggleValue } from "@/components/empresa/tag-toggle-button";

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background";

interface CuisineFieldsProps {
  /** Só opções fixas (marcadas) + eventual texto legado preservado — nunca o valor de "Outro", que vive em `customDescription`. */
  cuisineTypes: string[];
  onCuisineTypesChange: (next: string[]) => void;
  /** `null` = "Outro" desmarcado; string (mesmo vazia) = marcado, com o texto digitado até agora. */
  customDescription: string | null;
  onCustomDescriptionChange: (next: string | null) => void;
}

/**
 * Culinária brasileira + internacional (seleção múltipla, dois grupos
 * fixos) + "Outro" com campo de texto livre — substitui o campo de texto
 * único que existia antes. Reaproveitado nas 3 telas do fluxo empresarial
 * (cadastro novo, preenchimento de estabelecimento existente, edição no
 * painel) para não duplicar a mesma lógica de "Outro" três vezes — mesmo
 * espírito de AtmosphereGroupFields, mas com um único grupo de "Outro"
 * (não um por grupo).
 */
export function CuisineFields({
  cuisineTypes,
  onCuisineTypesChange,
  customDescription,
  onCustomDescriptionChange,
}: CuisineFieldsProps) {
  const isCustomChecked = customDescription !== null;
  const customValue = customDescription ?? "";
  const isCustomEmpty = isCustomChecked && customValue.trim().length === 0;

  return (
    <div>
      <p className="text-sm text-muted">Escolha as culinárias que seu estabelecimento oferece.</p>

      <div className="mt-3 flex flex-col gap-5">
        {CUISINE_TAG_GROUPS.map((group) => (
          <div key={group.title}>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
              {group.title}
            </p>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {group.options.map((option) => (
                <TagToggleButton
                  key={option.id}
                  label={option.label}
                  isActive={cuisineTypes.includes(option.id)}
                  onClick={() => onCuisineTypesChange(toggleValue(cuisineTypes, option.id))}
                />
              ))}
            </div>
          </div>
        ))}

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Outro</p>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
            <TagToggleButton
              label="Outro"
              isActive={isCustomChecked}
              onClick={() => onCustomDescriptionChange(isCustomChecked ? null : "")}
            />
          </div>

          {isCustomChecked && (
            <div className="mt-2">
              <label htmlFor="cuisine-custom-description" className="text-xs font-medium text-foreground">
                Qual culinária ou especialidade seu estabelecimento oferece?
              </label>
              <input
                id="cuisine-custom-description"
                type="text"
                value={customValue}
                onChange={(event) =>
                  onCustomDescriptionChange(event.target.value.slice(0, CUSTOM_CUISINE_MAX_LENGTH))
                }
                placeholder="Ex.: Culinária peruana, vegana, low carb..."
                maxLength={CUSTOM_CUISINE_MAX_LENGTH}
                aria-invalid={isCustomEmpty}
                className={`mt-1 w-full rounded-xl border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted focus:outline-none ${focusRing} ${
                  isCustomEmpty ? "border-red-400/60" : "border-border"
                }`}
              />
              {isCustomEmpty && (
                <p className="mt-1 text-xs text-red-300">
                  Escreva uma culinária ou especialidade, ou desmarque &quot;Outro&quot;.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
