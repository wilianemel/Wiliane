"use client";

import { useState, type FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { PasswordInput } from "@/components/shared/password-input";
import { BusinessMarketingCta } from "@/components/auth/business-marketing-cta";

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background";

function ArrowLeftIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 12H5M11 18l-6-6 6-6" />
    </svg>
  );
}

// text-base (16px): abaixo disso o iOS Safari aplica zoom automático ao focar o campo.
const inputClasses = `w-full rounded-xl border border-border bg-background px-4 py-3 text-base text-foreground placeholder:text-muted focus:outline-none ${focusRing}`;

/**
 * Gradiente discreto — a foto já é escura e o rosto das pessoas fica no
 * terço superior; só uma sombra leve na base, onde a frase fica, sem
 * cobrir comida nem gente em nenhuma parte do quadro.
 */
const HERO_GRADIENT_STYLE = {
  backgroundImage: "linear-gradient(to top, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.15) 40%, rgba(0,0,0,0) 65%)",
};

export default function EntrarPage() {
  const router = useRouter();
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
          : "Não foi possível entrar agora. Tente novamente em instantes.",
      );
      setLoading(false);
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen flex-col">
      {/* Barra própria, fora do bloco de duas colunas — sempre no topo,
          nunca sobre a imagem, tanto no celular quanto no desktop. */}
      <div className="px-4 pt-4 sm:px-6 sm:pt-6">
        <Link
          href="/"
          className={`inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-medium text-muted transition-colors hover:border-accent hover:text-accent ${focusRing}`}
        >
          <ArrowLeftIcon />
          Voltar para a Home
        </Link>
      </div>

      <div className="flex flex-1 flex-col lg:flex-row">
        {/* Imagem no topo no celular, com recuo (mx-4/mt-4) pra as bordas
            arredondadas ficarem visíveis nos 4 cantos — sem recuo, os lados
            tocariam a borda da tela e o arredondamento sumiria ali. No
            desktop (lg:) o recuo e o arredondamento somem: a imagem vira
            uma coluna cheia, encostada na borda, esticando junto com o
            formulário (lg:h-auto + align-items:stretch do flex-row, mesmo
            padrão de /cadastro). */}
        <div className="relative mx-4 mt-4 h-[35vh] min-h-[240px] shrink-0 overflow-hidden rounded-3xl sm:mx-6 sm:mt-6 lg:mx-0 lg:mt-0 lg:h-auto lg:min-h-0 lg:w-1/2 lg:rounded-none">
          <Image
            src="/images/auth/login-japanese-experience.png"
            alt="Amigos dividindo sushi e sashimi à mesa de um restaurante japonês"
            fill
            priority
            sizes="(min-width: 1024px) 50vw, 100vw"
            className="object-cover"
          />
          <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={HERO_GRADIENT_STYLE} />
          <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8">
            <p className="max-w-sm text-xl font-semibold text-white drop-shadow-sm sm:text-2xl">
              Seu próximo rolê começa aqui.
            </p>
          </div>
        </div>

        <div className="flex flex-1 items-center justify-center px-4 py-10 sm:px-6 sm:py-14 lg:w-1/2">
          <div className="w-full max-w-md">
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Entrar</h1>
            <p className="mt-2 text-sm text-muted">
              Acesse sua conta para ver favoritos e recomendações personalizadas.
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

              <div>
                <label htmlFor="password" className="text-sm font-medium text-foreground">
                  Senha
                </label>
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
                <Link href="/cadastro" className="text-accent hover:underline">
                  Criar conta
                </Link>
              </p>
            </form>
          </div>
        </div>
      </div>

      <BusinessMarketingCta />
    </div>
  );
}
