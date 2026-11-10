# Como colaborar com a Orbit API

Este guia detalha as boas práticas de colaboração do repositório. O [CONTRIBUTING.md](CONTRIBUTING.md) traz o resumo operacional; este documento aprofunda o fluxo, os padrões de commit e o que deve ou não ser feito.

> [!IMPORTANT]
> A Orbit API é um projeto **privado e confidencial** da **TheKingDevs**. Contribuições são restritas a pessoas autorizadas. Não compartilhe código, dados, tokens ou informações do projeto fora da equipe.

## Princípios

- Faça mudanças pequenas o suficiente para revisar, mas **coesas o suficiente para fazer sentido**.
- Explique o motivo da mudança, não apenas o que foi alterado.
- Proteja dados de usuários e credenciais em qualquer ambiente.
- Prefira reutilizar serviços, interfaces, utilitários e padrões já existentes.
- Deixe o repositório melhor do que encontrou: atualize documentação, exemplos e testes quando necessário.

## Antes de começar

1. Leia o [README.md](README.md), o [CONTRIBUTING.md](CONTRIBUTING.md) e o README da aplicação que será alterada.
2. Configure o ambiente local:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

3. Instale as dependências:

```bash
cd backend && bun install --frozen-lockfile
cd ../frontend && npm install
```

4. Confirme que você tem acesso ao repositório e que está trabalhando em uma branch, nunca diretamente na `main`.

## Fluxo de trabalho

1. Atualize a `main` local.
2. Crie uma branch descritiva a partir da `main`.
3. Implemente a mudança e valide localmente.
4. Crie **um commit coeso** seguindo Conventional Commits.
5. Envie a branch e abra um Pull Request para a `main`.
6. Aguarde os checks de CI e a revisão do code owner.
7. Faça o merge somente com o PR aprovado e os checks verdes.

```bash
git switch main
git pull
git switch -c feat/backend/nome-curto
# implemente e valide
git add -A
git commit -m "feat(backend): add nome-curto"
git push -u origin feat/backend/nome-curto
```

## Commits: a regra deste repositório

### Não use commits atômicos

**Não fragmente uma entrega em vários commits pequenos só para separar pastas ou arquivos.** Prefira um commit coeso por entrega lógica.

- Um commit pode alterar `backend/`, `frontend/`, `.github/` e documentação quando tudo fizer parte da mesma entrega.
- O que não pode é misturar assuntos sem relação no mesmo commit.
- Evite mensagens genéricas como `wip`, `update`, `ajustes`, `teste` ou `commit`.
- Se uma mudança independente for realmente grande, ela pode ser separada em mais de um commit. O critério é **coesão**, não quantidade.
- A mensagem deve permitir entender o escopo e o motivo da entrega sem abrir o diff.

### Formato

Use o padrão:

```text
tipo(escopo): descrição curta no imperativo
```

Regras da primeira linha:

- Minúsculas na descrição.
- Sem ponto final.
- Preferencialmente até 72 caracteres.
- Descreva o efeito da mudança, não o arquivo alterado.

Opcionalmente, adicione um corpo explicando o que mudou e por quê:

```text
feat(backend): replace yt-dlp YouTube downloads with DevWorld API

Remove yt-dlp and cookie dependencies from the Docker image and use the
DevWorld media endpoints with retries and local storage. Keeps the public
download routes unchanged.
```

### Tipos permitidos

| Tipo | Uso |
| --- | --- |
| `feat` | Nova funcionalidade. |
| `fix` | Correção de bug. |
| `refactor` | Refatoração sem mudança de comportamento. |
| `perf` | Melhoria de desempenho. |
| `test` | Testes. |
| `docs` | Documentação. |
| `ci` | Workflows e automações de CI/CD. |
| `build` | Build, Docker ou dependências de build. |
| `chore` | Manutenção, dependências e configuração. |
| `style` | Formatação sem mudança de lógica. |
| `revert` | Reversão de um commit anterior. |

### Escopos

- `backend`
- `frontend`
- `repo`
- `ci`
- `docs`

