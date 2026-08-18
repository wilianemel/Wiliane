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

type Status = "idle" | "loading" | "error";

/**
 * Gradiente concentrado na base da foto (onde fica a frase de efeito) — o
 * casal e as parreiras ficam no meio do quadro, o pôr do sol no topo;
 * escurecer só a base preserva os dois bem visíveis.
 */
const HERO_GRADIENT_STYLE = {
  backgroundImage:
    "linear-gradient(to top, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.25) 35%, rgba(0,0,0,0) 65%)",
};

export default function CadastroConsumidorPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const canSubmit =
    fullName.trim().length > 0 && email.trim().length > 0 && password.length >= 6 && status !== "loading";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;

    setStatus("loading");
    setErrorMessage(null);

    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          full_name: fullName.trim(),
          account_type: "customer",
        },
      },
    });

    if (error) {
      // Nunca expor o erro técnico do Supabase — só uma mensagem amigável.
      setErrorMessage(
        error.message.toLowerCase().includes("already registered") ||
          error.message.toLowerCase().includes("already exists")
          ? "Já existe uma conta com este e-mail. Tente entrar em vez de criar uma nova."
          : "Não foi possível criar sua conta agora. Verifique os dados e tente novamente.",
      );
      setStatus("error");
      return;
    }

    // Confirmação de e-mail está desligada no projeto — signUp() já retorna
    // uma sessão válida, que o SDK persiste sozinho (AuthProvider reflete
    // isso via onAuthStateChange). Sem sessão (caso raro/defensivo), manda
    // pro login em vez de qualquer tela de "confirme seu e-mail".
    if (data.session) {
      router.push("/");
      router.refresh();
    } else {
      router.push("/entrar");
    }
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
        {/* Imagem no topo no celular; painel dividido ao lado do formulário
            no desktop (lg:h-auto some com a altura fixa mobile e deixa o
            flex-row esticar este painel pra acompanhar a altura do
            formulário — ver align-items:stretch, padrão do flex). */}
        <div className="relative h-[38vh] min-h-[260px] w-full shrink-0 overflow-hidden lg:h-auto lg:min-h-0 lg:w-1/2">
          <Image
            src="/images/auth/signup-vineyard-picnic.png"
            alt="Casal sorrindo num piquenique ao pôr do sol, entre as parreiras de uma vinícola"
            fill
            priority
            sizes="(min-width: 1024px) 50vw, 100vw"
            className="object-cover"
          />
          <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={HERO_GRADIENT_STYLE} />
          <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8">
            <p className="max-w-sm text-xl font-semibold text-white drop-shadow-sm sm:text-2xl">
              Viva experiências que merecem ser lembradas.
            </p>
          </div>
        </div>

        <div className="flex flex-1 items-center justify-center px-4 py-10 sm:px-6 sm:py-14 lg:w-1/2">
          <div className="w-full max-w-md">
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Criar conta</h1>
            <p className="mt-2 text-sm text-muted">
              Crie sua conta para salvar favoritos e receber recomendações personalizadas.
            </p>

            <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
              <div>
                <label htmlFor="full-name" className="text-sm font-medium text-foreground">
                  Nome completo
                </label>
                <input
                  id="full-name"
                  type="text"
                  autoComplete="name"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  placeholder="Seu nome completo"
                  className={`mt-2 ${inputClasses}`}
                  required
                />
              </div>

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
                  autoComplete="new-password"
                  value={password}
                  onChange={setPassword}
                  placeholder="Mínimo de 6 caracteres"
                  minLength={6}
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
                disabled={!canSubmit}
                className={`mt-4 inline-flex items-center justify-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground transition-transform hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100 ${focusRing}`}
              >
                {status === "loading" ? "Criando conta..." : "Criar conta"}
              </button>
            </form>
          </div>
        </div>
      </div>

      <BusinessMarketingCta />
    </div>
  );
}
