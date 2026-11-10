## Resumo

Descreva o que mudou e por quê.

## Tipo de mudança

- [ ] `feat`: nova funcionalidade
- [ ] `fix`: correção de bug
- [ ] `refactor`: refatoração sem mudança de comportamento
- [ ] `perf`: melhoria de desempenho
- [ ] `test`: testes
- [ ] `docs`: documentação
- [ ] `ci`: workflows e automações
- [ ] `chore`: manutenção, dependências ou configuração

## Como testar

Descreva os passos para validar a mudança.

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

## Impacto no deploy

- [ ] Backend (Render)
- [ ] Frontend (Vercel)
- [ ] Ambos
- [ ] Nenhum impacto de deploy

## Checklist

- [ ] Os commits são coesos, seguem Conventional Commits e não foram fragmentados em commits atômicos.
- [ ] As mudanças do PR estão relacionadas e o escopo está descrito.
- [ ] Nenhum `.env`, token, chave, cookie ou credencial foi commitado.
- [ ] Testes, lint e build foram executados conforme o escopo da mudança.
- [ ] A documentação foi atualizada quando necessário.
- [ ] O impacto no backend e no frontend foi avaliado.
- [ ] Novas variáveis de ambiente estão documentadas nos arquivos `.env.example`.

## Variáveis de ambiente

Liste variáveis novas ou alteradas e onde elas devem ser configuradas.

## Capturas de tela ou vídeo

Inclua evidências para mudanças visuais no frontend.

## Issue relacionada

Closes #
