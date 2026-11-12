# Backend — instruções para agentes

O backend é uma API HTTP Bun + TypeScript. Leia também ../.agents/README.md, ../.agents/security/security-baseline.md, ../.agents/security/security-review-checklist.md e ../.agents/workrules/architecture-map.md.

## Inicialização e fluxo

- Entrada: src/index.ts; inicializa Mongo, dados, billing, sessões e Bun.serve.
- Roteamento: src/routes/index.ts. Registre ali novas rotas e mantenha método/caminho/documentação alinhados.
- Erros: classes em src/errors/; src/middlewares/errorHandler.ts converte para resposta HTTP.
- Persistência: src/utils/db.util.ts encapsula usuários, planos, uso e histórico; Mongo é acessado por src/services/mongo.service.ts.
- Autenticação: src/middlewares/authMiddleware.ts distingue API key e sessão. Rotas administrativas usam sessionAuthMiddleware e validam papel e objeto.
- Sessão/CSRF: src/services/session.service.ts, cookies em src/utils/cookies.util.ts e origem/CORS nos utilitários e middlewares próprios.
- URL externa: src/utils/urlSecurity.util.ts. URL de usuário passa por fetchSafeUrl, inclusive redirects e DNS/IP pinning. Não use fetch direto nesse input.
- Billing: src/modules/billing/ contém gateway e serviço Mercado Pago; webhook em src/routes/api/webhooks/ valida assinatura e consulta pedido antes de ativar plano.

## Onde implementar

- Handlers HTTP: src/routes/{public,api,admin,owner}/.
- Regras de negócio/integração: src/services/ ou módulo isolado em src/modules/<domínio>/.
- Schemas e DTOs: src/types/; use validação Zod existente.
- Erros: src/errors/.
- Utilitários transversais: src/utils/.
- Testes: src/tests/; teste com efeito garante memória/banco descartável antes de escrever ou excluir.

## Regras obrigatórias

- API pública exige API key em x-apikey/x-api-key; nunca aceite a chave pela URL. Painel/admin/owner exigem sessão, origem e CSRF conforme o método.
- Autorização no servidor verifica papel mínimo e alvo, proibindo autoelevação. Admin não equivale a owner.
- Valide método, body, query e headers antes do serviço. Limite bytes, tempo, concorrência, redirects e resposta upstream.
- Respostas sensíveis não usam cache. Erros não incluem stack trace; logs não incluem credenciais/dados pessoais.
- Não rode teste de integração que consome serviço externo inadvertidamente. Identifique e selecione os testes locais.
- Não execute migration, reset, cleanup ou exclusão em banco real. Teste exclusão apenas com fixture descartável e guarda que falhe se Mongo não estiver isolado.

## Comandos

Execute de dentro de backend/:

- bun run dev: servidor de desenvolvimento com hot reload.
- bun run build: executa scripts/build.ts e gera dist/orbit-backend.
- bun test <arquivo-de-teste>: roda testes selecionados.

Atenção: bun run build remove e recria dist/. Leia o script e confirme que a saída não contém dados que precisam ser preservados. Não execute suíte completa sem verificar uso de rede externa.

## Mudanças de contrato

Ao alterar endpoint, atualize schemas, autorização, testes, exemplos em src/routes/public/welcome.ts, README e frontend/src/lib/docs.ts quando aplicável. Ao alterar User, confira criptografia, leitura/escrita Mongo, seed de memória, planos/expiração, métricas e serialização administrativa.
