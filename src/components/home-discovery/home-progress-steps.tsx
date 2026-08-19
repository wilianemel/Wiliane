import type { HomeStepTheme } from "./home-step-theme";

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={3}
      className="h-3 w-3 sm:h-3.5 sm:w-3.5"
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="m5 12.5 4.5 4.5L19 7" />
    </svg>
  );
}

interface HomeProgressStepsProps {
  currentStep: number;
  themes: HomeStepTheme[];
}

/**
 * Variante visual do ProgressBar (src/components/discovery/progress-bar.tsx)
 * usada só pelo HomeMatchFlow — 5 indicadores fixos (um por etapa,
 * `themes.length`), nunca clicáveis (são <div>, não <button>/<Link>): não
 * existe forma de pular pergunta por aqui, só goBack/goNext no rodapé do
 * cartão continuam controlando a navegação real.
 */
export function HomeProgressSteps({ currentStep, themes }: HomeProgressStepsProps) {
  const totalSteps = themes.length;
  const activeTheme = themes[currentStep - 1];

  return (
    <div
      role="progressbar"
      aria-valuemin={1}
      aria-valuemax={totalSteps}
      aria-valuenow={currentStep}
      aria-label={`Progresso das perguntas: etapa ${currentStep} de ${totalSteps}, ${activeTheme?.label ?? ""}`}
    >
      <div className="flex items-baseline justify-between text-xs sm:text-sm">
        <span className="font-bold" style={{ color: activeTheme?.glow }}>
          {currentStep} de {totalSteps}
        </span>
        <span className="font-medium text-foreground">{activeTheme?.label}</span>
      </div>

      <div aria-hidden="true" className="mt-3 flex items-center">
        {themes.map((theme, index) => {
          const stepNumber = index + 1;
          const isDone = stepNumber < currentStep;
          const isCurrent = stepNumber === currentStep;

          return (
            <div key={theme.key} className="flex flex-1 items-center last:flex-none">
              <div
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-[10px] font-bold transition-all duration-300 sm:h-7 sm:w-7 sm:text-xs"
                style={{
                  borderColor: isDone ? "var(--accent)" : isCurrent ? theme.glow : "var(--border)",
                  backgroundColor: isDone ? "var(--accent)" : isCurrent ? theme.glowSoft : "transparent",
                  color: isDone ? "var(--accent-foreground)" : isCurrent ? theme.glow : "var(--muted)",
                  boxShadow: isCurrent ? `0 0 14px -2px ${theme.glowSoft}` : "none",
                }}
              >
                {isDone ? <CheckIcon /> : stepNumber}
              </div>
              {index < themes.length - 1 && (
                <div
                  className="mx-1 h-0.5 flex-1 rounded-full transition-colors duration-300 sm:mx-1.5"
                  style={{ backgroundColor: isDone ? "var(--accent)" : "var(--border)" }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
