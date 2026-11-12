# Teste de exploração segura em recursos

Toda mudança funcional deve ser testada também pelo caminho de abuso, sem atacar produção ou serviços externos.

## Método

1. Defina o comportamento permitido e o que deve ser recusado.
2. Identifique a fronteira: browser/API, sessão/API key, papel, tenant, arquivo, URL ou webhook.
3. Crie teste local com mock/fixture que exerça entrada maliciosa sem enviar tráfego a alvos reais.
4. Confirme que a ação indevida não aconteceu: nenhum registro, sessão, cobrança, arquivo ou chamada upstream.
5. Verifique estado válido e compatibilidade pública.

## Cenários comuns

- Admin: alterar ID de outro papel, editar o próprio papel, alterar owner, suspender, rotacionar chave e excluir.
- Sessão: cookie ausente/inválido, CSRF ausente/incorreto, origem rejeitada, sessão expirada e logout/rotação.
- API key: somente header, chave ausente/inválida, conta suspensa, rate limit e ausência em URL/logs.
- SSRF: loopback, IPv4/IPv6 privado/link-local, metadata, DNS com IP não público, redirect interno/externo, loop, credenciais e timeout. Não conecte ao destino bloqueado.
- Upload/download: tamanho declarado falso, stream que excede limite, MIME inconsistente, traversal, cancelamento e timeout.
- Pagamento/webhook: assinatura ausente/inválida, replay, ID alterado, status pendente/rejeitado e confirmação de pedido no gateway.
- Frontend: XSS em nome/texto, URL externa, erro de API, sessão vencida, estado sem permissão e ação sensível via teclado.

Não use payload de exploit contra domínio público para testar. Para sistema externo, use health/documentação pública ou sandbox com autorização específica.
