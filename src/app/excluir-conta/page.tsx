import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Excluir conta | Bora pra onde",
  description: "Solicite a exclusão da sua conta e dos seus dados no Bora pra onde.",
};

export default function DeleteAccountPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <Link href="/" className="text-sm text-accent hover:underline">
        ← Voltar para a Home
      </Link>
      <article className="mt-8 space-y-8 text-muted">
        <header className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-accent">
            Solicitação de privacidade
          </p>
          <h1 className="text-3xl font-extrabold text-foreground sm:text-4xl">
            Excluir conta e dados
          </h1>
          <p>
            Esta página explica como solicitar a exclusão da sua conta do Bora pra onde.
          </p>
        </header>

        <section>
          <h2>Como solicitar</h2>
          <ol className="list-decimal space-y-2 pl-6">
            <li>Envie um e-mail para <a className="text-accent hover:underline" href="mailto:contato@borapraonde.app.br?subject=Solicita%C3%A7%C3%A3o%20de%20exclus%C3%A3o%20de%20conta">contato@borapraonde.app.br</a>.</li>
            <li>Use o assunto “Solicitação de exclusão de conta”.</li>
            <li>Informe o e-mail usado no cadastro para identificarmos a conta.</li>
          </ol>
          <p className="mt-4">
            Confirmaremos a solicitação e concluiremos a exclusão em até 30 dias, salvo quando a manutenção for exigida por lei.
          </p>
        </section>

        <section>
          <h2>O que será excluído</h2>
          <p>
            Excluiremos os dados associados à conta, como nome, e-mail, telefone, preferências, respostas, favoritos e histórico de interações. Conteúdos empresariais serão removidos ou desvinculados quando a solicitação vier do responsável pela conta empresarial.
          </p>
        </section>

        <section>
          <h2>O que pode ser mantido</h2>
          <p>
            Podemos manter registros necessários para cumprir obrigações legais, prevenir fraude, resolver disputas ou proteger a segurança da plataforma. Esses registros ficam restritos a essa finalidade e pelo período exigido, sendo eliminados depois.
          </p>
        </section>

        <section>
          <h2>Ajuda</h2>
          <p>
            Para dúvidas sobre privacidade ou sobre o andamento do pedido, escreva para o mesmo endereço de contato.
          </p>
        </section>
      </article>
    </main>
  );
}
