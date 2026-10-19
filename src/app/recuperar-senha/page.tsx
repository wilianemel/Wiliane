"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background";

const inputClasses = `w-full rounded-xl border border-border bg-background px-4 py-3 text-base text-foreground placeholder:text-muted focus:outline-none ${focusRing}`;

export default function RecuperarSenhaPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email.trim() || loading) return;

    setLoading(true);
    setErrorMessage(null);

    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo:
        typeof window !== "undefined"
          ? `${window.location.origin}/redefinir-senha`
          : undefined,
    });

    if (error) {
      setErrorMessage("Não foi possível enviar o link agora. Tente novamente em instantes.");
      setLoading(false);
      return;
    }

    // A mesma confirmação é exibida para qualquer e-mail para não revelar
    // quais endereços possuem cadastro na plataforma.
    setLoading(false);
    setSent(true);
  }

  if (sent) {
    return (
      <main className="mx-auto w-full max-w-md px-4 py-16 text-center sm:px-6">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Verifique seu e-mail</h1>
        <p className="mt-4 text-sm leading-relaxed text-muted">
          Se houver uma conta com o e-mail <strong className="text-foreground">{email}</strong>, enviamos um link para redefinir a senha.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          O link é válido por tempo limitado. Verifique também a caixa de spam.
        </p>
        <Link
          href="/entrar"
          className={`mt-8 inline-flex rounded-full bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground transition-transform hover:scale-[1.02] ${focusRing}`}
        >
          Voltar para o login
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-md px-4 py-16 sm:px-6">
      <Link href="/entrar" className={`text-sm text-muted hover:text-accent ${focusRing}`}>
        ← Voltar para o login
      </Link>
      <h1 className="mt-8 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Esqueceu a senha?</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        Informe o e-mail da sua conta. Enviaremos um link seguro para você criar uma nova senha.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
        <div>
          <label htmlFor="email" className="text-sm font-medium text-foreground">
            E-mail
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="voce@email.com"
            className={`mt-2 ${inputClasses}`}
            required
          />
        </div>

        {errorMessage && (
          <p className="rounded-xl border border-red-400/40 bg-red-400/5 px-4 py-3 text-sm text-red-300">
            {errorMessage}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className={`mt-4 inline-flex items-center justify-center rounded-full bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground transition-transform hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100 ${focusRing}`}
        >
          {loading ? "Enviando..." : "Enviar link de redefinição"}
        </button>
      </form>
    </main>
  );
}
