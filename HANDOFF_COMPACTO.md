# Bora pra onde — Handoff compacto

Documento para abrir uma nova conversa e retomar o projeto sem carregar todo o histórico.

## Projeto e stack

- Plataforma de descoberta de experiências locais (bares, restaurantes e eventos) em São José dos Campos e Vale do Paraíba.
- Next.js 16 App Router, React 19, TypeScript, Supabase, Vercel e GitHub.
- PWA já preparada e publicada no commit `06dd207`; ainda não há publicação nas lojas Apple/Google.

## Como trabalhar com a Wiliane

- Ela é leiga em TI: explicar de forma simples, uma etapa por vez, dizendo exatamente onde clicar.
- Para SQL: enviar somente um bloco pequeno, executável e completo por vez; sem comentários misturados dentro do bloco. Esperar o resultado (“success” ou erro) antes do próximo.
- Nunca enviar migrations monolíticas com milhares de linhas.
- Resumir o que cada comando faz depois que ela executar.
- Nunca dizer que algo foi aplicado, testado, commitado ou enviado se isso não foi comprovado.
- Não aplicar SQL remoto, não fazer commit/push e não apagar dados sem autorização explícita.
- Preservar dados; preferir migrações seguras e soft-delete. Não apagar arquivos de mídia do Storage sem autorização.

## Estado de produção conhecido

- Último commit conhecido publicado: `06dd207` — preparação para instalação como aplicativo (manifest, service worker, ícones, metadata e safe-area).
- Commits públicos recentes também incluem correções de busca/mídia e proteção das páginas públicas (`0366f48`, `13d788f`, `ee18e52`, `a8f9bf9`, `0123a08`).
- Não presumir que a árvore local esteja limpa: existem trabalhos anteriores que podem permanecer não publicados. Nunca usar reset destrutivo.

## PWA e lojas

- A aplicação pode ser instalada pelo navegador como PWA.
- Apple Developer exigiu US$99/ano e cartão internacional; Google Play exigiu verificação, telefone, D-U-N-S e dispositivo Android. Wiliane não tem Android; Júnior também não. As lojas ficaram bloqueadas por enquanto.
- Estratégia atual: manter a PWA funcionando e retomar lojas quando as verificações/pagamentos forem possíveis.

## Fluxo do usuário e proprietário

- Proprietário de estabelecimento existente: procura o local, cria ou acessa sua conta, completa os campos faltantes e envia fotos/vídeos. Não deve existir aprovação manual nem e-mail obrigatório de confirmação.
- Novo estabelecimento: fluxo separado “Cadastrar novo estabelecimento”.
- Publicação automática somente quando a checklist obrigatória estiver completa (dados básicos, categoria/experiência, horários, vídeo e contato). Foto de capa deixou de ser requisito.
- Um mesmo e-mail pode ser conta de usuário e também gerenciar empresa.
- Duplicatas exatas devem ser bloqueadas; dados existentes devem ser preservados.

## Mídias

- Vídeo: até 100 MB e 60 segundos; MP4, WebM, MOV/QuickTime, HEVC/H.265.
- Imagens: JPG, PNG, WebP, HEIC/HEIF.
- No painel, galerias e vídeos usam formato vertical 9:16 com `object-cover`.
- Busca mostra logo + foto principal/capa. Ao abrir o perfil público, mostrar vídeo primeiro e depois fotos da galeria.
- Upload de vídeo e foto chegou a funcionar após corrigir ambiguidades nas RPCs. Se falhar novamente, capturar a mensagem real exibida e verificar se a migration correspondente foi aplicada.

## Planos comerciais (estado mais recente)

Valores internos usam `plan_type='basic'`, mas o nome visível é **Plano Essencial**.

| Plano | Fotos | Vídeos | Regra/preço |
|---|---:|---:|---|
| Free | 2 | 1 | Grátis; até 300 visualizações em recomendações. Depois continua em Busca/Explorar, mas deixa de ser recomendado até contratar plano pago. |
| Partner | 3 | 2 | Clientes do Júnior; grátis por 90 dias, depois cai para Free e o excedente é retirado por soft-delete. |
| Essencial | 4 | 3 | R$97/mês. |
| Master | 6 | 5 | R$187/mês; dashboard e Diagnóstico do estabelecimento a cada 30 dias, por regras inteligentes (sem IA por enquanto). |

- Upgrade e contratação: WhatsApp [12 98186-5109](https://wa.me/5512981865109).

## Funcionalidades já feitas

- 645 cidades do estado de São Paulo com autocomplete.
- Campo de culinária enxuto: Brasileira, Internacional e Outro; busca com sinônimos (ex.: sushi, sashimi, temaki, ramen → japonesa).
- Imagens nas telas principais, login/cadastro empresarial, CTA comercial e painel do proprietário.
- PWA com `manifest.webmanifest`, `sw.js`, ícones e registro do service worker.
- Diagnóstico determinístico planejado: interesse (views altas + poucos favoritos) e conversão (visitantes altos + poucos WhatsApps), relatório de 30 em 30 dias.

## E-mail e domínio

- Contato correto da plataforma: `contato@borapraonde.app.br` (o endereço antigo sem “brasil” estava errado).
- Domínio administrado no Registro.br pelo Júnior; site publicado na Vercel.
- ImprovMX foi configurado para encaminhar e-mails; registros confirmados: MX `mx1.improvmx.com` e `mx2.improvmx.com`, SPF `v=spf1 include:spf.improvmx.com ~all`.
- O recebimento chegou a funcionar. Ainda verificar se assunto, remetente e corpo deixam claro que a mensagem veio do Bora pra onde; não afirmar que isso está corrigido sem teste real.

## Documentação pendente

- Wiliane pediu uma versão profissional do manual estratégico/funcional usando o arquivo:
  `/Users/wilianecristinamacedopurcino/Downloads/Manual_Estrategico_Funcional_Qual_e_a_Boa_v1_0 (1).docx`
- Ainda não concluir esse manual nesta conversa. Para editar/gerar DOCX, usar a skill de documentos e renderizar para conferir o layout.

## Próximos passos recomendados

1. Testar em produção, com cache-bust, `https://www.qualeaboabrasil.com.br/lugares/wiliane-macedo`.
2. Confirmar que a prévia do painel coincide com o perfil público: vídeo primeiro, logo visível e galeria abaixo.
3. Testar um e-mail real e ajustar remetente/assunto/corpo para identificar a plataforma.
4. Criar/revisar o manual estratégico profissional.
5. Retomar Apple/Google quando houver cartão internacional, Android disponível ou alternativa de verificação.
6. Só aplicar migrations ou publicar código após autorização explícita da Wiliane.

## Frase para iniciar a próxima conversa

“Leia o arquivo HANDOFF_COMPACTO.md na raiz do projeto e continue a partir dos próximos passos. Explique tudo de forma simples e uma ação por vez.”

