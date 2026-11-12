# Mapa de arquitetura e implementação

## Visão geral

- backend/: API Bun/TypeScript, MongoDB, autenticação por sessão/API key, mídia e integrações.
- frontend/: Next.js App Router, React e Tailwind; interface pública, dashboard e documentação.
- Next encaminha /api/*, /storage/* e recursos auxiliares para o backend por rewrites em frontend/next.config.ts. O browser usa o domínio do frontend quando possível.
- Render hospeda o backend (backend/render.yaml); Vercel publica o frontend. Avalie o deploy pela pasta afetada.

## Backend

Fluxo HTTP esperado: backend/src/index.ts → routes/index.ts → middleware de autenticação/CSRF → rota/handler → serviço de domínio → persistência/provedor → resposta/erro.

- routes/public/: informação pública, preview sem segredo e entrega de storage.
- routes/api/: endpoints de produto e conta. Preserve prefixos e contratos documentados.
- routes/admin/ e routes/owner/: operações privilegiadas; autorização por papel e objeto fica no backend.
- middlewares/: autenticação, CORS e conversão de erros. Não duplique autorização parcial no frontend.
- services/: regras de negócio, serviços externos, sessões, Mongo, downloads, mídia, billing e geração.
- modules/billing/: gateway e serviço Mercado Pago; webhook e rota delegam para o módulo.
- types/: schemas Zod e DTOs; valide entrada externa antes de chamar serviço.
- tests/: testes Bun. Testes com rede externa devem ser identificados e não rodar por acidente.

## Frontend

- src/app/: rotas e layouts App Router; páginas compõem componentes.
- src/components/: interface por domínio (dashboard, docs, news, suporte etc.).
- src/lib/auth/: sessão, apiFetch e hooks. Use apiFetch em chamadas autenticadas no browser.
- src/lib/docs.ts: fonte do catálogo de endpoints. Exemplos não devem colocar API key na URL.
- src/lib/news.ts: conteúdo cronológico da página de novidades.
- src/proxy.ts/SessionGate: controle de navegação, não substitui autorização no backend.
- next.config.ts: rewrites para backend e configuração Next.

## Mudança de contrato

Se a mudança alterar nome, método, parâmetro, autenticação, resposta, erro, limite ou permissão:

1. Atualize validação e handler do backend.
2. Atualize teste direcionado e catálogo de docs/exemplo.
3. Atualize cliente frontend e estados de erro/loading usados pelo dashboard.
4. Registre novidade e eventual breaking change.
5. Verifique impacto de deploy separado: backend, frontend ou ambos.
