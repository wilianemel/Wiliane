"use client";

import { useState } from "react";
import { BrandLogo } from "@/components/shared/brand-logo";
import { useSelectedCity } from "@/lib/city-context";

const navLinks = [
  { label: "Descobrir", href: "#intencoes" },
  { label: "Buscar", href: "#busca" },
  { label: "Para empresas", href: "#empresas" },
];

function PinIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 21s-6.5-5.6-6.5-11A6.5 6.5 0 0 1 18.5 10c0 5.4-6.5 11-6.5 11Z"
      />
      <circle cx="12" cy="10" r="2.25" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function MenuIcon({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      className="h-6 w-6"
      aria-hidden="true"
    >
      {open ? (
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6L6 18" />
      ) : (
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M4 12h16M4 17h16" />
      )}
    </svg>
  );
}

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const city = useSelectedCity();

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-2 sm:px-6">
        <a href="#hero" className="flex items-center gap-3">
          <BrandLogo variant="dark" size="medium" priority />
          <span className="hidden items-center gap-1 rounded-full border border-border px-3 py-1 text-xs text-muted sm:flex">
            <PinIcon />
            {city}
          </span>
        </a>

        <nav className="hidden items-center gap-6 md:flex" aria-label="Navegação principal">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-muted transition-colors hover:text-accent"
            >
              {link.label}
            </a>
          ))}
          <button
            type="button"
            title="Disponível em breve"
            className="text-sm font-medium text-muted transition-colors hover:text-accent"
          >
            Favoritos
          </button>
        </nav>

        <div className="flex items-center gap-2">
          <button
            type="button"
            title="Acesso disponível em breve"
            className="hidden rounded-full border border-accent/70 px-4 py-2 text-sm font-semibold text-accent transition-colors hover:bg-accent hover:text-accent-foreground sm:inline-flex"
          >
            Entrar
          </button>
          <button
            type="button"
            onClick={() => setMenuOpen((prev) => !prev)}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
            className="inline-flex items-center justify-center rounded-full border border-border p-2 text-foreground md:hidden"
          >
            <MenuIcon open={menuOpen} />
          </button>
        </div>
      </div>

      {menuOpen && (
        <nav
          id="mobile-menu"
          aria-label="Navegação móvel"
          className="flex flex-col gap-1 border-t border-border/60 bg-background px-4 py-3 md:hidden"
        >
          <span className="mb-2 flex items-center gap-1 text-xs text-muted">
            <PinIcon />
            {city}
          </span>
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className="rounded-lg px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-background-elevated hover:text-accent"
            >
              {link.label}
            </a>
          ))}
          <button
            type="button"
            title="Disponível em breve"
            className="rounded-lg px-3 py-2 text-left text-sm font-medium text-foreground transition-colors hover:bg-background-elevated hover:text-accent"
          >
            Favoritos
          </button>
          <button
            type="button"
            title="Acesso disponível em breve"
            className="mt-2 rounded-full border border-accent/70 px-4 py-2 text-sm font-semibold text-accent transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            Entrar
          </button>
        </nav>
      )}
    </header>
  );
}