Para mudanças que atravessam mais de uma área, use `repo` ou omita o escopo.

### Exemplos

```text
feat(backend): add DevWorld YouTube downloader
fix(frontend): handle expired session
refactor(backend): extract storage upload helper
perf(backend): cache transcribed audio metadata
test(backend): cover rate limit violations
docs: document collaboration flow
ci: add security workflow
build(backend): install tesseract in runtime image
chore(repo): update dependabot groups
feat(repo): integrate DevWorld downloads and CI workflows
```

Mudança incompatível:

```text
feat(backend)!: require DATA_ENCRYPTION_KEY in production

BREAKING CHANGE: the backend no longer starts in production without
DATA_ENCRYPTION_KEY configured.
```

### Evite

- `update`
- `wip`
- `ajustes`
- `teste`
- `commit`
- Mensagens genéricas que não dizem o que mudou.

## Branches

Use nomes curtos e descritivos:

```text
feat/backend/nome-curto
fix/backend/nome-curto
feat/frontend/nome-curto
fix/frontend/nome-curto
chore/repo/nome-curto
ci/nome-curto
docs/nome-curto
```

## Pull Requests

Um PR deve ter **um objetivo claro**. Evite PRs gigantes com assuntos não relacionados. Quando a mudança for interdependente, um único PR pode alterar backend e frontend; descreva o escopo e o impacto.

Inclua na descrição:

- O que mudou e por quê.
- Como testar.
- Impacto no deploy (backend, frontend ou ambos).
- Variáveis de ambiente novas ou alteradas.
- Capturas de tela ou vídeo para mudanças visuais.
- Issue relacionada, quando houver.

### Checklist do PR

- [ ] Os commits são coesos e seguem Conventional Commits.
- [ ] As mudanças do PR estão relacionadas e o escopo está descrito.
- [ ] Nenhum `.env`, token, chave, cookie ou credencial foi commitado.
- [ ] Testes, lint e build foram executados conforme o escopo.
- [ ] A documentação foi atualizada quando necessário.
- [ ] O impacto no backend e no frontend foi avaliado.
- [ ] As novas variáveis de ambiente estão no `.env.example`.

## Como fazer

- **Faça** commits coesos, com mensagem no padrão Conventional Commits.
- **Faça** uma branch por objetivo.
- **Faça** testes para o comportamento novo ou corrigido.
- **Faça** validação local antes de abrir o PR.
- **Faça** uso dos serviços e interfaces existentes.
- **Faça** tratamento de erros explícito e mensagens úteis.
- **Faça** logs sem dados sensíveis.
- **Faça** atualização dos arquivos `.env.example` ao adicionar variáveis.
- **Faça** revisão do próprio diff antes de pedir revisão.
- **Faça** merge apenas com CI verde e aprovação.

## O que não fazer

- **Não** commite `.env`, tokens, chaves, cookies ou credenciais.
- **Não** commite `node_modules`, `dist`, `.next`, `storage` ou artefatos de build.
- **Não** faça commit diretamente na `main`.
- **Não** use `git push --force` em branches compartilhadas ou na `main`.
- **Não** fragmente entregas em commits atômicos ou sequências de `wip`.
- **Não** misture mudanças não relacionadas no mesmo commit ou PR.
- **Não** desabilite testes, lint ou checks para fazer o CI passar.
- **Não** faça merge com checks vermelhos ou revisão pendente.
- **Não** altere configurações de deploy sem alinhamento com os maintainers.
- **Não** exponha dados de usuários, tokens ou segredos em issues, PRs ou logs.
- **Não** duplique lógica de serviços em rotas ou componentes.
- **Não** adicione dependências sem necessidade e sem avaliar impacto e segurança.

## Testes e validação local

### Backend

```bash
cd backend
bun install --frozen-lockfile
bun run build
bun test
```

O teste do Pinterest depende de rede externa e pode falhar localmente. A CI executa os demais testes; o teste de integração do Pinterest roda no workflow agendado ou manualmente:

```bash
cd backend
bun test src/tests/pinterest.test.ts --timeout 30000
```

