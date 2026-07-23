/**
 * Botão sempre desabilitado nesta etapa: não há integração ativa com o
 * Instagram, então não abrimos link nenhum nem simulamos uma conexão real.
 */
export function InstagramImportCard() {
  return (
    <div className="flex flex-col items-start gap-4 rounded-2xl border border-border bg-background-elevated p-5 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-semibold text-foreground">Importar do Instagram</h3>
          <span className="rounded-full border border-border px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-muted">
            Em breve
          </span>
        </div>
        <p className="mt-1 text-sm text-muted">
          Conecte sua conta profissional e escolha seus próprios Reels.
        </p>
      </div>
      <button
        type="button"
        disabled
        aria-disabled="true"
        title="Disponível em breve"
        className="inline-flex shrink-0 cursor-not-allowed items-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm font-semibold text-muted opacity-60"
      >
        Importar do Instagram
      </button>
    </div>
  );
}
