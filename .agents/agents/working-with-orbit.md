# Como agentes devem trabalhar neste repositório

## Antes de editar

- Leia os AGENTS.md aplicáveis, este guia, as regras de segurança e a documentação da aplicação envolvida.
- Verifique git status e preserve todas as alterações existentes. Não reverta, sobrescreva ou reorganize alterações alheias à tarefa.
- Siga a arquitetura existente. Localize primeiro rota, serviço, tipos, middleware, cliente HTTP ou componente já responsável pelo comportamento.
- Faça uma mudança coesa e pequena. Se o requisito atravessar aplicações, altere frontend e backend conforme necessário e documente o contrato entre eles.
- Não leia, imprima ou copie valores de arquivos .env, tokens, cookies, chaves ou credenciais. Use .env.example para entender nomes e finalidade.

## Onde implementar

| Necessidade | Local principal |
| --- | --- |
| Endpoint HTTP, rota pública, conta ou admin | backend/src/routes/ e registro em backend/src/routes/index.ts |
| Autenticação, autorização, CSRF, CORS e limites | backend/src/middlewares/ e backend/src/utils/ |
| Regra de negócio, integração externa, mídia ou persistência | backend/src/services/ |
| Pagamentos Mercado Pago | backend/src/modules/billing/; rotas delegam para o módulo |
| Contratos de entrada/saída e schemas | backend/src/types/ |
| Modelo e interfaces | backend/src/models/ e backend/src/interface/ |
| Página, navegação e layouts Next.js | frontend/src/app/ |
| Interface reutilizável | frontend/src/components/ |
| Catálogo de endpoints e exemplos | frontend/src/lib/docs.ts e frontend/src/components/docs/ |
| Sessão, HTTP e estado autenticado | frontend/src/lib/auth/; use apiFetch |
| Novidades | frontend/src/lib/news.ts e componentes/páginas de novidades |
| Regras permanentes | .agents/security/, .agents/workrules/ e AGENTS.md |

Use o serviço de domínio existente em vez de colocar regra de negócio diretamente no handler HTTP. Handlers validam a requisição, aplicam autenticação/autorização e traduzem a resposta; serviços executam a operação.

## Segurança em cada alteração

- Trate cada recurso novo ou editado como nova superfície de ataque. Revise abuso, autenticação, autorização, validação, limites, exposição de dados e erros.
- Adicione ou atualize testes direcionados para o comportamento e os limites de segurança. Inclua casos negativos: sem sessão/chave, papel insuficiente, entrada inválida, estado expirado e repetição quando aplicável.
- Teste exploração apenas em código local, mocks, fixtures ou ambiente de teste isolado. Não ataque serviços de terceiros, não faça fuzzing/scan de produção e não use credenciais reais em testes.
- Se a prova exigir serviço real, limite-se às verificações expressamente autorizadas pelo usuário e sem efeitos colaterais. Use conta descartável somente em ambiente confirmado como teste.
- Não alegue que algo está seguro apenas porque build ou teste passou. Registre o que foi verificado, o que ficou fora do escopo e qualquer risco residual.

## Dados, alterações e comandos

- Nunca exclua dados de usuário, histórico, banco, storage persistente, arquivos do workspace ou ambiente. Uma validação destrutiva só pode ocorrer com conta/dados descartáveis de teste e autorização explícita para essa ação.
- Antes de comando que possa apagar, truncar, sobrescrever, migrar ou publicar dados, avalie o alvo e a reversibilidade. Não rode contra produção.
- Builds podem remover seus diretórios de saída. Inspecione o script antes de executar e não use a saída de build para substituir arquivos existentes do usuário.
- Não faça deploy, push, merge, publicação, rotação de credenciais ou chamada que altere serviço externo sem autorização explícita.
- Não instale dependências nem ferramentas se a tarefa puder ser concluída com as disponíveis. Ao instalar, evite scripts e alterações amplas desnecessárias.

## Ao concluir

- Revise o diff completo e confirme que não há segredos, arquivos de ambiente, dados, fixtures pessoais ou alterações não relacionadas.
- Rode somente verificações apropriadas e autorizadas; descreva comandos e resultados reais.
- Atualize README, exemplos, catálogo da API, novidades e .env.example quando a mudança alterar esses contratos.
- Informe arquivos alterados, comportamento, validação, compatibilidade e limitações. Não declare deploy se só houve alteração local.
