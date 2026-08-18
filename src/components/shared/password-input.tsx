"use client";

import { useState } from "react";

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background";

const passwordFieldClasses =
  "w-full rounded-xl border border-border bg-background py-3 pl-4 pr-11 text-base text-foreground placeholder:text-muted focus:outline-none";

function EyeIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.5 12S6 5 12 5s9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7Z"
      />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 3l18 18M10.6 10.6a3 3 0 0 0 4.24 4.24M6.6 6.7C4.2 8.2 2.5 12 2.5 12s3.5 7 9.5 7c1.8 0 3.3-.5 4.6-1.3M9.9 5.2A10.7 10.7 0 0 1 12 5c6 0 9.5 7 9.5 7-.4.8-1 1.8-1.8 2.8"
      />
    </svg>
  );
}

interface PasswordInputProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: "current-password" | "new-password";
  placeholder?: string;
  minLength?: number;
  required?: boolean;
  /** Aplicada no wrapper (ex.: "mt-2") — o campo já tem seu próprio estilo completo embutido. */
  wrapperClassName?: string;
}

/**
 * Campo de senha com botão de olho para alternar visibilidade — reaproveitado
 * pelas 4 telas de autenticação com campo de senha (/entrar, /cadastro,
 * /empresa/entrar, /empresa/cadastro). Começa sempre oculto; o botão é
 * type="button" (nunca envia o formulário) e só alterna type text/password +
 * aria-label, sem mudar autocomplete nem qualquer outro comportamento do campo.
 */
export function PasswordInput({
  id,
  value,
  onChange,
  autoComplete,
  placeholder,
  minLength,
  required = false,
  wrapperClassName = "",
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className={`relative ${wrapperClassName}`}>
      <input
        id={id}
        type={visible ? "text" : "password"}
        autoComplete={autoComplete}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        minLength={minLength}
        required={required}
        className={`${passwordFieldClasses} ${focusRing}`}
      />
      <button
        type="button"
        onClick={() => setVisible((current) => !current)}
        aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
        className={`absolute right-1.5 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-muted transition-colors hover:text-accent ${focusRing}`}
      >
        {visible ? <EyeOffIcon /> : <EyeIcon />}
      </button>
    </div>
  );
}
