"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Feedback = "gostei" | "nao_gostei";

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background";

function buttonClasses(active: boolean) {
  return `inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
    active
      ? "border-accent bg-accent text-accent-foreground"
      : "border-border text-muted hover:border-accent/60 hover:text-accent"
  } ${focusRing}`;
}

interface RecommendationFeedbackButtonProps {
  recommendationHistoryId: string;
}

/**
 * Feedback do usuário sobre uma recomendação específica — grava direto em
 * `recommendation_history.user_feedback` (coluna já existente, sem
 * migration nova). Autocontido e best-effort, mesmo padrão do
 * FavoriteButton: atualização otimista na tela, revertida se o Supabase
 * recusar (ex.: RLS sem policy de update ainda).
 */
export function RecommendationFeedbackButton({
  recommendationHistoryId,
}: RecommendationFeedbackButtonProps) {
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [pending, setPending] = useState(false);

  async function handleFeedback(value: Feedback) {
    if (pending) return;

    const previous = feedback;
    setPending(true);
    setFeedback(value);

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("recommendation_history")
        .update({ user_feedback: value })
        .eq("id", recommendationHistoryId);

      if (error) {
        console.error("RECOMMENDATION FEEDBACK ERROR:", error);
        setFeedback(previous);
      }
    } catch (error) {
      console.error("RECOMMENDATION FEEDBACK ERROR:", error);
      setFeedback(previous);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted">Essa recomendação foi útil?</span>
      <button
        type="button"
        onClick={() => handleFeedback("gostei")}
        disabled={pending}
        aria-pressed={feedback === "gostei"}
        title="Gostei"
        className={buttonClasses(feedback === "gostei")}
      >
        👍 Gostei
      </button>
      <button
        type="button"
        onClick={() => handleFeedback("nao_gostei")}
        disabled={pending}
        aria-pressed={feedback === "nao_gostei"}
        title="Não gostei"
        className={buttonClasses(feedback === "nao_gostei")}
      >
        👎 Não gostei
      </button>
    </div>
  );
}
