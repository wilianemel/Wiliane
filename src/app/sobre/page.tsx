import Link from "next/link";

export default function AboutPage() {
  return <main className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 sm:py-16"><Link href="/" className="text-sm text-accent hover:underline">← Voltar para a Home</Link><div className="mt-8 space-y-4"><h1 className="text-3xl font-extrabold">Sobre o Qual é a Boa</h1><p className="text-muted">O Qual é a Boa ajuda você a descobrir lugares e experiências que combinam com o seu momento.</p><p className="text-muted">Menos tempo procurando. Mais tempo vivendo.</p></div></main>;
}
