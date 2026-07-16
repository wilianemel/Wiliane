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
        <span>
          Etapa {currentStep} de {totalSteps}
        </span>
        <span className="font-medium text-foreground">{stepLabel}</span>
      </div>
      <div
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={totalSteps}
        aria-valuenow={currentStep}
        aria-label={`Progresso do formulário: etapa ${currentStep} de ${totalSteps}`}
        className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-border"
      >
        <div
          className="h-full rounded-full bg-accent transition-all duration-300 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
