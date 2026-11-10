# Contribuindo com a Orbit API

A Orbit API é um projeto **privado e confidencial** da **TheKingDevs**. Ao contribuir, você concorda em manter o código, os dados e as informações do projeto sob sigilo, conforme a [LICENSE](LICENSE).

Para o guia detalhado de boas práticas, consulte [COMO_COLABORAR.md](COMO_COLABORAR.md).

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

**Não use commits atômicos.** Agrupe as mudanças relacionadas em um commit coeso e descritivo. Não fragmente uma mesma entrega em vários commits pequenos só para separar pastas ou arquivos.

Um commit pode incluir `backend/`, `frontend/`, `.github/` e documentação quando tudo fizer parte da mesma entrega. O que não pode é misturar assuntos sem relação.

Se uma mudança independente for grande, ela pode ser separada em mais de um commit. O critério é coesão, não quantidade.

## Fluxo de trabalho

1. Atualize sua `main` local.
2. Crie uma branch a partir de `main`.
3. Agrupe as mudanças relacionadas em um commit coeso e descritivo.
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

Um PR deve ter um objetivo claro. Evite PRs gigantes com assuntos não relacionados. Quando a mudança for interdependente, um único PR pode alterar backend e frontend; descreva o escopo e o impacto para os maintainers.

Inclua na descrição:

- O que mudou e por quê.
- Como testar.
- Impacto no deploy (backend, frontend ou ambos).
- Capturas de tela ou vídeos para mudanças visuais no frontend.
- Variáveis de ambiente novas, se houver.

### Checklist

- [ ] As mudanças do PR estão relacionadas e o escopo está descrito.
- [ ] Os commits são coesos e seguem o padrão `tipo(escopo): descrição`.
- [ ] A entrega não foi fragmentada em commits atômicos.
- [ ] Os testes do backend passam.
- [ ] O lint e o build do frontend passam.
- [ ] Nenhum `.env`, token, chave ou credencial foi commitado.
- [ ] A documentação foi atualizada quando necessário.
- [ ] A alteração não quebra o deploy do outro host.

## Testes e validação

```bash
# backend
cd backend
bun install --frozen-lockfile
bun run build
bun test

# frontend
cd frontend
npm install
npm run lint
npm run build
```

O teste do Pinterest depende de rede externa. A CI executa os demais testes; o Pinterest roda no workflow de integração agendado. Para validar localmente:

```bash
cd backend
bun test src/tests/pinterest.test.ts --timeout 30000
```

## Revisão e CODEOWNERS

O arquivo `.github/CODEOWNERS` define os responsáveis por área. Ajuste os handles dos times conforme a organização:

```text
*                       @TheKingDevs/admins
/backend/               @TheKingDevs/time-back
/frontend/              @TheKingDevs/time-front
/.github/               @TheKingDevs/admins
/scripts/               @TheKingDevs/admins
/README.md              @TheKingDevs/admins
/CONTRIBUTING.md        @TheKingDevs/admins
/COMO_COLABORAR.md      @TheKingDevs/admins
/LICENSE                @TheKingDevs/admins
```

Proteja a branch `main` com:

- Pull Request obrigatório.
- Pelo menos uma aprovação.
- Aprovação do code owner da área alterada.
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
- O workflow `.github/workflows/cd.yml` publica a imagem do backend no GHCR e pode disparar hooks opcionais de deploy.
- Mudanças na raiz, em `assets/` ou em `scripts/` devem ser avaliadas pelos maintainers para não gerar deploys desnecessários.
- Não altere configurações de deploy sem alinhamento prévio.

## Dúvidas

Fale com os maintainers da TheKingDevs antes de iniciar mudanças grandes, sensíveis ou que afetem as duas aplicações. Consulte também o [COMO_COLABORAR.md](COMO_COLABORAR.md) para o guia completo de boas práticas.
