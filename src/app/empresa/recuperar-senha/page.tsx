"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background";

const inputClasses = `w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted focus:outline-none ${focusRing}`;

export default function RecuperarSenhaPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email.trim() || loading) return;

    setLoading(true);

    const supabase = createClient();
    await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo:
        typeof window !== "undefined"
          ? `${window.location.origin}/empresa/entrar`
          : undefined,
    });

    // Sempre mostramos a mesma confirmação, exista ou não a conta — evita
    // revelar quais e-mails têm cadastro (mesmo comportamento do Supabase).
    setLoading(false);
    setSent(true);
  }

  if (sent) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center sm:px-6">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Verifique seu e-mail
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-muted">
          Se houver uma conta com o e-mail <strong className="text-foreground">{email}</strong>,
          enviamos um link para você redefinir sua senha.
        </p>
        <Link
          href="/empresa/entrar"
          className={`mt-8 inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground transition-transform hover:scale-[1.02] ${focusRing}`}
        >
          Voltar para o login
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 py-10 sm:px-6 sm:py-14">
      <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
        Recuperar senha
      </h1>
      <p className="mt-2 text-sm text-muted">
        Informe o e-mail da sua conta para receber um link de redefinição de senha.
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
            placeholder="voce@empresa.com"
            className={`mt-2 ${inputClasses}`}
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className={`mt-4 inline-flex items-center justify-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground transition-transform hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100 ${focusRing}`}
        >
          {loading ? "Enviando..." : "Enviar link de redefinição"}
        </button>

        <p className="text-center text-sm text-muted">
          Lembrou a senha?{" "}
          <Link href="/empresa/entrar" className="text-accent hover:underline">
            Entrar
          </Link>
        </p>
      </form>
    </div>
  );
}
