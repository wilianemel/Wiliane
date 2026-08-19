import type { ReactNode } from "react";
import type { StepOption } from "@/types/discovery";
import type { HomeStepTheme } from "./home-step-theme";

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background";

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      className="h-3.5 w-3.5"
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="m5 12.5 4.5 4.5L19 7" />
    </svg>
  );
}

interface HomeQuestionCardProps {
  name: string;
  theme: HomeStepTheme;
  question: string;
  options: StepOption[];
  value: string | null;
  onChange: (id: string) => void;
  /** Emoji por id de opção (INTENTION_ICONS, COMPANION_ICONS, ATMOSPHERE_ICONS) — puramente visual. */
  icons?: Record<string, string>;
  /** Selo visual alternativo ao emoji (usado por Orçamento e Distância) — recebe a opção e seu índice na lista, já na ordem crescente definida em steps.ts. */
  renderBadge?: (option: StepOption, index: number) => ReactNode;
}

/** Acima disso, duas colunas no celular ficam apertadas demais para o texto — cai para uma coluna só (o desktop continua com espaço de sobra em qualquer caso). */
const LONG_LABEL_THRESHOLD = 16;

/**
 * Variante visual do QuestionCard (src/components/discovery/question-card.tsx)
 * usada só pelo HomeMatchFlow (questionário de 5 etapas da Home) — o
 * QuestionCard original continua intacto e é quem outras telas usariam se
 * algum dia voltassem a renderizar DiscoveryFlow/HomeDiscoveryFlow.
 *
 * Cada etapa ganha um cabeçalho temático (ícone grande + nome da etapa +
 * pergunta + frase de orientação) e cartões de opção com emoji, brilho e
 * animação de seleção específicos da etapa — mas o valor real de cada
 * opção continua sendo só `option.id`, o mesmo de sempre.
 */
export function HomeQuestionCard({
  name,
  theme,
  question,
  options,
  value,
  onChange,
  icons,
  renderBadge,
}: HomeQuestionCardProps) {
  const hasLongLabel = options.some((option) => option.label.length > LONG_LABEL_THRESHOLD);

  return (
    <fieldset>
      <div className="flex items-start gap-4">
        <div
          aria-hidden="true"
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-2xl shadow-inner sm:h-16 sm:w-16 sm:text-3xl"
          style={{
            backgroundColor: theme.glowSoft,
            boxShadow: `0 0 24px -6px ${theme.glowSoft}`,
          }}
        >
          {theme.icon}
        </div>
        <div className="min-w-0 pt-0.5">
          <p
            className="text-xs font-bold uppercase tracking-[0.16em] sm:text-sm"
            style={{ color: theme.glow }}
          >
            {theme.label}
          </p>
          <legend className="mt-1 text-lg font-semibold leading-snug text-foreground sm:text-xl">
            {question}
          </legend>
          <p className="mt-1 text-sm text-muted">{theme.helper}</p>
        </div>
      </div>

      <div
        className={`mt-5 grid gap-2.5 sm:mt-6 sm:gap-3 ${
          hasLongLabel ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-2"
        }`}
      >
        {options.map((option, index) => {
          const inputId = `${name}-${option.id}`;
          const isChecked = value === option.id;
          const emoji = icons?.[option.id];

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
                className={`relative flex min-h-[64px] cursor-pointer flex-col items-center justify-center gap-1.5 rounded-2xl border px-3 py-4 text-center text-sm font-semibold transition-all duration-200 ${
                  isChecked
                    ? "scale-[1.02] border-2 bg-white/[0.08] text-foreground shadow-lg"
                    : "border-white/10 bg-white/[0.03] text-foreground/90 hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.05]"
                } ${focusRing} peer-focus-visible:ring-2 active:scale-[0.97]`}
                style={
                  isChecked
                    ? { borderColor: theme.glow, boxShadow: `0 8px 28px -10px ${theme.glowSoft}` }
                    : undefined
                }
              >
                {renderBadge ? (
                  renderBadge(option, index)
                ) : emoji ? (
                  <span aria-hidden="true" className="text-2xl leading-none">
                    {emoji}
                  </span>
                ) : null}
                <span>{option.label}</span>

                {isChecked && (
                  <span
                    aria-hidden="true"
                    className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full text-accent-foreground"
                    style={{ backgroundColor: theme.glow }}
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
