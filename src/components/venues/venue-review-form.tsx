"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useUser } from "@/lib/auth/auth-context";
import { createClient } from "@/lib/supabase/client";

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background";
const STAR_VALUES = [1, 2, 3, 4, 5];

type Status = "idle" | "saving" | "saved" | "error";

/**
 * Formulário de avaliação — só usuário autenticado (nunca anônimo).
 * Envia via upsert(venue_id, user_id): reenviar edita a própria avaliação
 * em vez de criar uma nova, o mesmo comportamento que a constraint
 * unique(venue_id, user_id) da migration 028 já impõe no banco.
 */
export function VenueReviewForm({
  venueId,
  onSubmitted,
}: {
  venueId: string;
  onSubmitted?: () => void;
}) {
  const user = useUser();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!user) {
    return (
      <p className="text-sm text-muted">
        <Link href="/entrar" className="text-accent hover:underline">
          Entre na sua conta
        </Link>{" "}
        para avaliar este lugar.
      </p>
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (rating < 1 || status === "saving" || !user) return;

    setStatus("saving");
    setErrorMessage(null);

    const supabase = createClient();
    const { error } = await supabase
      .from("reviews")
      .upsert(
        {
          venue_id: venueId,
          user_id: user.id,
          rating,
          comment: comment.trim() || null,
        },
        { onConflict: "venue_id,user_id" },
      );

    if (error) {
      setErrorMessage("Não foi possível enviar sua avaliação agora. Tente novamente.");
      setStatus("error");
      return;
    }

    setStatus("saved");
    onSubmitted?.();
  }

  if (status === "saved") {
    return <p className="text-sm text-foreground">Obrigado! Sua avaliação foi enviada.</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="flex items-center gap-1" role="radiogroup" aria-label="Sua nota">
        {STAR_VALUES.map((value) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={rating === value}
            aria-label={`${value} de 5 estrelas`}
            onClick={() => setRating(value)}
            className={`text-2xl leading-none transition-colors ${focusRing} rounded ${
              value <= rating ? "text-accent" : "text-border"
            }`}
          >
            ★
          </button>
        ))}
      </div>

      <textarea
        value={comment}
        onChange={(event) => setComment(event.target.value)}
        placeholder="Conte como foi sua experiência (opcional)."
        rows={3}
        className={`w-full resize-none rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted focus:outline-none ${focusRing}`}
      />

      {errorMessage && (
        <p className="rounded-xl border border-red-400/40 bg-red-400/5 px-4 py-2 text-xs text-red-300">
          {errorMessage}
        </p>
      )}

      <button
        type="submit"
        disabled={rating < 1 || status === "saving"}
        className={`inline-flex w-fit items-center justify-center gap-2 rounded-full bg-accent px-5 py-2 text-sm font-semibold text-accent-foreground transition-transform hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100 ${focusRing}`}
      >
        {status === "saving" ? "Enviando..." : "Enviar avaliação"}
      </button>
    </form>
  );
}
