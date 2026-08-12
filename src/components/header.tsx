"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BrandLogo } from "@/components/shared/brand-logo";
import { useSelectedCity } from "@/lib/city-context";
import { useUser } from "@/lib/auth/auth-context";
import { createClient } from "@/lib/supabase/client";

const navLinks = [
  { label: "Descobrir", href: "/descobrir" },
  { label: "Buscar", href: "/buscar" },
  { label: "Para empresas", href: "/para-empresas" },
];

const mobileLinkClasses =
  "flex min-h-11 items-center rounded-lg px-4 py-3 text-base font-medium text-foreground transition-colors hover:bg-background hover:text-accent";

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

function MenuIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      className="h-6 w-6"
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const city = useSelectedCity();
  const user = useUser();
  const router = useRouter();

  // Trava o scroll do fundo e permite fechar com Esc enquanto o drawer
  // está aberto — comportamento padrão de drawer, não é funcionalidade
  // nova do produto.
  useEffect(() => {
    if (!menuOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen]);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    setMenuOpen(false);
    router.push("/");
    router.refresh();
  }

  function closeMenu() {
    setMenuOpen(false);
  }

  const displayName = user?.user_metadata?.full_name?.split(" ")[0] ?? user?.email ?? "";

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-2 sm:px-6">
          <Link href="/" className="flex items-center gap-3">
            {/* Menor só no mobile puro (abaixo de sm:) para liberar espaço
                vertical no topo da Home — de sm: em diante volta ao tamanho
                "medium" original, igual ao desktop. */}
            <BrandLogo
              variant="dark"
              size="medium"
              priority
              className="!h-10 !w-10 sm:!h-[72px] sm:!w-[72px] md:!h-[104px] md:!w-[104px]"
            />
            <span className="hidden items-center gap-1 rounded-full border border-border px-3 py-1 text-xs text-muted sm:flex">
              <PinIcon />
              {city}
            </span>
          </Link>

          <nav className="hidden items-center gap-6 md:flex" aria-label="Navegação principal">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-muted transition-colors hover:text-accent"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            {user ? (
              <div className="hidden items-center gap-3 sm:flex">
                <span className="text-sm text-muted">Olá, {displayName}</span>
                <Link
                  href="/perfil"
                  className="text-sm font-medium text-muted transition-colors hover:text-accent"
                >
                  Meu perfil
                </Link>
                <Link
                  href="/favoritos"
                  className="text-sm font-medium text-muted transition-colors hover:text-accent"
                >
                  Favoritos
                </Link>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="rounded-full border border-border px-4 py-2 text-sm font-medium text-muted transition-colors hover:border-accent/60 hover:text-accent"
                >
                  Sair
                </button>
              </div>
            ) : (
              <div className="hidden items-center gap-3 sm:flex">
                <Link
                  href="/cadastro"
                  className="text-sm font-medium text-muted transition-colors hover:text-accent"
                >
                  Criar conta
                </Link>
                <Link
                  href="/entrar"
                  className="rounded-full border border-accent/70 px-4 py-2 text-sm font-semibold text-accent transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  Entrar
                </Link>
              </div>
            )}
            <button
              type="button"
              disabled={false}
              onClick={() => setMenuOpen(true)}
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
              aria-label="Abrir menu"
              className="pointer-events-auto relative z-10 inline-flex items-center justify-center rounded-full border border-border p-2.5 text-foreground md:hidden"
            >
              <MenuIcon />
            </button>
          </div>
        </div>
      </header>

      {/* Overlay do menu mobile: irmão do <header>, não descendente dele —
          <header> tem backdrop-blur (backdrop-filter), que cria um novo
          containing block para descendentes position:fixed e já causou
          bug de sobreposição numa tentativa anterior. Renderização
          condicional simples (monta/desmonta), sem depender de transição
          CSS pra funcionar. Sem createPortal, sem animação: menos peças
          móveis, mais fácil de confirmar visualmente num dispositivo real.
          Estrutura: BACKDROP (z-[100]) → PAINEL opaco (z-[110]) → links
          filhos do próprio painel — nunca soltos sobre o backdrop/Home. */}
      {menuOpen && (
        <div className="fixed inset-0 z-[100] md:hidden">
          <div onClick={closeMenu} className="fixed inset-0 z-[100] bg-black/80" />

          <nav
            id="mobile-menu"
            aria-label="Navegação móvel"
            className="fixed top-0 right-0 bottom-0 z-[110] flex w-[min(85vw,360px)] flex-col gap-2 overflow-y-auto overscroll-contain border-l border-border/60 bg-background-elevated px-4 py-4 shadow-2xl"
          >
            <div className="mb-2 flex items-center justify-between gap-4">
              <span className="flex items-center gap-1 rounded-full border border-border px-3 py-1 text-xs text-muted">
                <PinIcon />
                {city}
              </span>
              <button
                type="button"
                onClick={closeMenu}
                aria-label="Fechar menu"
                className="inline-flex items-center justify-center rounded-full border border-border p-2.5 text-foreground transition-colors hover:border-accent hover:text-accent"
              >
                <CloseIcon />
              </button>
            </div>

            <Link href="/" onClick={closeMenu} className={mobileLinkClasses}>
              Home
            </Link>
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href} onClick={closeMenu} className={mobileLinkClasses}>
                {link.label}
              </Link>
            ))}
            <Link href="/empresa/cadastro" onClick={closeMenu} className={mobileLinkClasses}>
              Cadastrar estabelecimento
            </Link>

            {user ? (
              <>
                <span className="mt-1 px-4 text-sm text-muted">Olá, {displayName}</span>
                <Link href="/perfil" onClick={closeMenu} className={mobileLinkClasses}>
                  Meu perfil
                </Link>
                <Link href="/favoritos" onClick={closeMenu} className={mobileLinkClasses}>
                  Favoritos
                </Link>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="mt-2 min-h-11 rounded-full border border-border px-5 py-3 text-sm font-medium text-muted transition-colors hover:border-accent/60 hover:text-accent"
                >
                  Sair
                </button>
              </>
            ) : (
              <>
                <Link href="/cadastro" onClick={closeMenu} className={`${mobileLinkClasses} text-left`}>
                  Criar conta
                </Link>
                <Link
                  href="/entrar"
                  onClick={closeMenu}
                  className="mt-2 flex min-h-11 items-center justify-center rounded-full border border-accent/70 px-5 py-3 text-center text-sm font-semibold text-accent transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  Entrar
                </Link>
              </>
            )}
          </nav>
        </div>
      )}
    </>
  );
}
