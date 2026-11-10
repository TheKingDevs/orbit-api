# Orbit API — Frontend

Aplicação web da Orbit API. O frontend apresenta a plataforma, autentica usuários com Google, oferece um dashboard de conta e consumo, e reúne documentação interativa para os endpoints da API.

## Requisitos

- Node.js 20.9 ou superior, conforme o requisito do Next.js instalado.
- npm.
- Backend Orbit API em execução. O frontend encaminha as chamadas de API para ele.

O backend tem configuração e instruções próprias em [`../backend/README.md`](../backend/README.md).

## Desenvolvimento local

Na pasta `frontend`, instale as dependências e crie o arquivo de ambiente:

```bash
npm install
cp .env.example .env
```

O `package-lock.json` não é versionado neste repositório; use `npm install` para gerar o lockfile localmente.

Configure `BACKEND_URL` para apontar ao backend em execução. Em seguida, inicie o frontend:

```bash
npm run dev
```

O servidor de desenvolvimento usa `http://localhost:3001`. Por padrão, o backend esperado é `http://localhost:3000`.

## Variáveis de ambiente

As variáveis abaixo estão listadas em [`.env.example`](.env.example):

| Variável | Uso |
| --- | --- |
| `BACKEND_URL` | URL interna do backend usada pelos rewrites do Next.js para `/api/*`, `/storage/*`, `/preview/ttp` e `/assets/html-to-image.js`. Padrão: `http://localhost:3000`. |
| `NEXT_PUBLIC_APP_NAME` | Nome da aplicação usado em metadados de SEO. Padrão: `Orbit API`. |
| `NEXT_PUBLIC_SITE_URL` | URL pública canônica do site, usada em metadados, sitemap e robots. |
| `NEXT_PUBLIC_API_URL` | URL pública usada nos exemplos de requisição da documentação. Se vazia, os exemplos usam a origem atual do navegador. Também serve como fallback para URL do site nos metadados. |
| `NEXT_PUBLIC_WHATSAPP_CHANNEL_URL` | Link opcional para o canal de atualizações exibido no dashboard. |
| `NEXT_PUBLIC_WHATSAPP_SUPPORT_URL` | Link opcional de convite para o grupo de suporte exibido na página de suporte. |

`NEXT_PUBLIC_*` é incorporado pelo Next.js durante a build. Configure esses valores no ambiente de build e reconstrua o frontend após alterá-los. `BACKEND_URL` é usado pelo servidor Next.js; não o exponha como uma variável pública no navegador.

O frontend usa os rewrites do Next.js para chamar o backend no mesmo domínio, então o browser normalmente não precisa de CORS. Se uma integração web chamar diretamente o domínio do backend, inclua a origem pública exata em `CORS_ORIGIN` no backend.

## Páginas

| Caminho | Conteúdo |
| --- | --- |
| `/` | Landing page pública, apresentação de recursos e acesso à documentação. |
| `/login` | Login com Google. O fluxo de OAuth é iniciado pelo backend. |
| `/app` | Dashboard com API Key, plano, limite de uso e atalhos para o histórico. |
| `/app/doc` | Redireciona para a primeira página da documentação. |
| `/app/doc/[...slug]` | Referência de endpoint, exemplos de código e playground quando disponível. |
| `/app/novidades` | Linha do tempo de recursos e atualizações. |
| `/app/planos` | Comparação dos planos Free, Basic e Gold. |
| `/app/admin` | Console de administração, visível para contas com papel `admin` ou `owner`. |
| `/me` | Histórico de uso, métricas e endpoints mais utilizados. |
| `/erro/[code]` | Página de erro com texto adequado ao código. |

As páginas da área `/app` passam pelo `SessionGate`: ele consulta a sessão e redireciona para `/login` se ela expirou. O `proxy.ts` também exige a presença do cookie de sessão para rotas privadas; a validação efetiva da sessão e das permissões é feita pelo backend.

## Documentação e playgrounds

O catálogo de endpoints fica em [`src/lib/docs.ts`](src/lib/docs.ts). A navegação lateral usa esse catálogo para organizar as páginas por categoria, e `src/components/docs/ApiDocView.tsx` apresenta parâmetros, URL, exemplos de chamada e playgrounds especializados.

As prévias interativas são implementadas em [`src/components/docs/ApiPreview.tsx`](src/components/docs/ApiPreview.tsx). Conforme o endpoint, o playground pode enviar uma requisição real à API, gerar uma imagem, apresentar mídia ou carregar uma prévia visual. O endpoint e a autenticação utilizados são os mesmos da integração; considere os limites e custos de uso configurados no backend.

