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
    date: "5 de novembro de 2026",
    version: APP_VERSION,
    title: "Navegação, novidades e nova home",
    summary:
      "Atualização focada em organização, apresentação e experiência de uso da plataforma, sem alteração no custo das requisições.",
    items: [
      "Menu lateral reorganizado: TTP e ATTP agora ficam exclusivamente em Stickers; Canvas mantém Bem-vindo, Adeus e Efeitos.",
      "Seção Outros com opções reduzidas e renomeadas para evitar repetições desnecessárias.",
      "Nova página de novidades com linha do tempo de todas as implementações da Orbit API.",
      "Homepage reformulada com apresentação dos recursos, benefícios, passo a passo e perguntas frequentes.",
      "Prévias da documentação não consomem mais requests, com limite diário próprio para evitar abusos.",
      "API Key pode ser copiada mesmo oculta e o scroll fica bloqueado quando o menu mobile está aberto.",
      "A versão exibida em Novidades agora é lida diretamente do package.json, mantendo tudo sincronizado.",
      "Header e identidade visual ajustados com a logo oficial da Orbit."
    ],
    link: {
      label: "Ver documentação",
      href: "/app/doc/canvas/welcome"
    }
  },
  {
    date: "4 de novembro de 2026",
    version: "1.3.0",
    title: "Playground de Brat e Abrat",
    summary:
      "Os stickers Brat e Abrat agora podem ser personalizados e testados diretamente na documentação.",
    items: [
      "Editor de texto, cor de fundo, cor do texto e alinhamento para Brat e Abrat.",
      "Prévia quadrada em 512x512 com atualização automática do resultado.",
      "Exemplos de requisição sincronizados com as opções escolhidas no playground.",
      "Correção do diretório temporário no Android para a geração de GIFs animados."
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
      "Páginas dinâmicas para cada endpoint com tabela de parâmetros e método HTTP.",
      "Playground dos cartões Bem-vindo e Adeus com avatar, fundo, título e subtítulo.",
      "Exemplos em JavaScript prontos para copiar, com opção de ocultar ou revelar o token.",
      "Atalhos diretos do menu para cada documentação e navegação entre seções."
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
      "Sidebar com grupos expansíveis, rotas ativas e menu de conta animado.",
      "Transições suaves entre páginas, drawer mobile e melhorias de acessibilidade.",
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
      "Downloads de Instagram, Pinterest, TikTok e Play para áudio e vídeo.",
      "Canvas com cartões de boas-vindas, despedida e efeitos em imagens.",
      "Stickers TTP, ATTP, Brat e Abrat, transcrição com IA e conversão para GIF.",
      "Planos Free, Basic e Gold com controle de requisições e limites diários."
    ]
  }
];
