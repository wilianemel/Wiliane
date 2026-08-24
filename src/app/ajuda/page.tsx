import Link from "next/link";

export default function HelpPage() {
  return <main className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 sm:py-16"><Link href="/" className="text-sm text-accent hover:underline">← Voltar para a Home</Link><div className="mt-8 space-y-4"><h1 className="text-3xl font-extrabold">Ajuda</h1><p className="text-muted">Precisa de ajuda com sua conta, estabelecimento ou plano?</p><a className="inline-flex rounded-full bg-accent px-5 py-3 font-semibold text-background hover:brightness-110" href="mailto:contato@qualeaboa.com.br">Falar com o suporte</a></div></main>;
}
