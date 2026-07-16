import type { StepOption } from "@/types/discovery";

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background";

interface QuestionCardProps {
  name: string;
  question: string;
  helperText?: string;
  options: StepOption[];
  value: string | null;
  onChange: (id: string) => void;
  optional?: boolean;
}

export function QuestionCard({
  name,
  question,
  helperText,
  options,
  value,
  onChange,
  optional = false,
}: QuestionCardProps) {
  return (
    <fieldset>
      <legend className="text-lg font-semibold text-foreground sm:text-xl">
        {question}
        {optional && (
          <span className="ml-2 text-sm font-normal text-muted">(opcional)</span>
        )}
      </legend>
      {helperText && <p className="mt-1 text-sm text-muted">{helperText}</p>}

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {options.map((option) => {
          const inputId = `${name}-${option.id}`;
          const isChecked = value === option.id;

          return (
            <div key={option.id}>
              <input
                type="radio"
                id={inputId}
                name={name}
                value={option.id}
                checked={isChecked}
                onChange={() => onChange(option.id)}
                className="peer sr-only"
              />
              <label
                htmlFor={inputId}
                className={`block cursor-pointer rounded-xl border border-border bg-background-elevated px-4 py-3 text-sm font-medium text-foreground transition-colors hover:border-accent/60 peer-checked:border-accent peer-checked:bg-accent/10 peer-checked:text-accent ${focusRing} peer-focus-visible:ring-2`}
              >
                {option.label}
              </label>
            </div>
          );
        })}
      </div>
    </fieldset>
  );
}
