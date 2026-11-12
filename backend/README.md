# Orbit API — Backend

Backend REST da Orbit API, executado com Bun e TypeScript. Ele atende os endpoints públicos da API, autentica usuários e API keys, registra uso, gera mídia, disponibiliza arquivos e integra os serviços de IA.

## Requisitos

- [Bun](https://bun.sh/) para desenvolvimento e build.
- MongoDB em produção. Sem `MONGO_URI`, o modo local mantém os dados apenas em memória.
- `ffmpeg` para operações de conversão, composição e merge de mídia quando executadas fora do Docker.
- Tesseract OCR com dados de idioma português e inglês para usar `/api/ai/ocr` fora do Docker. A imagem de produção já inclui esses pacotes.
- SDK `devworldbr-sdk` para busca e resolução de mídia do YouTube.

## Configuração local

Na pasta `backend`:

```bash
bun install --frozen-lockfile
cp .env.example .env
```

Edite `.env` com as credenciais locais e inicie o servidor:

```bash
bun run dev
```

O servidor escuta em `http://localhost:3000` por padrão. Para executar frontend e backend juntos, consulte o README raiz e use `make run-dev`.

## Variáveis de ambiente

| Variável | Uso |
| --- | --- |
| `PORT` | Porta HTTP. Padrão local: `3000`; o Render injeta a porta do serviço. |
| `BACKEND_URL` | URL do backend aceita como origem confiável em operações de sessão/CSRF. |
| `FRONTEND_URL` | Origem do frontend para redirects de OAuth e páginas de erro. |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Credenciais OAuth do Google. |
| `GOOGLE_REDIRECT_URI` | Callback OAuth, normalmente a URL do frontend com `/api/auth/google/callback`. |
| `SESSION_TTL_HOURS`, `SESSION_IDLE_MINUTES`, `SESSION_ROTATE_HOURS` | Duração absoluta, inatividade e rotação de sessão. |
| `COOKIE_SECURE` | Use `true` em produção com HTTPS; use `false` apenas no desenvolvimento HTTP local. |
| `OWNER_API_KEY`, `ADMIN_API_KEY`, `PUBLIC_API_KEY` | API keys por nível de acesso. Configure segredos fortes em produção. |
| `OWNER_EMAIL` | E-mail reservado ao papel `owner`; configure em vez de codificar esse valor no código. |
| `CORS_ORIGIN` | Allowlist adicional de origens web cross-origin. Aceita uma ou mais origens HTTP(S) separadas por vírgula, sem caminhos ou curingas. `FRONTEND_URL` e `BACKEND_URL` também são permitidas automaticamente. |
| `PUBLIC_BASE_URL` | Base usada nos links `/storage/<id>.<ext>` retornados por endpoints de mídia. Deve ser acessível pelo consumidor. |
| `DOCS_PREVIEW_DAILY_LIMIT` | Limite diário de prévias documentais para sessões autenticadas. |
| `MONGO_URI`, `MONGO_DB_NAME` | Conexão e nome do banco. `MONGO_URI` é obrigatório em produção; o nome padrão é `orbit`. |
| `MERCADO_PAGO_ACCESS_TOKEN` | Access token da aplicação Mercado Pago usada para criar e consultar pedidos da Orders API. |
| `MERCADO_PAGO_WEBHOOK_SECRET` | Chave secreta de assinatura configurada para o webhook de pedidos. O endpoint é `/api/webhooks/mercado-pago`. |
| `DATA_ENCRYPTION_KEY` | Chave Base64 de 32 bytes para criptografia AES-256-GCM e hashes HMAC dos dados persistidos. Gere com `openssl rand -base64 32`. |
| `AIHORDE_API_KEY` | Chave opcional para geração de imagens pelo AI Horde; sem ela, a integração usa a chave pública de baixa prioridade. |
| `TESSERACT_PATH` | Caminho opcional do executável Tesseract. Se vazio, procura `tesseract` no `PATH`. |

O arquivo [`.env.example`](.env.example) contém valores de desenvolvimento. Não use as chaves de exemplo em produção. `DATA_ENCRYPTION_KEY` precisa permanecer estável enquanto os dados criptografados existentes forem usados; uma troca sem migração impede sua leitura.

Para pagamentos dos planos, configure no painel do Mercado Pago um webhook do tópico `order` apontando para `https://<domínio-da-api>/api/webhooks/mercado-pago` e copie o segredo da assinatura para `MERCADO_PAGO_WEBHOOK_SECRET`. Configure também `MERCADO_PAGO_ACCESS_TOKEN` e `FRONTEND_URL`. A renovação só é aplicada após confirmação assinada e consulta do pedido na Orders API; os pedidos ficam registrados na coleção `billing_orders`.

Os downloads do YouTube usam a operação `ytSearch` do SDK DevWorld e os endpoints de mídia do provedor. As rotas existentes mantêm os parâmetros `url` e `name` e não dependem de yt-dlp nem de cookies locais.

## Principais recursos e rotas

A tabela completa de parâmetros e exemplos de consumo fica no dashboard, em `/app/doc`. O roteador atual agrupa recursos nestas áreas:

- **Autenticação e conta:** Google OAuth, sessão, logout, API Key, saldo e métricas de uso.
- **Downloads:** Instagram, TikTok (áudio, vídeo e carrossel), Pinterest, YouTube por URL ou busca, Facebook, SoundCloud, Spotify, Threads, Google Drive, CapCut e Twitter/X.
- **IA:** GPT, Groq, Gemini, OCR local (`POST /api/ai/ocr`), resumo de texto (`POST /api/ai/summarize`), resumo de áudio (`POST /api/audio/summarize`), Shazam por URL ou arquivo (`POST /api/ai/shazam`, multipart `file`, até 50 MB) e geração assíncrona de imagens com Stable Diffusion/AI Horde (`POST /api/ai/image`, consulta em `/api/ai/image/status`).
- **Canvas e stickers:** cartões welcome/goodbye, TTP/ATTP, efeitos, stickers e conversão para GIF.
- **Pesquisa e utilitários:** pesquisa do YouTube v1/v2, transcrição Whisper de áudio/vídeo e armazenamento de mídia.

OCR roda localmente pelo Tesseract e aceita PNG, JPEG, GIF, WebP, BMP e TIFF de até 15 MB. Resumo usa a integração GPT já configurada e envia o texto ao provedor de IA; aceita até 10.000 caracteres, dividindo textos longos em partes compatíveis com o SDK atual. Resumo de áudio combina a transcrição local Whisper (até 50 MB e 10 minutos) com essa integração GPT, desde que a transcrição tenha até 10.000 caracteres. Os três endpoints usam a autenticação da API e contabilizam uma requisição por chamada.
- **Administração:** gerenciamento de usuários e API keys; ações de owner para excluir contas e atualizar planos.

Endpoints de uso da API aceitam a API Key somente nos headers `x-apikey` ou `x-api-key`; não envie chaves em URLs. As rotas de conta, administração e owner usam sessão; API keys não substituem a autenticação da sessão. Operações de escrita com sessão exigem CSRF.

Configure `CORS_ORIGIN` para origens adicionais quando um browser precisar acessar o backend em outro domínio. `FRONTEND_URL` e `BACKEND_URL` entram automaticamente na allowlist. A política aceita credenciais e os headers `Content-Type`, `Range`, `X-Apikey`, `X-Api-Key` e `X-CSRF-Token`; origens não listadas recebem `403`. CORS controla o acesso de browsers e não substitui API keys, sessões ou autorização.

Arquivos gerados ou baixados são servidos por `/storage/<id>.<ext>`. Referências e arquivos locais têm validade temporária; configure `PUBLIC_BASE_URL` para que os links retornados apontem ao host correto.

As rotas de Spotify, Threads, Google Drive, CapCut e Twitter/X usam `btch-downloader`. Elas aceitam URLs públicas e repassam a URL enviada ao serviço externo usado pela biblioteca para resolução; os arquivos não são armazenados pela Orbit.

## Estrutura de pastas

- 📁 `assets` ➔ _fontes usadas por canvas e stickers_
  - 📁 `fonts` ➔ _fontes tipográficas e emoji_
- 📁 `models` ➔ _modelos locais usados na transcrição_
  - 📁 `whisper-tiny` ➔ _encoder, decoder e tokens do Whisper tiny_
- 📁 `scripts` ➔ _scripts auxiliares de build_
- 📁 `src` ➔ _código principal da API_
  - 📁 `errors` ➔ _erros HTTP e de domínio_
  - 📁 `interface` ➔ _contratos TypeScript entre serviços e rotas_
  - 📁 `middlewares` ➔ _autenticação, autorização e tratamento de erros_
  - 📁 `models` ➔ _modelos de dados e papéis de usuário_
  - 📁 `routes` ➔ _roteamento HTTP_
    - 📁 `admin` ➔ _rotas administrativas_
    - 📁 `api` ➔ _endpoints da API_
      - 📁 `ai` ➔ _serviços de IA e geração de imagem_
      - 📁 `auth/google` ➔ _login OAuth e callback_
      - 📁 `canvas` ➔ _geração de imagens e efeitos_
      - 📁 `download` ➔ _download e resolução de mídias_
      - 📁 `search` ➔ _pesquisa de conteúdo_
      - 📁 `sticker` ➔ _geração de stickers_
      - 📁 `user` ➔ _chave, saldo e uso da conta_
      - 📁 `utility` ➔ _conversão de mídia_
    - 📁 `owner` ➔ _operações exclusivas do owner_
    - 📁 `public` ➔ _welcome, prévias públicas e entrega de storage_
  - 📁 `services` ➔ _MongoDB, sessões, downloads, storage, canvas, IA e transcrição_
  - 📁 `tests` ➔ _testes Bun e fixtures locais_
  - 📁 `types` ➔ _schemas e tipos dos payloads_
  - 📁 `utils` ➔ _validação, segurança de URLs, cookies, criptografia e helpers_
  - 📝 `index.ts` ➔ _inicialização do servidor Bun_
- 📁 `storage` ➔ _arquivos temporários gerados em runtime; não versionar seu conteúdo_
- 📝 `Dockerfile` ➔ _build compilado e imagem de produção com ffmpeg e Whisper_
- 📝 `render.yaml` ➔ _Blueprint de deploy no Render_
- 📝 `build.config.json` ➔ _configuração do executável compilado_
- 📝 `package.json` e `bun.lock` ➔ _scripts e dependências Bun_
- 📝 `.env.example` ➔ _exemplo de variáveis de ambiente_
- 📝 `README.md` ➔ _esta documentação_

## Comandos

Na pasta `backend`:

```bash
bun run dev      # Servidor de desenvolvimento com hot reload
bun run build    # Gera dist/orbit-backend
bun start        # Executa o build de produção
bun test         # Executa os testes Bun
```

O build compila a entrada definida em `build.config.json` como executável Bun minificado com bytecode. O executável não substitui criptografia nem proteção contra engenharia reversa. O runtime ainda usa `node_modules` para dependências nativas.

## Docker e deploy

O [Dockerfile](Dockerfile) instala `ffmpeg` e Tesseract OCR com português e inglês, compila o backend e prepara os modelos Whisper. O serviço Render está descrito em [`render.yaml`](render.yaml); no deploy, configure as variáveis secretas no painel, incluindo `MONGO_URI`, `DATA_ENCRYPTION_KEY`, credenciais OAuth e as API keys necessárias.

O storage local é temporário e não deve ser tratado como armazenamento permanente. Se o provedor usar instâncias efêmeras, os links antigos deixam de funcionar quando os arquivos locais forem removidos ou a instância reiniciar.

## Segurança dos dados

- Tokens de API, identificadores Google e e-mails persistidos usam hashes HMAC para busca/deduplicação; os dados que precisam ser lidos pela aplicação são protegidos com AES-256-GCM.
- A chave `DATA_ENCRYPTION_KEY` não pode ser trocada sem um processo de migração/rotação dos dados existentes.
- Mantenha `.env`, cookies exportados e credenciais fora do Git e dos logs.
- A API Key serve para consumir endpoints públicos da API. Painel, administração e operações de owner exigem sessão e verificação de permissões no backend.
