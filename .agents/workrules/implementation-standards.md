# Padrões de implementação

## Linguagens e estilo

- TypeScript estrito nos dois aplicativos. Prefira tipos explícitos nas fronteiras, nomes claros e funções pequenas.
- Mensagens de API e interface seguem o português do produto; identificadores seguem o padrão existente.
- Evite any, casts sem validação, estado global novo e duplicação. Documente compatibilidade temporária e migração.
- Reutilize componentes, hooks, serviços e estilos existentes. Não introduza biblioteca para comportamento já resolvido pelo stack.

## Backend

- Handlers verificam método, validam payload/query, aplicam autenticação/autorização, chamam serviço e retornam Response consistente.
- Use erros em backend/src/errors/; errorHandler mapeia status e resposta. Não devolva stack trace.
- Regras reutilizadas ficam em serviços/utilitários. Operações Mongo mantêm memória e persistência coerentes.
- Nunca altere limite, papel, assinatura ou API key sem validar autoridade no servidor. Respostas sensíveis usam no-store.
- Integração externa tem timeout, retry limitado/idempotente, validação de resposta e tratamento de indisponibilidade.
- Variáveis novas precisam de descrição e placeholder em backend/.env.example, validação no startup e documentação.

## Frontend

- Leia os guias da versão instalada em frontend/node_modules/next/dist/docs/ antes de alterar APIs Next.js; mantenha as instruções automáticas no frontend/AGENTS.md.
- Prefira Server Components. Use 'use client' somente para estado, eventos ou APIs do browser.
- Use apiFetch para chamadas autenticadas; não duplique cookie, CSRF, redirect de sessão e parsing de erros.
- Mantenha acessibilidade: labels, foco visível, teclado, estados de carregamento/erro e nomes acessíveis.
- Respeite o design atual e Tailwind. Não renderize HTML não confiável nem esconda falha de autorização com lógica visual.
- NEXT_PUBLIC_* é público e embutido na build; não coloque secrets nessas variáveis.

## Dependências e compatibilidade

- Confirme compatibilidade com versões fixadas em package.json. Evite upgrade amplo por conveniência.
- O frontend ignora package-lock.json; não altere a política de lockfile sem tarefa explícita. O backend mantém bun.lock versionado.
- API keys usam headers x-apikey/x-api-key, nunca query strings.
- Antes de quebrar contrato público, procure usos em docs, exemplos, testes e consumidores internos; migre quando compatibilidade fizer parte do requisito.
