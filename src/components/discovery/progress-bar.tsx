interface ProgressBarProps {
  currentStep: number;
  totalSteps: number;
  stepLabel: string;
}

export function ProgressBar({ currentStep, totalSteps, stepLabel }: ProgressBarProps) {
  const percentage = Math.round((currentStep / totalSteps) * 100);

  return (
    <div>
      <div className="flex items-center justify-between text-xs text-muted sm:text-sm">
        <span className="font-semibold text-accent">
          {currentStep} de {totalSteps}
        </span>
        <span className="font-medium text-foreground">{stepLabel}</span>
      </div>
      <div
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={totalSteps}
        aria-valuenow={currentStep}
        aria-label={`Progresso das perguntas: etapa ${currentStep} de ${totalSteps}`}
        className="mt-2 h-2 w-full overflow-hidden rounded-full bg-border"
      >
        <div
          className="h-full rounded-full bg-accent shadow-[0_0_10px_-1px_rgba(255,194,30,0.7)] transition-all duration-300 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
