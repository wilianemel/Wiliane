# Bora pra onde — Documento de continuidade do projeto

> Gerado para retomar o trabalho depois de perder o histórico de conversa no ChatGPT (usado para redigir os prompts enviados ao Claude Code, que é quem efetivamente implementa o código). Este arquivo resume tudo que já foi construído, as regras de trabalho combinadas e o ponto exato em que paramos.

---

## 1. O que é o projeto

**Bora pra onde** é uma plataforma de descoberta de experiências locais (restaurantes, bares, eventos) em São José dos Campos e região do Vale do Paraíba. A proposta central é diferenciar-se de apps de busca/mapa por combinar **intenção + vibe + personalização + experiência**, não só localização.

Tem dois lados:
- **Consumidor**: descobre lugares por busca direta (`/buscar`) ou por um fluxo guiado de recomendação por afinidade (`/descobrir`, motor de match em `match-engine.ts`), favorita, avalia, define preferências ("Minha vibe").
- **Empresa**: donos de estabelecimento se cadastram, gerenciam dados/fotos/vídeo, veem dashboard de desempenho.

Repositório: `https://github.com/wilianemel/Wiliane.git`, branch `main`, deploy via Vercel.

---

## 2. Stack técnico

- Next.js 16.2.10 (App Router, Turbopack)
- React 19
- TypeScript **strict**, sem `any`
- Tailwind CSS 4
- Supabase (Postgres + Auth + Storage), via `@supabase/ssr` (cookie-based auth)
- Sem bibliotecas de UI externas — todo ícone é SVG desenhado à mão no próprio código, no mesmo estilo (stroke-based, `viewBox="0 0 24 24"`)

**Importante:** este projeto avisa explicitamente (arquivo `AGENTS.md`) que a versão do Next.js usada **não é a mesma que está no treinamento de um modelo de IA genérico** — há mudanças de API/estrutura. Qualquer assistente que for gerar código deve conferir a documentação real em `node_modules/next/dist/docs/` antes de escrever código, em vez de confiar em memória genérica de "como o Next.js funciona".

---

## 3. Regras fixas de trabalho (combinadas ao longo do projeto — sempre valem)

