"use client";

import { Suspense, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { PasswordInput } from "@/components/shared/password-input";

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background";

// text-base (16px): abaixo disso o iOS Safari aplica zoom automático ao focar o campo.
const inputClasses = `w-full rounded-xl border border-border bg-background px-4 py-3 text-base text-foreground placeholder:text-muted focus:outline-none ${focusRing}`;

/** Únicos destinos internos aceitos em ?next= — nunca um domínio externo, nunca um caminho fora dessa lista. */
const ALLOWED_NEXT_PATHS = ["/empresa/painel", "/empresa/reivindicar"];

function resolveNextPath(next: string | null): string {
  if (next && ALLOWED_NEXT_PATHS.includes(next)) {
    return next;
  }
  return "/empresa/painel";
}

export default function EntrarEmpresaPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-md px-4 py-16 text-center sm:px-6">
          <div
            aria-hidden="true"
            className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-border border-t-accent"
          />
        </div>
      }
    >
      <EntrarEmpresaContent />
    </Suspense>
  );
}

function EntrarEmpresaContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = resolveNextPath(searchParams.get("next"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email.trim() || !password || loading) return;

    setLoading(true);
    setErrorMessage(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      setErrorMessage(
        error.message.toLowerCase().includes("invalid")
          ? "E-mail ou senha incorretos."
          : error.message.toLowerCase().includes("confirm")
            ? "Confirme seu e-mail antes de entrar — verifique sua caixa de entrada."
            : "Não foi possível entrar agora. Tente novamente em instantes.",
      );
      setLoading(false);
      return;
    }

    router.push(nextPath);
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-md px-4 py-10 sm:px-6 sm:py-14">
      <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
        Entrar na sua empresa
      </h1>
      <p className="mt-2 text-sm text-muted">
        Acesse o painel para gerenciar seu estabelecimento.
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

        <div>
          <div className="flex items-center justify-between">
            <label htmlFor="password" className="text-sm font-medium text-foreground">
              Senha
            </label>
            <Link
              href="/empresa/recuperar-senha"
              className="text-xs font-medium text-accent hover:underline"
            >
              Esqueceu a senha?
            </Link>
          </div>
          <PasswordInput
            id="password"
            autoComplete="current-password"
            value={password}
            onChange={setPassword}
            placeholder="Sua senha"
            wrapperClassName="mt-2"
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
          className={`mt-4 inline-flex items-center justify-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground transition-transform hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100 ${focusRing}`}
        >
          {loading ? "Entrando..." : "Entrar"}
        </button>

        <p className="text-center text-sm text-muted">
          Ainda não tem conta?{" "}
          <Link
            href={
              nextPath === "/empresa/reivindicar"
                ? "/empresa/cadastro?fluxo=existente"
                : "/empresa/cadastro?fluxo=novo"
            }
            className="text-accent hover:underline"
          >
            Cadastrar minha empresa
          </Link>
        </p>
      </form>
    </div>
  );
}
