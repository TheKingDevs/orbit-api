# Validação, dados e operações

## Validação por tipo de mudança

- Backend: execute build/typecheck disponível e testes Bun direcionados. Revise autorização, validação, limites e falhas.
- Frontend: rode TypeScript/ESLint/build pertinentes; para interface valide vazio, carregando, erro, teclado e viewport responsivo.
- Mudança entre front e back: valide contrato request/response e fluxo autenticado em ambiente de teste.
- Segurança: aplique security/security-review-checklist.md e registre testes de exploração local.

## Gate obrigatório antes de publicar

Antes de qualquer `git push`, deploy, release, publicação ou merge que disponibilize mudanças, execute as checagens aplicáveis a todos os arquivos alterados. Isso vale também quando a publicação foi autorizada previamente.

- Sempre rode `git diff --check` e revise o diff final, incluindo arquivos staged e unstaged.
- Backend: rode `bun run build` e testes Bun direcionados. Use o build também como typecheck quando não houver comando separado. Confirme antes que `backend/dist/` pode ser recriado, pois o script de build o remove.
- Frontend: rode `npm run lint`, `npx tsc --noEmit` e `npm run build`. Verifique a saída de build conforme as regras do frontend antes de executá-lo.
- Para alterações que cruzam aplicações, execute as checagens de cada aplicação afetada. Se o projeto tiver checagens adicionais configuradas, inclua-as quando forem pertinentes.
- Selecione testes locais com mocks/fixtures; não dispare testes que atinjam provedores, banco real ou outros serviços externos. Se não houver teste seguro para um caminho, registre essa limitação e valide o restante localmente.
- Todas as checagens aplicáveis devem passar antes de publicar. Se uma falhar, corrija e rode novamente as checagens pertinentes. Se alguma não puder ser executada, não faça push, deploy, merge ou publicação; informe o bloqueio e peça orientação.
- Rode novamente as checagens pertinentes se houver qualquer alteração depois delas. Não trate autorização para publicar como dispensa de validação.

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
- Cumpra o gate de validação desta página antes de push, deploy, release, merge ou publicação. Não prossiga com checagens aplicáveis pendentes ou falhas.
- Não faça push/deploy/publicação nem altere painel/segredo remoto sem autorização expressa. Explique quando correção está local, mas não no serviço ao vivo.
- Atualize relatório de segurança quando a tarefa envolver auditoria ou corrigir achado documentado.
