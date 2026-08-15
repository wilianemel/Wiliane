import Link from "next/link";
import { AdminGate } from "@/components/admin/admin-gate";

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background";

interface AdminSection {
  title: string;
  description: string;
  href: string;
}

const ADMIN_SECTIONS: AdminSection[] = [
  {
    title: "Estabelecimentos",
    description:
      "Gerenciar estabelecimentos, vincular proprietários e controlar selo de verificação.",
    href: "/admin/estabelecimentos",
  },
  {
    title: "Solicitações",
    description: "Analisar solicitações de gerenciamento de estabelecimentos.",
    href: "/admin/solicitacoes",
  },
];

export default function AdminPage() {
  return (
    <AdminGate>
      <AdminContent />
    </AdminGate>
  );
}

function AdminContent() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-14">
      <Link
        href="/perfil"
        className={`inline-flex items-center gap-2 text-sm font-medium text-muted transition-colors hover:text-accent ${focusRing} rounded`}
      >
        ← Voltar para o perfil
      </Link>

      <h1 className="mt-6 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
        Painel administrativo
      </h1>
      <p className="mt-2 text-sm text-muted">
        Ferramentas de gestão restritas à equipe do Qual é a Boa.
      </p>

      <div className="mt-8 flex flex-col gap-4">
        {ADMIN_SECTIONS.map((section) => (
          <Link
            key={section.href}
            href={section.href}
            className={`rounded-2xl border border-border bg-background-elevated p-6 transition-colors hover:border-accent ${focusRing}`}
          >
            <p className="text-base font-semibold text-foreground">{section.title}</p>
            <p className="mt-1 text-sm text-muted">{section.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
