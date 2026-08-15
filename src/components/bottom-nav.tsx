"use client";

import Link from "next/link";

interface NavItem {
  label: string;
  href: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Home", href: "/" },
  { label: "Explorar", href: "/descobrir" },
  { label: "Buscar", href: "/buscar" },
  { label: "Favoritos", href: "/favoritos" },
  { label: "Perfil", href: "/perfil" },
];

function HomeIcon({ active }: { active: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill={active ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={1.75}
      className="h-6 w-6"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 11.5 12 4l8 7.5M6 9.5V20h5v-5.5h2V20h5V9.5"
      />
    </svg>
  );
}

function CompassIcon({ active }: { active: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      className="h-6 w-6"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="8.5" />
      <path
        fill={active ? "currentColor" : "none"}
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m15 9-4.5 1.5L9 15l4.5-1.5L15 9Z"
      />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      className="h-6 w-6"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="6.5" />
      <path strokeLinecap="round" d="m20 20-3.2-3.2" />
    </svg>
  );
}

function HeartIcon({ active }: { active: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill={active ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={1.75}
      className="h-6 w-6"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 20.2s-7.2-4.6-9.5-9.1C1 8 2.3 4.8 5.6 4.1c2-.4 3.9.5 5 2.1a1 1 0 0 0 1.6 0c1.1-1.6 3-2.5 5-2.1C20.5 4.8 21.8 8 20.5 11c-2.3 4.5-8.5 9.2-8.5 9.2Z"
      />
    </svg>
  );
}

function UserIcon({ active }: { active: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      className="h-6 w-6"
      aria-hidden="true"
    >
      <circle cx="12" cy="8.5" r="3.5" fill={active ? "currentColor" : "none"} />
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 20c1.2-3.6 4-5.5 7-5.5s5.8 1.9 7 5.5" />
    </svg>
  );
}

const ICONS: Record<string, (props: { active: boolean }) => React.ReactNode> = {
  "/": HomeIcon,
  "/descobrir": CompassIcon,
  "/buscar": SearchIcon,
  "/favoritos": HeartIcon,
  "/perfil": UserIcon,
};

interface BottomNavProps {
  pathname: string;
}

/**
 * Navegação principal do app no mobile — só md:hidden, desktop continua
 * usando o Header. Fixa, respeita a safe-area do iPhone (env(safe-area-
 * inset-bottom), precisa de viewport-fit=cover em layout.tsx pra não ficar
 * sempre 0) e nunca cobre conteúdo porque AppShell reserva o espaço
 * equivalente com padding-bottom na página.
 */
export function BottomNav({ pathname }: BottomNavProps) {
  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-background-elevated/95 backdrop-blur-lg md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-auto flex h-16 max-w-lg items-stretch justify-between px-1">
        {NAV_ITEMS.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          const Icon = ICONS[item.href];
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`flex flex-1 flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-medium transition-colors ${
                active ? "text-accent" : "text-muted active:text-foreground"
              }`}
            >
              <Icon active={active} />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
