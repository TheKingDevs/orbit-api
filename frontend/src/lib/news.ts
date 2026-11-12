import { APP_VERSION } from "@lib/appVersion";

export interface NewsEntry {
  date: string;
  version: string;
  title: string;
  summary: string;
  items: string[];
  link?: {
    label: string;
    href: string;
  };
}

export const NEWS: NewsEntry[] = [
  {
    date: "10 de novembro de 2026",
    version: APP_VERSION,
    title: "Ajustes na API e no painel",
    summary: `A versão ${APP_VERSION} traz novos recursos e melhorias para a Orbit API.`,
    items: [
      "Novos endpoints de IA para imagens, OCR e resumos.",
      "Mais opções de download em diferentes plataformas.",
      "Histórico de requisições com paginação e seleção de 10 ou 50 itens.",
      "Melhorias nos dados e na foto de perfil exibidos no painel.",
      "Ajustes nos planos Basic e Gold e contratação pelo Mercado Pago.",
      "Melhorias na administração e na navegação da conta."
    ],
    link: {
      label: "Explorar novos recursos",
      href: "/app/doc/image-ai/stable-diffusion"
    }
  },
  {
    date: "7 de novembro de 2026",
    version: "2.0.0",
    title: "Novos recursos de IA, downloads e métricas de uso",
    summary:
      "Versão 2.0.0 com novas APIs de inteligência artificial, downloads ampliados, pesquisa no YouTube e painel de consumo de requisições.",
    items: [
      "Novos endpoints de inteligência artificial: GPT, Groq, Gemini e identificação de músicas com Shazam.",
      "Downloads ampliados com suporte para TikTok (incluindo carrossel de imagens), Kwai, Facebook e SoundCloud.",
      "Pesquisa no YouTube integrada à API com retorno rápido de vídeos, canais e metadados.",
      "Play Áudio e Play Vídeo com busca direta pelo nome da música ou vídeo.",
      "YTDL Áudio e YTDL Vídeo para obter o link direto de download a partir do link do YouTube.",
      "Menu lateral organizado por categorias para facilitar a navegação.",
      "Painel com métricas de uso da API: requisições do dia, consumo diário e endpoints mais acessados.",
      "Ambiente interativo na documentação com prévias ao vivo dos resultados."
    ],
    link: {
      label: "Explorar recursos da versão 2.0.0",
      href: "/app/doc/text-ai/gpt"
    }
  },
  {
    date: "5 de novembro de 2026",
    version: "1.4.0",
    title: "Navegação, novidades e nova página inicial",
    summary:
      "Atualização focada na organização do painel e melhoria da experiência de uso da plataforma.",
    items: [
      "Menu lateral aprimorado para deixar as ferramentas mais fáceis de encontrar.",
      "Página de novidades com a linha do tempo de atualizações da plataforma.",
      "Página inicial renovada com apresentação de recursos, benefícios e perguntas frequentes.",
      "Prévias na documentação com limite diário dedicado sem consumir requisições do plano.",
      "Cópia rápida da API Key diretamente pelo painel.",
      "Identidade visual oficial da Orbit atualizada."
    ]
  },
  {
    date: "4 de novembro de 2026",
    version: "1.3.0",
    title: "Playground interativo de figurinhas",
    summary:
      "Área interativa para personalizar e testar a geração de figurinhas diretamente na documentação.",
    items: [
      "Personalização em tempo real de texto, cores de fundo e alinhamento.",
      "Prévia visual com atualização instantânea conforme os parâmetros escolhidos.",
      "Exemplos de requisição sincronizados com as opções do playground.",
      "Otimização no desempenho de geração de figurinhas animadas."
    ],
    link: {
      label: "Testar figurinhas",
      href: "/app/doc/stickers/brat"
    }
  },
  {
    date: "3 de novembro de 2026",
    version: "1.2.0",
    title: "Documentação interativa",
    summary:
      "Cada rota agora conta com uma página própria contendo parâmetros, exemplos e pré-visualização ao vivo.",
    items: [
      "Documentação completa para cada recurso com tabela de parâmetros e métodos HTTP.",
      "Playground dos cartões de boas-vindas e despedida com personalização de imagem e texto.",
      "Exemplos práticos de código prontos para copiar e integrar.",
      "Navegação rápida entre as diferentes ferramentas da API."
    ],
    link: {
      label: "Abrir documentação",
      href: "/app/doc/canvas/welcome"
    }
  },
  {
    date: "2 de novembro de 2026",
    version: "1.1.0",
    title: "Painel de controle e navegação",
    summary:
      "Nova interface para gerenciar a API Key, acompanhar o plano e navegar pela plataforma.",
    items: [
      "Painel com chave de API, limite do plano contratado e canal de suporte.",
      "Navegação intuitiva com menu de perfil e suporte otimizado a dispositivos móveis.",
      "Transições fluidas entre páginas e melhorias de usabilidade."
    ],
    link: {
      label: "Abrir painel",
      href: "/app"
    }
  },
  {
    date: "1 de novembro de 2026",
    version: "1.0.0",
    title: "Lançamento da Orbit API",
    summary:
      "A base da plataforma: autenticação segura, gerenciamento de chaves e os primeiros endpoints prontos para uso.",
    items: [
      "Autenticação com Google e gerenciamento de chaves de API.",
      "Downloads de mídias de redes sociais para áudio e vídeo.",
      "Criação de imagens personalizadas para cartões e efeitos.",
      "Geração de figurinhas estáticas e animadas a partir de texto.",
      "Transcrição de áudio com inteligência artificial e conversão de mídias.",
      "Planos Free, Basic e Gold com limites ajustados para diferentes necessidades."
    ]
  }
];
