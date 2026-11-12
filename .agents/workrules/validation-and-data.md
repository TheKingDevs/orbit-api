# Validação, dados e operações

## Validação por tipo de mudança

- Backend: execute build/typecheck disponível e testes Bun direcionados. Revise autorização, validação, limites e falhas.
- Frontend: rode TypeScript/ESLint/build pertinentes; para interface valide vazio, carregando, erro, teclado e viewport responsivo.
- Mudança entre front e back: valide contrato request/response e fluxo autenticado em ambiente de teste.
- Segurança: aplique security/security-review-checklist.md e registre testes de exploração local.

## Testes seguros

- Prefira testes determinísticos com mocks, fixtures e dependências injetadas.
- Não execute a suíte inteira se houver testes com provedores externos sem identificá-los antes. Selecione explicitamente os testes locais.
- Testes de conta, billing, exclusão, reset, migração e webhook usam memória ou banco descartável. Devem falhar antes de escrever/excluir se o ambiente não for confirmado como teste.
- Não use credenciais, usuários ou payloads reais. Não dispare pagamentos, e-mails ou mensagens reais.
- Scans externos só atingem domínio explicitamente autorizado, com escopo mínimo. Não varra provedores, redes compartilhadas ou terceiros por associação.

## Dados e exclusão

- Não exclua dados persistentes de usuário, históricos, sessões, billing, arquivos ou banco para testar.
- Exclusão só pode ser testada com usuário/storage descartáveis e autorização explícita. Confirme o ambiente; não confie somente no nome da conta.
- Não rode migrations, limpeza, truncation, reset de seed, rm, reset Git ou build que apague saída sem entender o alvo e ter autorização.
- Nunca faça glob amplo em storage, home ou workspace. Diferencie temporário criado pelo teste de dados existentes.

## Resultados e publicação

- Registre comandos, resultados, limitações e riscos não verificados. Build não prova ausência de vulnerabilidade.
- Revise git diff e preserve alterações preexistentes.
- Não faça push/deploy/publicação nem altere painel/segredo remoto sem autorização expressa. Explique quando correção está local, mas não no serviço ao vivo.
- Atualize relatório de segurança quando a tarefa envolver auditoria ou corrigir achado documentado.
