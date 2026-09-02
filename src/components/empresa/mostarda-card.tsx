/**
 * Entrada discreta para a Mostarda — serviço externo e opcional de
 * posicionamento/marketing/presença digital para empresários, sem relação
 * com planos, destaque ou requisitos do Bora pra onde. Só aparece no
 * contexto empresarial (dashboard do estabelecimento), nunca no fluxo do
 * consumidor.
 *
 * Ainda não existe um destino real (página, WhatsApp ou URL da Mostarda)
 * no projeto — por isso o CTA fica desabilitado em vez de apontar para um
 * link inventado. Quando o destino existir, trocar o `<span>` abaixo por um
 * `<a>`/`<Link>` real.
 */
export function MostardaCard() {
  return (
    <section className="mt-10 rounded-2xl border border-border/80 bg-background-elevated/60 p-6">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">
        Quer melhorar ainda mais o seu negócio?
      </p>
      <p className="mt-2 text-sm text-foreground">
        A Mostarda pode ajudar sua empresa com posicionamento, marketing e presença digital.
      </p>
      <p className="mt-2 text-xs text-muted">
        Serviço independente e opcional — não é um plano do Bora pra onde nem requisito para
        aparecer na plataforma.
      </p>
      <span
        aria-disabled="true"
        title="Destino ainda não definido"
        className="mt-4 inline-flex w-fit cursor-not-allowed items-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm font-medium text-muted opacity-60"
      >
        Conhecer a Mostarda — em breve
      </span>
    </section>
  );
}