### Frontend

```bash
cd frontend
npm install
npm run lint
npm run build
```

O `package-lock.json` do frontend é ignorado pelo Git neste repositório. A CI usa `npm install`, não `npm ci`. Se a organização decidir priorizar builds reproduzíveis, alinhe a inclusão de um lockfile com os maintainers.

Avisos de lint não bloqueiam o merge; erros bloqueiam. Não aumente o número de avisos sem necessidade.

### Dica para ambientes móveis

Em Termux/Android, prefira `npm run build` (Node) em vez de `bun run build`. O Bun pode tentar resolver binários nativos incompatíveis, como o `lightningcss` do Android. A CI e o Vercel validam o build em Linux.

## CI/CD

| Workflow | Quando roda | O que faz |
| --- | --- | --- |
| `.github/workflows/ci.yml` | Pull requests e pushes na `main` | Build e testes do backend, lint e build do frontend, build da imagem Docker. |
| `.github/workflows/cd.yml` | Push na `main` ou execução manual | Publica a imagem do backend no GHCR e dispara hooks opcionais de deploy. |
| `.github/workflows/security.yml` | Pull requests, pushes na `main`, semanal e manual | Actionlint nos workflows e auditoria de dependências. |
| `.github/workflows/integration.yml` | Diariamente e manual | Teste de integração externo do Pinterest. |

### Secrets opcionais

Configure em **Settings → Secrets and variables → Actions**:

- `RENDER_DEPLOY_HOOK_URL`: hook de deploy do Render.
- `VERCEL_DEPLOY_HOOK_URL`: hook de deploy da Vercel.

O `GITHUB_TOKEN` é fornecido automaticamente pelo GitHub Actions. O workflow de CD precisa da permissão `packages: write` para publicar no GHCR; ela já está declarada no arquivo.

Os valores usados nos testes de CI são fictícios e ficam nos próprios workflows. Não adicione secrets reais em arquivos versionados.

### Proteção de branch

Recomenda-se proteger a `main` com:

- Pull Request obrigatório.
- Pelo menos uma aprovação.
- Aprovação do code owner da área alterada.
- Checks de CI obrigatórios.
- Histórico linear ou política de merge definida pela organização.

O arquivo `.github/CODEOWNERS` contém os responsáveis por área. Ajuste os handles dos times antes de exigir revisão de code owner.

## Segurança

- Nunca commite arquivos `.env` ou valores reais de secrets.
- Use os arquivos `.env.example` como referência.
- Não registre tokens, cookies, chaves de API ou dados de usuários em logs.
- Se um segredo for exposto, revogue e rotacione imediatamente, além de avisar os maintainers.
- Não compartilhe o repositório, o código ou dados do projeto fora da equipe autorizada.
- Evite colar payloads reais de usuários em issues ou PRs.

## Deploy

- Commits em `backend/**` disparam o deploy do backend no Render.
- Commits em `frontend/**` disparam o deploy do frontend na Vercel.
- O workflow de CD publica a imagem do backend no GHCR e pode disparar hooks opcionais.
- Mudanças na raiz, em `assets/` ou em `scripts/` devem ser avaliadas pelos maintainers para evitar deploys desnecessários.
- Variáveis `NEXT_PUBLIC_*` são incorporadas no build do frontend; altere-as no ambiente de build e reconstrua.
- Não altere `backend/Dockerfile`, `backend/render.yaml` ou `frontend/vercel.json` sem alinhamento prévio.

## Revisão de código

Ao revisar, verifique:

- Correção e clareza da implementação.
- Segurança e proteção de dados.
- Regressões em rotas, autenticação, rate limit e storage.
- Cobertura de testes para o comportamento alterado.
- Documentação e variáveis de ambiente.
- Impacto no deploy e nos dois hosts.

Comentários devem ser objetivos e acionáveis. Não aprove um PR com bloqueios em aberto.

## Dúvidas

Fale com os maintainers da TheKingDevs antes de iniciar mudanças grandes, sensíveis ou que afetem backend, frontend e infraestrutura ao mesmo tempo.
