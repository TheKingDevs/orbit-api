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
    date: "7 de novembro de 2026",
    version: APP_VERSION,
    title: "Novos recursos de IA, downloads e experiência renovada",
    summary:
      "Versão 2.0.0 com novas APIs de IA e pesquisa, downloads ampliados, documentação interativa, métricas de uso, loading renovado e SEO para compartilhamento.",
    items: [
      "Novos endpoints de IA: GPT, Groq, Gemini e Shazam, com prévia interativa na documentação.",
      "Novos downloads: TikTok Imagens, Kwai, Facebook e SoundCloud, além da busca do Pinterest por termo.",
      "Pesquisa de YouTube (v1 e v2) integrada à API.",
      "Play Audio e Play Video agora recebem apenas o nome da música/vídeo e retornam a URL de download do áudio ou vídeo.",
      "YTDL Áudio e YTDL Vídeo para obter o link direto de download a partir de uma URL do YouTube.",
      "Menu lateral reorganizado em grupos: Text AI, Pesquisa e Ferramentas.",
      "Painel com métricas de uso da API: requests do dia, consumo diário, endpoints mais usados e histórico de chamadas.",
      "Documentação com prévias ao vivo para IA, YouTube, Shazam, Pinterest, Kwai, Facebook, SoundCloud e TikTok.",
      "Novo loading com skeleton, mantendo o shell do app enquanto a sessão é verificada.",
      "SEO completo para compartilhamento: Open Graph, Twitter Card, imagem de capa com a logo, sitemap, robots e dados estruturados.",
      "Transcrição com Whisper, Canvas, stickers (TTP, ATTP, Brat e Abrat) e conversão para GIF mantidos e aprimorados."
    ],
    link: {
      label: "Explorar novos recursos",
      href: "/app/doc/text-ai/gpt"
    }
  },
  {
    date: "5 de novembro de 2026",
    version: "1.4.0",
    title: "Navegação, novidades e nova home",
    summary:
      "Atualização focada em organização e experiência de uso da plataforma.",
    items: [
      "Menu lateral reorganizado para deixar as ferramentas mais fáceis de encontrar.",
      "Nova página de novidades com o histórico de atualizações da plataforma.",
      "Homepage renovada com recursos, benefícios, passo a passo e perguntas frequentes.",
      "Prévias da documentação agora têm limite diário próprio e não consomem requisições.",
      "Copiar a API Key ficou mais simples, mesmo quando a chave está oculta.",
      "Identidade visual atualizada com a logo oficial da Orbit."
    ]
  },
  {
    date: "4 de novembro de 2026",
    version: "1.3.0",
    title: "Playground de Brat e Abrat",
    summary:
      "Os stickers Brat e Abrat agora podem ser personalizados e testados diretamente na documentação.",
    items: [
      "Personalize texto, cores e alinhamento dos stickers Brat e Abrat.",
      "Prévia atualizada automaticamente conforme as opções escolhidas.",
      "Exemplos de uso sincronizados com o playground.",
      "Melhorias na geração de GIFs animados no Android."
    ],
    link: {
      label: "Testar Brat",
      href: "/app/doc/stickers/brat"
    }
  },
  {
    date: "3 de novembro de 2026",
    version: "1.2.0",
    title: "Documentação interativa",
    summary:
      "Todas as rotas ganharam uma página própria com parâmetros, exemplos e pré-visualização ao vivo.",
    items: [
      "Documentação completa para cada recurso, com parâmetros e exemplos.",
      "Playground dos cartões Bem-vindo e Adeus com avatar, fundo, título e subtítulo.",
      "Exemplos prontos para copiar, com opção de ocultar ou revelar o token.",
      "Navegação mais rápida entre as seções da documentação."
    ],
    link: {
      label: "Abrir documentação",
      href: "/app/doc/canvas/welcome"
    }
  },
  {
    date: "2 de novembro de 2026",
    version: "1.1.0",
    title: "Dashboard e identidade",
    summary:
      "Uma nova experiência para gerenciar a API Key, acompanhar o plano e navegar pela plataforma.",
    items: [
      "Dashboard com API Key, limite do plano e canal de atualizações.",
      "Navegação mais moderna e intuitiva, com menu de conta e versão mobile.",
      "Transições suaves entre páginas e melhorias de acessibilidade.",
      "Ícones atualizados, incluindo WhatsApp e YouTube na identidade da Orbit."
    ],
    link: {
      label: "Abrir dashboard",
      href: "/app"
    }
  },
  {
    date: "1 de novembro de 2026",
    version: "1.0.0",
    title: "Lançamento da Orbit API",
    summary:
      "A base da plataforma: autenticação, API Keys e os primeiros recursos prontos para bots e automações.",
    items: [
      "Login com Google, sessões seguras e gerenciamento de API Keys.",
      "Downloads de Instagram, Pinterest, TikTok e YouTube para áudio e vídeo.",
      "Canvas com cartões de boas-vindas, despedida e efeitos em imagens.",
      "Stickers TTP, ATTP, Brat e Abrat, transcrição com IA e conversão para GIF.",
      "Planos Free, Basic e Gold com controle de requisições e limites diários."
    ]
  }
];