As categorias atuais incluem Audio AI, Canvas, Downloads, Ferramentas, Image AI, Pesquisa, Stickers, Text AI e Utilitários. Para acrescentar ou alterar documentação, atualize o registro em `src/lib/docs.ts` e, se necessário, acrescente o tratamento de campos e resultados em `ApiPreview.tsx`.

## Sessão e chamadas à API

- `src/lib/auth/AuthProvider.tsx` mantém o estado de sessão no cliente.
- `src/lib/auth/session.ts` consulta a sessão, encerra a sessão e inicia o login Google.
- `src/lib/auth/http.ts` centraliza as requisições pelo mesmo domínio, inclui credenciais, envia o token CSRF em métodos de escrita e trata respostas `401`.
- `src/proxy.ts` redireciona visitantes sem cookie de sessão para `/login` nas rotas privadas.
- `next.config.ts` encaminha API, mídia armazenada e recursos auxiliares ao backend definido em `BACKEND_URL`.

Use `apiFetch` para novas chamadas autenticadas feitas pelo browser, em vez de chamar o backend diretamente. Isso mantém o tráfego no mesmo domínio e aplica o tratamento comum de sessão e CSRF.

## Estrutura de pastas

- 📁 `public` ➔ _logos, imagens sociais e assets servidos diretamente pelo Next.js_
- 📁 `src` ➔ _código-fonte do frontend_
  - 📁 `app` ➔ _rotas e layouts do App Router_
    - 📁 `app` ➔ _dashboard, administração, planos, novidades e documentação protegida_
      - 📁 `doc/[...slug]` ➔ _páginas dinâmicas da documentação da API_
    - 📁 `login` ➔ _entrada com Google OAuth_
    - 📁 `me` ➔ _histórico e métricas da conta_
    - 📁 `erro/[code]` ➔ _páginas de erro por código HTTP_
    - 📝 `layout.tsx` ➔ _layout raiz, fontes, metadados e provider de sessão_
    - 📝 `globals.css` ➔ _Tailwind e animações globais_
    - 📝 `manifest.ts`, `robots.ts`, `sitemap.ts` ➔ _metadados de instalação e indexação_
  - 📁 `components` ➔ _componentes de interface_
    - 📁 `dashboard` ➔ _dashboard, menu, loading e console admin_
    - 📁 `docs` ➔ _referência de endpoints e playgrounds interativos_
    - 📁 `errors` ➔ _apresentação de erros_
    - 📁 `landing` ➔ _componentes da página pública_
    - 📁 `news` ➔ _linha do tempo de novidades_
    - 📝 `SessionGate.tsx` ➔ _proteção visual da área autenticada_
  - 📁 `constants` ➔ _constantes da aplicação e cookies_
  - 📁 `interface` ➔ _tipos compartilhados no frontend_
  - 📁 `lib` ➔ _catálogo da documentação, autenticação, HTTP, SEO e novidades_
    - 📁 `auth` ➔ _provider, sessão, apiFetch e hooks de conta_
  - 📝 `proxy.ts` ➔ _redirecionamento de rotas sem cookie de sessão_
- 📝 `next.config.ts` ➔ _rewrites do backend e configuração do Next.js_
- 📝 `package.json` ➔ _scripts e dependências_
- 📝 `.env.example` ➔ _exemplo de configuração local_
- 📝 `README.md` ➔ _esta documentação_

O projeto usa Next.js App Router, React, TypeScript estrito e Tailwind CSS 4. A identidade visual é definida principalmente pelas classes Tailwind dos componentes e por estilos globais em `src/app/globals.css`. As fontes Geist são carregadas por `next/font` no layout raiz.

## Comandos

Na pasta `frontend`:

```bash
npm run dev      # Desenvolvimento em http://localhost:3001
npm run lint     # ESLint
npm run build    # Build de produção
npm run start    # Servidor de produção em http://localhost:3001
```

## Build e publicação

Defina as variáveis de ambiente no serviço de hospedagem e execute `npm install` e `npm run build`. Em produção, mantenha `BACKEND_URL` acessível pelo processo Next.js e aponte `NEXT_PUBLIC_SITE_URL` e, se necessário, `NEXT_PUBLIC_API_URL` para os domínios públicos corretos.

O frontend usa rewrites do Next.js para o backend e configura um `proxyTimeout` de até 30 minutos, necessário para requisições demoradas, como geração de imagens. A plataforma de hospedagem ainda precisa permitir esse tempo de conexão; o timeout do Next.js não substitui limites impostos pelo provedor.
