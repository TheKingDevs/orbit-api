<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Frontend — instruções para agentes

O frontend é Next.js App Router + React + TypeScript + Tailwind CSS. Leia ../.agents/README.md, ../.agents/security/security-baseline.md, ../.agents/security/security-review-checklist.md e ../.agents/workrules/architecture-map.md. O bloco automático do Next.js acima deve permanecer intacto.

## Como funciona

- src/app/: rotas e layouts. /app abriga dashboard, docs, novidades, planos e administração; /me apresenta uso e histórico.
- src/components/: componentes de dashboard, documentação, notícias, suporte e interface pública.
- src/lib/auth/: provider, sessão, apiFetch e hooks de autenticação.
- src/lib/docs.ts: fonte do catálogo e exemplos de endpoints.
- src/lib/news.ts: conteúdo cronológico da página de novidades.
- src/proxy.ts e SessionGate: proteção de navegação por sessão; não substituem autorização no backend.
- next.config.ts: rewrites para o backend e recursos auxiliares. Chamadas same-origin devem preferir esses rewrites.

## Padrões

- Antes de usar ou alterar API Next, leia os guias correspondentes em node_modules/next/dist/docs/ desta instalação. A versão atual contém mudanças incompatíveis com versões anteriores.
- Prefira Server Components. Adicione 'use client' somente para estado, eventos ou APIs do browser.
- Use apiFetch em chamadas autenticadas para manter cookies, CSRF, tratamento de sessão expirada e erros consistentes.
- API key nunca aparece em URL, query string, telemetria ou logs. Exemplos enviam x-apikey.
- Esconda controles por UX quando apropriado, mas nunca use o frontend como única barreira de autorização.
- Não use HTML de usuário em dangerouslySetInnerHTML. Conteúdo dinâmico precisa de escaping ou sanitização específica.
- Formulários têm labels, validação acessível, estados de carregamento/erro e prevenção de envio duplicado quando relevante.
- Mantenha identidade visual, responsividade, navegação por teclado e foco visível.
- NEXT_PUBLIC_* é público e embutido durante build. Não coloque secrets nessas variáveis.

## Integração com API

Ao mudar endpoint ou parâmetro, atualize backend e src/lib/docs.ts; revise exemplos em ApiDocView.tsx e comportamento de ApiPreview.tsx. Playground pode fazer chamadas reais e consumir limite/custo: teste com mocks ou chave de teste e não envie requests de produção sem autorização.

Para sessão, verifique acesso sem cookie, sessão expirada e erro de autorização. A validação definitiva permanece no backend.

## Validação

Execute de dentro de frontend/ conforme o escopo:

- npm run lint
- npx tsc --noEmit
- npm run build

Não rode build se diretórios de saída contiverem dados a preservar; verifique scripts e preserve alterações existentes. Para mudança visual, valide viewport móvel, foco/teclado e estados sem dados/erro.
