const MOSTARDA_INSTAGRAM_URL = "https://www.instagram.com/mostarda369hz/";
const MOSTARDA_INSTAGRAM_HANDLE = "@mostarda369hz";

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background";

function InstagramIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      className="h-4 w-4"
      aria-hidden="true"
    >
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.3" cy="6.7" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

/**
 * CTA de marketing pra donos de estabelecimento — parceiro externo
 * (Mostarda), serviço separado do Qual é a Boa, não uma extensão do
 * cadastro/login. Reaproveitado em /entrar e /cadastro, sempre depois do
 * bloco de imagem+formulário (nunca compete visualmente com a
 * autenticação, que continua sendo o conteúdo principal da tela).
 */
export function BusinessMarketingCta() {
  return (
    <section className="px-4 py-8 sm:px-6 sm:py-10">
      <div className="relative mx-auto max-w-4xl overflow-hidden rounded-3xl border border-accent/30 bg-background-elevated p-6 shadow-lg shadow-black/20 sm:p-8">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-16 right-0 h-40 w-40 rounded-full bg-accent/10 blur-[70px]"
        />

        <div className="relative">
          <p className="text-lg font-bold text-foreground sm:text-xl">
            Seu estabelecimento merece ser descoberto.
          </p>
          <p className="mt-2 text-sm text-muted sm:text-base">
            Transforme sua presença digital em uma vitrine que atrai clientes, fortalece sua marca
            e faz o seu negócio ser lembrado.
          </p>
          <p className="mt-2 text-sm text-muted">
            Conte com especialistas para melhorar o marketing do seu estabelecimento e alcançar as
            pessoas certas.
          </p>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
            <a
              href={MOSTARDA_INSTAGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex items-center justify-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground transition-transform hover:scale-[1.02] ${focusRing}`}
            >
              Fale com um de nossos especialistas
            </a>
            <a
              href={MOSTARDA_INSTAGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex items-center gap-2 text-sm font-medium text-accent transition-colors hover:underline ${focusRing} rounded`}
            >
              <InstagramIcon />
              {MOSTARDA_INSTAGRAM_HANDLE}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
