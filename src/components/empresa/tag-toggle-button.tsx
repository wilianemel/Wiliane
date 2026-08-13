"use client";

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background";

/** Alterna um valor dentro de uma lista — usado pelos grupos de checkbox de tags do painel empresa. */
export function toggleValue<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

/**
 * Botão de seleção múltipla usado nos grupos de tags do painel empresa
 * (ambiente, companhias, momento). Extraído de `experience-questions.tsx`
 * para ser reaproveitado também em `editar/page.tsx`, sem duplicar a
 * mesma definição nos dois arquivos.
 */
export function TagToggleButton({
  label,
  isActive,
  onClick,
}: {
  label: string;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={isActive}
      onClick={onClick}
      className={`rounded-xl border px-4 py-3 text-sm font-medium transition-colors ${focusRing} ${
        isActive
          ? "border-accent bg-accent/10 text-accent"
          : "border-border text-foreground hover:border-accent/60"
      }`}
    >
      {label}
    </button>
  );
}
