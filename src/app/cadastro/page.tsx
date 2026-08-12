"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background";

// text-base (16px): abaixo disso o iOS Safari aplica zoom automático ao focar o campo.
const inputClasses = `w-full rounded-xl border border-border bg-background px-4 py-3 text-base text-foreground placeholder:text-muted focus:outline-none ${focusRing}`;

type Status = "idle" | "loading" | "error";

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
    <div className="mx-auto max-w-md px-4 py-10 sm:px-6 sm:py-14">
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
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Mínimo de 6 caracteres"
            minLength={6}
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
          disabled={!canSubmit}
          className={`mt-4 inline-flex items-center justify-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground transition-transform hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100 ${focusRing}`}
        >
          {status === "loading" ? "Criando conta..." : "Criar conta"}
        </button>
      </form>
    </div>
  );
}
