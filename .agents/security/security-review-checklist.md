# Checklist de revisão de segurança por recurso

Use em toda funcionalidade nova ou modificada. Marque apenas o que foi verificado; registre N/A com motivo.

## Modelo de ameaça

- [ ] Identifiquei ator, dado protegido, operação e fronteira de confiança.
- [ ] Considerei anônimo, usuário autenticado, outro tenant e papel inferior.
- [ ] Listei entradas do browser, API, arquivo, webhook e provedor.

## Autenticação e autorização

- [ ] A rota exige sessão/API key apropriada e papel mínimo.
- [ ] Autorização confere objeto/ID e impede autoelevação/acesso cruzado.
- [ ] Escrita por sessão valida origem e CSRF; webhook valida assinatura.
- [ ] Expiração, renovação, idempotência e revogação são tratadas quando aplicáveis.

## Validação e recursos

- [ ] Entrada inválida, excessiva, com encoding incomum e fora de enum é rejeitada.
- [ ] URLs protegem contra SSRF, DNS rebinding, redirects, userinfo e vazamento de headers.
- [ ] Uploads/downloads limitam bytes reais, tempo, concorrência, MIME e extensão.
- [ ] Processos têm argumentos separados, timeout, limite de saída e temporários próprios.
- [ ] Consultas, paginação, rate limit e coleções em memória têm limites.

## Dados e resposta

- [ ] Nenhum segredo ou dado pessoal desnecessário é retornado, registrado ou persistido.
- [ ] Respostas sensíveis não usam cache compartilhado.
- [ ] Saída é segura para HTML, JSON, URL, header e nome de arquivo.
- [ ] Exclusão, plano, suspensão e rotação foram avaliados quanto a impacto/reversibilidade.

## Testes de exploração local

- [ ] Testei comportamento permitido e teste negativo sem autenticação/permissão.
- [ ] Testei limites, expiração, repetição/idempotência e falha upstream relevantes.
- [ ] Para URLs, testei IP privado/link-local, metadata, DNS não público, redirect privado, loop e timeout sem conectar ao destino bloqueado.
- [ ] Para exclusão, usei fixture/conta descartável e confirmei ambiente sem banco de produção.
- [ ] Não usei payload, conta, dado ou credencial real de terceiros.

## Conclusão

- [ ] Build, lint e testes direcionados pertinentes passaram; falhas estão explicadas.
- [ ] Revisei diff e confirmei que nenhum dado/alteração alheia foi removido.
- [ ] Atualizei docs, exemplos e novidades se o contrato mudou.
- [ ] Registrei risco residual e distingui validação local de produção.
- [ ] Não publiquei nem alterei serviço externo sem autorização explícita.
