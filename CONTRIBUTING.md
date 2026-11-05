# Contribuindo com a Orbit API

A Orbit API é um projeto **privado e confidencial** da **TheKingDevs**. Ao contribuir, você concorda em manter o código, os dados e as informações do projeto sob sigilo, conforme a [LICENSE](LICENSE).

## Acesso e propriedade

- Contribuições são permitidas apenas para pessoas autorizadas pela TheKingDevs.
- Todo código, documentação e artefato adicionado ao repositório segue a licença proprietária do projeto.
- É proibido clonar, copiar, distribuir ou divulgar o projeto fora do grupo autorizado.

## Organização por pasta

Cada equipe atua exclusivamente na sua pasta:

| Pasta | Responsável | Escopo |
| --- | --- | --- |
| `backend/` | Time de backend | API, rotas, serviços, testes e configuração do Render. |
| `frontend/` | Time de frontend | Interface, componentes, páginas e configuração da Vercel. |
| `assets/`, `scripts/`, arquivos da raiz | Maintainers | Logo, diagramas, automações, README, LICENSE e configurações globais. |

### Regra de ouro

**Cada commit deve alterar apenas uma aplicação.** Não misture `backend/` e `frontend/` no mesmo commit.

Se uma funcionalidade exigir mudanças nas duas pastas, divida em commits separados:

```text
feat(backend): adiciona endpoint de exportação
feat(frontend): consome endpoint de exportação
```

## Fluxo de trabalho

1. Atualize sua `main` local.
2. Crie uma branch a partir de `main`.
3. Faça commits pequenos e focados em uma única pasta.
4. Abra um Pull Request para `main`.
5. Aguarde aprovação do code owner e os checks de CI.
6. Faça o merge somente com o PR aprovado.

### Nomes de branch

```text
feat/backend/nome-curto
fix/backend/nome-curto
feat/frontend/nome-curto
fix/frontend/nome-curto
chore/repo/nome-curto
docs/nome-curto
```

## Conventional Commits

Use o padrão `tipo(escopo): descrição`, preferencialmente em inglês, como no histórico atual.

| Tipo | Uso |
| --- | --- |
| `feat` | Nova funcionalidade. |
| `fix` | Correção de bug. |
| `refactor` | Refatoração sem mudança de comportamento. |
| `chore` | Manutenção, dependências ou configuração. |
| `docs` | Documentação. |
| `test` | Testes. |
| `ci` | Pipelines e automações. |
| `perf` | Melhoria de desempenho. |

### Escopos permitidos

- `backend`
- `frontend`
- `repo`
- `ci`
- `docs`

### Exemplos

```text
feat(backend): add transcription queue
fix(frontend): handle expired session
chore(repo): update gitignore
docs: document environment variables
ci: add backend path filter
```

## Pull Requests

Um PR deve ser focado em uma única aplicação. Se precisar alterar as duas, abra PRs separados ou deixe isso explícito para os maintainers.

Inclua na descrição:

- O que mudou e por quê.
- Como testar.
- Impacto no deploy (backend, frontend ou ambos).
- Capturas de tela ou vídeos para mudanças visuais no frontend.
- Variáveis de ambiente novas, se houver.

### Checklist

- [ ] O PR altera apenas uma pasta de aplicação.
- [ ] Os commits seguem o padrão `tipo(escopo): descrição`.
- [ ] Os testes do backend passam.
- [ ] O lint e o build do frontend passam.
- [ ] Nenhum `.env`, token, chave ou credencial foi commitado.
- [ ] A documentação foi atualizada quando necessário.
- [ ] A alteração não quebra o deploy do outro host.

## Testes e validação

```bash
# backend
cd backend
bun test
bun run build

# frontend
cd frontend
npm run lint
npm run build
```

## Revisão e CODEOWNERS

Recomenda-se configurar `.github/CODEOWNERS`:

```text
/backend/    @org/time-back
/frontend/   @org/time-front
/.github/    @org/admins
/scripts/    @org/admins
/README.md   @org/admins
/LICENSE     @org/admins
```

Proteja a branch `main` com:

- Pull Request obrigatório.
- Pelo menos uma aprovação.
- Aprovação do code owner da pasta alterada.
- Checks de CI obrigatórios.
- Histórico linear ou política de merge definida pela organização.

## Segurança

- Nunca commite arquivos `.env` ou valores reais de secrets.
- Use os arquivos `.env.example` como referência e configure os segredos nos hosts.
- Não registre tokens, cookies, chaves de API ou dados de usuários em logs.
- Se um segredo for exposto, revogue e rotacione imediatamente, além de avisar os maintainers.
- Não compartilhe o repositório, o código ou dados do projeto fora da equipe autorizada.

## Deploy

- Commits em `backend/**` disparam o deploy do backend no Render.
- Commits em `frontend/**` disparam o deploy do frontend na Vercel.
- Mudanças na raiz, em `assets/` ou em `scripts/` devem ser avaliadas pelos maintainers para não gerar deploys desnecessários.
- Não altere configurações de deploy sem alinhamento prévio.

## Dúvidas

Fale com os maintainers da TheKingDevs antes de iniciar mudanças grandes, sensíveis ou que afetem as duas aplicações.
