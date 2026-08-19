const WHATSAPP_URL = "https://wa.me/5512981865109";

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background";

/**
 * Contratação do plano Básico é sempre humana (conversa por WhatsApp, nunca
 * checkout automático no app — não existe gateway de pagamento configurado)
 * — este CTA é o único caminho de upgrade em toda a plataforma, reutilizado
 * onde o dono esbarra num limite do plano free (galeria, vídeo,
 * visualizações) ou escolhe o Básico no cadastro. Clicar aqui NUNCA ativa
 * o plano sozinho — é só um link `<a>` para o WhatsApp, sem RPC nenhuma.
 */
export function UpgradeToBasicoCta({
  className = "",
  label = "Quero o plano Básico",
}: {
  className?: string;
  label?: string;
}) {
  return (
    <a
      href={WHATSAPP_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-xs font-semibold text-accent-foreground transition-transform hover:scale-[1.02] ${focusRing} ${className}`}
    >
      {label}
    </a>
  );
}

export function UpgradeToBasicoNotice({
  className = "",
  label,
  supportText = "Fale com o Qual é a Boa pelo WhatsApp para contratar o plano Básico por R$ 97/mês.",
}: {
  className?: string;
  label?: string;
  supportText?: string;
}) {
  return (
    <div className={`rounded-xl border border-accent/40 bg-accent/5 p-4 ${className}`}>
      <p className="text-xs text-muted">{supportText}</p>
      <UpgradeToBasicoCta className="mt-3" label={label} />
    </div>
  );
}
