import type { StepOption } from "@/types/discovery";

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background";

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      className="h-3.5 w-3.5"
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="m5 12.5 4.5 4.5L19 7" />
    </svg>
  );
}

interface QuestionCardProps {
  name: string;
  question: string;
  helperText?: string;
  options: StepOption[];
  value: string | null;
  onChange: (id: string) => void;
  optional?: boolean;
}

/** Acima disso, duas colunas no celular ficam apertadas demais para o texto — cai para uma coluna só (o desktop continua com espaço de sobra em qualquer caso). */
const LONG_LABEL_THRESHOLD = 16;

/**
 * Opções como cartões grandes tocáveis, não campos de formulário — a pessoa
 * está dizendo "essa é a vibe que eu quero", não preenchendo um select. Sem
 * ícone por opção de propósito: StepOption não tem esse dado hoje
 * (types/discovery.ts) e inventar um mapeamento aqui seria além do polish
 * visual pedido. O estado selecionado usa preenchimento dourado + selo de
 * check, não só uma borda fina.
 */
export function QuestionCard({
  name,
  question,
  helperText,
  options,
  value,
  onChange,
  optional = false,
}: QuestionCardProps) {
  // Duas colunas quando o texto cabe confortavelmente; uma coluna no
  // celular quando qualquer opção é longa (ex.: faixas de preço) — nunca
  // baseado em qual pergunta é, só no texto real das opções.
  const hasLongLabel = options.some((option) => option.label.length > LONG_LABEL_THRESHOLD);

  return (
    <fieldset>
      <legend className="text-lg font-semibold text-foreground sm:text-xl">
        {question}
        {optional && (
          <span className="ml-2 text-sm font-normal text-muted">(opcional)</span>
        )}
      </legend>
      {helperText && <p className="mt-1 text-sm text-muted">{helperText}</p>}

      <div
        className={`mt-4 grid gap-2.5 sm:mt-5 sm:gap-3 ${
          hasLongLabel ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-2"
        }`}
      >
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
                className={`relative flex min-h-16 cursor-pointer items-center justify-center rounded-2xl border px-4 py-4 text-center text-sm font-semibold transition-all duration-150 ${
                  isChecked
                    ? "border-accent bg-accent/15 text-accent shadow-[0_0_24px_-10px_rgba(255,194,30,0.6)]"
                    : "border-border/70 bg-background-elevated text-foreground hover:-translate-y-0.5 hover:border-accent/50"
                } ${focusRing} peer-focus-visible:ring-2 active:scale-[0.98]`}
              >
                {option.label}
                {isChecked && (
                  <span
                    aria-hidden="true"
                    className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-accent-foreground"
                  >
                    <CheckIcon />
                  </span>
                )}
              </label>
            </div>
          );
        })}
      </div>
    </fieldset>
  );
}
