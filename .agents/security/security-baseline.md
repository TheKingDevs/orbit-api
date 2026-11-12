# Base obrigatória de segurança

Aplica-se a todo recurso novo ou editado no backend, frontend, scripts e configuração.

## Entradas e saídas

- Valide dados não confiáveis no servidor, mesmo se também houver validação no navegador. Use schemas e limites de tamanho, formato, enumeração e quantidade.
- Construa consultas Mongo somente com campos permitidos e valores tipados. Não passe objetos do usuário direto para filtros/atualizações.
- Codifique saída conforme contexto. Não use dangerouslySetInnerHTML com texto de usuário; se indispensável, sanitize com biblioteca e teste localmente.
- Não use eval, shell concatenado, exec com entrada interpolada ou argumentos de processo controlados por usuário. Passe argumentos em array e limite tempo, tamanho e concorrência.
- Não confie em nome, MIME, extensão ou Content-Length fornecido pelo cliente. Limite bytes efetivamente recebidos e processe arquivos isoladamente.

## Identidade, autorização e sessões

- Autentique no backend cada operação privada. Proteção de rota no frontend é navegação, não controle de acesso.
- Faça autorização por objeto e papel no servidor. Admin não recebe automaticamente permissões de owner; proteja papéis, plano, suspensão, chave e exclusão.
- Escritas por cookie exigem validação de origem e CSRF. Preserve HttpOnly, Secure em HTTPS, SameSite apropriado, expiração e rotação.
- OAuth verifica state, nonce, PKCE, issuer, audience e e-mail verificado. Não aceite identidade enviada pelo browser.
- API keys só em headers x-apikey/x-api-key; nunca em query, rota, logs ou mensagens. Nunca aceite API key como sessão.
- Respostas administrativas e dados pessoais usam Cache-Control no-store e retornam só campos necessários.

## URLs e integrações externas

- URL influenciada por usuário passa pelo utilitário seguro; não use fetch direto nesse input.
- Rejeite protocolo não HTTP(S), userinfo, IPs não públicos, loopback, metadata, redes privadas e nomes locais. Resolva DNS e conecte aos IPs validados para impedir rebinding.
- Desative redirects automáticos; revalide cada Location, limite redirects, preserve método permitido e remova credenciais ao mudar origem.
- Restrinja hosts aos provedores necessários quando URLs arbitrárias não forem requisito. Controle egress no host/container para bloquear redes privadas e metadata.
- Defina timeout, limite de bytes e conteúdo para chamadas externas. Não repasse secrets ao destino nem exponha upstream sem normalização.
- Webhooks exigem HMAC, comparação segura, idempotência/janela temporal quando suportadas e confirmação do pedido no provedor antes de conceder benefício.

## Dados, logs e segredos

- Armazene o mínimo necessário; respeite criptografia/hash existentes em db.util.ts e dataCrypto.util.ts.
- Não registre API keys, access tokens, cookies, e-mails completos, prompts privados ou conteúdo do usuário.
- Não altere chave de criptografia, schema ou retenção sem plano compatível de migração/recuperação.
- Segredos ficam no ambiente de hospedagem; .env.example contém somente placeholders.
- Erros não devolvem stack trace, credenciais ou detalhes internos.

## Dependências e configuração

- Consulte advisories oficiais e atualize dependências vulneráveis em package.json e lockfiles versionados, preservando compatibilidade.
- Mantenha TLS, CORS em allowlist exata, headers de segurança, nosniff, limites de corpo e timeouts coerentes.
- CORS não é autenticação. Requisições fora do browser também precisam de autorização.
