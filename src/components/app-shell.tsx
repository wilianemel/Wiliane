"use client";

import { usePathname } from "next/navigation";
import { BottomNav } from "@/components/bottom-nav";

/**
 * Rotas fora da navegação principal do consumidor — não ganham a bottom
 * nav por cima. Duas categorias:
 * - painel da empresa (/empresa) e painel admin (/admin): já têm seu
 *   próprio cabeçalho/"Voltar", são um "modo" diferente do app;
 * - autenticação (/entrar, /cadastro, /empresa/recuperar-senha — coberta
 *   pelo prefixo /empresa acima): telas de entrada/saída, não fazem
 *   sentido com abas de navegação por cima.
 */
const BOTTOM_NAV_HIDDEN_PREFIXES = ["/empresa", "/admin", "/entrar", "/cadastro", "/recuperar-senha"];

/**
 * Casca global do app: decide, uma única vez por navegação, se a bottom nav
 * mobile aparece e reserva o espaço equivalente (padding-bottom + safe-area)
 * no conteúdo — nunca deixa a nav fixa sobrepor a página. Client component
 * só por causa do usePathname(); os filhos continuam sendo Server
 * Components normalmente renderizados pelo App Router.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "/";
  const hideBottomNav = BOTTOM_NAV_HIDDEN_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  return (
    <>
      <div className={hideBottomNav ? undefined : "pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0"}>
        {children}
      </div>
      {!hideBottomNav && <BottomNav pathname={pathname} />}
    </>
  );
}