1. **Nunca instalar biblioteca nova.** Tudo é feito com o que já existe no projeto.
2. **Nunca alterar banco, nunca executar SQL diretamente.** O assistente não tem service role key nem connection string — só as chaves públicas (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`). Toda mudança de schema é escrita como arquivo em `supabase/migrations/`, marcada `NÃO APLICADA` no topo, e **o usuário aplica manualmente** no SQL Editor do Supabase. Só depois de confirmado é que o cabeçalho vira `APLICADA`.
3. **Sempre rodar `npm run lint` e `npm run build` depois de qualquer mudança de código**, e corrigir todos os erros antes de considerar a tarefa concluída.
4. **Nunca fazer commit sem instrução explícita.** Quando for commitar: rodar `git status` primeiro, confirmar exatamente os arquivos esperados (se aparecer algo a mais, parar e avisar), só then `git add`/`git commit`/`git push` — e só dar `push` se o usuário pedir isso explicitamente também.
5. **TypeScript estrito, sem `any`.**
6. **Não duplicar código** — extrair componente/helper compartilhado em vez de copiar lógica.
7. Quando o usuário disser "não altere X", isso é estrito — qualquer achado fora do escopo vira uma observação no relatório, não uma correção por conta própria.
8. **Não há ferramenta de screenshot/browser automation** neste ambiente. Toda validação visual é feita por `npm run build`, `npm run dev` + `curl` (inspecionando o HTML renderizado) — nunca há confirmação pixel-perfect real; isso é sempre declarado explicitamente nos relatórios.
9. Cada tarefa grande segue o padrão: **auditar → implementar → validar (lint/build/smoke test) → relatar → só commitar quando autorizado**.

---

## 4. Estado atual do repositório (no momento deste documento)

```
Branch: main (up to date with origin/main)

Últimos commits (mais recente primeiro):
761247d feat: polish mobile search and recommendation experience
7aae990 feat: redesign explore as visual discovery feed
ad20f3b feat: add Instagram CTA and Mostarda business card
655bd97 feat: redesign venue profile for mobile decision flow
5a4bae4 feat: add music preferences to user vibe
b1e1a6a fix: separate explore categories from search flow
73f8961 feat: add user vibe preferences
cb4dcbf feat: redesign home as personalized mobile experience feed
a38c2fd feat: add mobile app shell and experience-first cards
2af92ec feat: improve admin venue management layout

Working tree AGORA (não commitado ainda):
  modified:   src/app/cadastro/page.tsx
  modified:   src/app/empresa/cadastro/page.tsx
  modified:   src/app/empresa/entrar/page.tsx
  modified:   src/app/empresa/painel/page.tsx
  modified:   src/app/entrar/page.tsx
  modified:   src/components/empresa/venue-access-gate.tsx
  modified:   src/lib/venues/venue-owner.ts
  untracked:  src/components/shared/password-input.tsx
```

Essas mudanças pendentes são todas da investigação do **bug crítico do cadastro empresarial** (ver seção 6) — ainda não foram commitadas porque o bug não está 100% fechado.

---

## 5. Histórico do que já foi construído (por fase, em ordem)

### Fase A — Taxonomia e dados do estabelecimento
- Categorias padronizadas de venue (`VENUE_CATEGORIES` em `venue-categories.ts`), incluindo tratamento de "Outros" com texto customizado.
- Tags de experiência estruturadas (`venue-tags.ts`): grupos de atmosfera, companhia, momento.
- Horário de funcionamento estruturado: tabela `venue_business_hours` (migration 029), lógica pura em `venue-hours.ts` (`isVenueOpenNow`, `getVenueHoursStatus`, `resolveVenueOpenNow` etc.), editor no painel do dono, badge de status (`VenueOpenStatusBadge`) usado em cards e no perfil, integrado ao filtro de busca e ao motor de match.
- Selo de verificação: migration 030 (`is_verified`, `verified_at`, RPC `set_venue_verified_status`), UI em `/admin/estabelecimentos`, badge no perfil público.

### Fase B — App Shell mobile e redesign visual (Fase 1)
- Bottom nav mobile (`bottom-nav.tsx`) + `app-shell.tsx` envolvendo o layout, escondendo a bottom nav em rotas de empresa/admin/auth.
- Cards image-first (foto grande, texto sobre gradiente) em vez de fichas técnicas.
- Home redesenhada como feed personalizado: `HomeSearchShortcut`, `HomeCategoryShortcuts`, fileiras horizontais (`HomeVenueRow`/`HomeVenueRowCard`), `HomeRadar` ("Hoje na sua cidade", com dado real de horário), `for-you.ts` ("Perfeito para você"), `nearby-venues.ts` ("Perto de você").
- Separação clara **Explorar × Buscar**: `/descobrir` virou curadoria visual (fileiras editoriais por tema: Jantar, Happy hour, Música ao vivo, Romântico, Família, Pet friendly, Novidades, Perto de você), sem formulário de busca embutido; `/buscar` continua sendo a busca direta com filtros.

### Fase C — Personalização do usuário ("Minha vibe")
- `/perfil/minha-vibe`: usuário escolhe categorias, atmosfera, companhia e estilo musical preferidos.
- `mergeManagedSelection()` (padrão importante): atualiza só o subconjunto gerenciado pela tela, preservando qualquer valor legado/aprendido fora dela.
- Migration 031: coluna `preferred_music_styles` em `user_preferences`.
- `music-preferences.ts` criado como fonte única de verdade da taxonomia musical, consumida tanto pelo motor de match quanto pela tela de preferências.

### Fase D — Perfil público do estabelecimento (Fase 2 visual)
- `/lugares/[id]` redesenhado como "tela de decisão", não ficha técnica: Hero com foto/gradiente + nome/categoria/selo/status sobrepostos → Resumo de decisão (preço · bairro · distância · nota) → Ações principais (WhatsApp/Favoritar/Reserva/Ver cardápio/Ver rota) → "A vibe desse lugar" (tags unificadas) → "Por que combina com você" (quando vem do fluxo de match) → Sobre o lugar → Cardápio → Galeria → Horários → Como chegar → Avaliações → rodapé.
- Descoberto e corrigido: `menu_url` existia no banco mas nunca era mapeado pro tipo `Venue` — corrigido em `venue-mapper.ts`.
- `VenueRatingSummary` ganhou `variant="compact"` para reaproveitar o mesmo fetch de avaliação no resumo do topo e na seção completa, sem duplicar consulta.
- Depois, numa auditoria pontual, confirmamos e corrigimos uma consulta duplicada real entre o resumo compacto e a seção completa (extraído hook `useVenueRatingSummary`).

### Fase E — Instagram + Mostarda
- CTA discreto "Siga o Bora pra onde no Instagram" (`@qualeaboa.brasil`, link para `https://www.instagram.com/qualeaboa.brasil/`) no fim da Home, antes do rodapé.
- Card "Quer melhorar ainda mais o seu negócio?" da **Mostarda** (empresa parceira de marketing/posicionamento, **serviço externo e opcional**, não é plano do Bora pra onde) no dashboard do estabelecimento — CTA fica desabilitado ("em breve") porque **não existe ainda destino real** (site, WhatsApp ou contato da Mostarda) cadastrado em lugar nenhum do projeto.
- Explicitamente **não implementado**: site institucional do Bora pra onde (fica pra depois, roadmap).

### Fase F — Explorar (Fase 2 visual)
- Removida a redundância: `/descobrir` sem filtro não embutia mais o `SearchPage` completo por baixo das fileiras curadas — no lugar, um CTA simples "Quer algo específico? → Buscar com filtros".
- Modo filtrado (`?category=`/`?liveMusic=1`) trocou o card de grid antigo (com descrição/tags) pelo card compacto foto-primeiro (`HomeVenueRowCard`, parametrizado com `className` pra caber tanto em fileira quanto em grid).

### Fase G — Polimento visual mobile (baseado em teste real em iPhone)
- **`/buscar` deixou de parecer formulário de site**: campo de busca único como protagonista (busca já é reativa por tecla, então o botão "Buscar" separado foi removido), filtros escondidos atrás de um botão "Filtros" que expande/recolhe, com chips removíveis dos filtros ativos.
- **Fallback de imagem corrigido** (`VenueCoverImage`): antes mostrava as iniciais do nome gigantes ("QD", "BS"...) quando não havia foto — trocado por um ícone de categoria (garfo/faca, taça, xícara, nota musical, folha, sparkle) num círculo translúcido sobre o gradiente, nunca uma foto falsa.
- **Fluxo de match (`HomeMatchFlow`)**: opções das perguntas viraram cartões grandes tocáveis (não mais retângulos finos de formulário), com preenchimento dourado + selo de check quando selecionado.
- **Resultado do match**: porcentagem ganhou mais presença visual (`text-3xl`/`4xl`, drop-shadow dourado) + rótulo "combina com você" abaixo dela; caixa "Por que essa recomendação" ganhou tom dourado sutil.
- **Home**: ajuste de densidade pontual (`FeaturedVenues` tinha padding e texto maiores que o resto das seções — normalizado).
- Bottom nav auditada e **não alterada** — sem problema objetivo encontrado.

---

## 6. PONTO EXATO ONDE PARAMOS — bug crítico ainda em aberto

### O bug relatado (em teste real, gravado em vídeo pelo usuário)

Fluxo: dono entra em `/empresa/painel` → clica "Cadastrar meu estabelecimento" → preenche o formulário → clica "Cadastrar estabelecimento" → é levado de volta para `/empresa/painel` → **o painel continua dizendo "Você ainda não tem um estabelecimento cadastrado."** → dono clica em cadastrar de novo → **loop**, criando estabelecimentos duplicados a cada tentativa.

### Investigação, em ordem cronológica

1. **Primeira hipótese (auditoria de código/migrations):** faltava a policy de RLS de `SELECT` em `public.venues` para o dono ver o próprio estabelecimento **não publicado** (todo venue nasce com `is_published = false`). Sem essa policy, o embed `venues(...)` dentro da consulta de `venue_members` volta `null`, e o código descarta essas linhas (`.filter(row => row.venues != null)`) — o estabelecimento existe no banco, mas o painel nunca o enxerga de volta.
   - Já existia no repositório, escrita numa sessão anterior mas **nunca aplicada**, a migration `011_allow_owner_select_update_venues.sql`, com exatamente essa correção (policy de SELECT + policy de UPDATE + REVOKE de colunas administrativas).
   - Entreguei o SQL completo dessa migration pro usuário aplicar manualmente no SQL Editor do Supabase (eu nunca executo).

2. **Auditoria de segurança extra, antes de aplicar:** o usuário questionou (corretamente) se `revoke update (colunas)` realmente protege alguma coisa quando a role `authenticated` já tem `UPDATE` de tabela inteira concedido por padrão pelo Supabase — porque, pela semântica do Postgres, um REVOKE em nível de coluna **não sobrepõe** um GRANT mais amplo em nível de tabela.
   - Entreguei SQL de auditoria somente-leitura (`information_schema.table_privileges`, `pg_class.relacl`, `has_table_privilege`/`has_column_privilege`) pro usuário rodar e confirmar.
   - Concluí que é **muito provável** que a proteção de coluna da migration 011 (e da migration 030, que usa o mesmíssimo padrão pra `is_verified`/`verified_at`) seja inefetiva por esse motivo — recomendei como correção real: **revogar o UPDATE de tabela inteira e conceder UPDATE só nas colunas seguras** (ou um trigger de guarda, como já existe em outro lugar do projeto para um problema irmão). **Essa correção ainda não foi implementada em nenhum arquivo** — ficou como recomendação, aguardando decisão do usuário.

3. **O usuário auditou o banco diretamente** e confirmou: venues existem, `venue_members` com `member_role = owner` e `is_active = true` corretos, a policy `"Owners can view their own venue"` **já existe**, `can_manage_venue_registration()` está correta. Ou seja: **o lado do banco parece correto agora** — mas o painel continuava mostrando "você não tem estabelecimento".

4. **Conclusão: o problema mudou de lugar — provavelmente está no frontend, não mais no banco.** Auditando `src/app/empresa/painel/page.tsx` e `src/lib/venues/venue-owner.ts`, encontrei que **o código nunca capturava o campo `error` do retorno do Supabase** — qualquer falha real na consulta (RLS residual, embed do PostgREST não resolvendo, cache de schema desatualizado, etc.) virava silenciosamente um array vazio, indistinguível de "usuário realmente não tem estabelecimento".
   - Também documentei um achado colateral relevante: a migration `005_create_marketplace_core.sql` (a que cria a tabela `venue_members` originalmente) define a coluna como `role` (não `member_role`) e **sem nenhuma coluna `is_active`** — mas todo o código a partir da migration 009 (e todo o frontend) assume `member_role`/`is_active`. Não existe, em nenhuma migration deste repositório, um `ALTER TABLE` que faça essa renomeação/adição de coluna. Ou seja: **o schema real do banco já divergiu do que está commitado nas migrations** em algum momento não documentado (mesmo padrão de "arquivo do repo desatualizado" que já vimos antes com os cabeçalhos "APLICADA"/"NÃO APLICADA"). Como o próprio usuário confirmou que `member_role`/`is_active` existem ao vivo, não é mais um bloqueio — mas é um sinal de que o histórico de migrations não é 100% confiável como fonte da verdade do schema atual.

### Última implementação feita (JÁ FEITA, JÁ VALIDADA COM LINT/BUILD, **AINDA NÃO COMMITADA, AINDA NÃO TESTADA NUM NAVEGADOR REAL**)

Implementei captura de erro + 3 estados distintos de carregamento em vez de 2:

- **`src/app/empresa/painel/page.tsx`**: `LoadState` agora é `"checking" | "ready" | "error"`. A consulta a `venue_members` captura `error` e, se falhar, faz `console.error("PAINEL EMPRESA — falha ao buscar venue_members:", { code, message, details, hint })` e renderiza um estado de erro próprio ("Não foi possível carregar seu painel" + botão "Tentar novamente") — **nunca mais** mostra a mensagem falsa "você não tem estabelecimento" quando a consulta falha de verdade.
- **`src/lib/venues/venue-owner.ts`** (`useVenueAccess`, usado pelas telas de editar/mídias/prévia/dashboard via `VenueAccessGate`): mesma lógica — `AccessState` ganhou `"error"`, distinto de `"unauthorized"`.
- **`src/components/empresa/venue-access-gate.tsx`**: novo bloco de UI pro estado `"error"`.
- **`src/components/shared/password-input.tsx`** (novo componente) + aplicado em `/entrar`, `/cadastro`, `/empresa/entrar`, `/empresa/cadastro`: campo de senha com botão de olho (mostrar/ocultar), acessível, sem biblioteca nova.
- **`src/app/empresa/cadastro/page.tsx`**: corrigido o formulário de criar conta empresarial, que sempre mostrava "Confirme seu e-mail" mesmo com a confirmação de e-mail desligada no projeto (confirmado no código) — agora, se `signUp()` retornar sessão válida, segue direto pra `/empresa/painel`; sem sessão, cai em `/empresa/entrar`. Ficou consistente com `/cadastro/page.tsx` (fluxo do consumidor), que já tratava isso certo.

`npm run lint` e `npm run build` passam limpos com todas essas mudanças.

### O que falta pra fechar o bug de vez

**O próximo passo não é escrever mais código — é rodar o fluxo de verdade num navegador com o DevTools aberto** e me trazer o que aparecer no console. Agora que o erro real do Supabase não é mais engolido silenciosamente, o `console.error` vai mostrar o `code`/`message`/`details`/`hint` exatos do PostgREST na primeira vez que a consulta falhar de novo — e **isso** é o que vai finalmente apontar a causa raiz definitiva (pode ser a tal ambiguidade de relacionamento FK que o PostgREST às vezes acusa, pode ser cache de schema desatualizado, pode ser outra coisa completamente diferente). Só depois disso faz sentido implementar a correção final e commitar tudo.

---

## 7. Serviços/plataformas externas envolvidas

Não houve pesquisa em sites externos de documentação durante este projeto (nenhuma URL de terceiros foi consultada via navegação) — o trabalho foi feito lendo o próprio código-fonte do repositório e a documentação do Next.js já embutida localmente em `node_modules/next/dist/docs/` (conforme instruído pelo próprio `AGENTS.md` do projeto). As únicas URLs/serviços realmente relevantes ao projeto são:

- **Repositório GitHub:** `https://github.com/wilianemel/Wiliane.git` (branch `main`)
- **Supabase:** banco de dados, autenticação e storage (projeto configurado via variáveis `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`)
- **Vercel:** deploy automático a partir do `main`
- **Instagram oficial da marca:** `https://www.instagram.com/qualeaboa.brasil/` (`@qualeaboa.brasil`)

---

## 8. Como retomar

Ao levar este arquivo para o ChatGPT (ou para qualquer assistente) escrever o próximo prompt, o ponto de partida é:

1. Confirmar que o usuário já testou o fluxo de cadastro empresarial de novo com o DevTools aberto e colher o `console.error` real.
2. Com esse log em mãos, pedir para investigar a causa raiz específica (provavelmente algo em torno do embed do PostgREST entre `venue_members` e `venues`, ou schema cache desatualizado) e implementar a correção mínima.
3. Só depois disso, decidir sobre a correção do REVOKE de coluna ineficaz nas migrations 011/030 (ainda pendente, ver seção 6.2).
4. Só depois de tudo isso fechado e validado, commitar (`git status` → confirmar lista exata de arquivos → `npm run lint` → `npm run build` → `git add` dos arquivos certos → commit → só dar push se pedido).
5. O usuário mencionou explicitamente: **antes de qualquer redesign visual novo**, esse bug precisa estar 100% fechado primeiro.
