export interface DocParam {
  name: string;
  type: string;
  required: boolean;
  description: string;
}

export type DocPlayground = "welcome" | "goodbye" | "ttp" | "attp" | "brat" | "abrat";

export type DocPreview =
  | "ai"
  | "youtube"
  | "shazam"
  | "tiktok-images"
  | "pinterest"
  | "video"
  | "audio"
  | "ytdl"
  | "media"
  | "effects"
  | "transcribe"
  | "audio-summarize"
  | "download"
  | "ocr"
  | "summarize"
  | "to-gif"
  | "image-generation";

export interface ApiDoc {
  slug: string[];
  section: string;
  title: string;
  description: string;
  method: string;
  path: string;
  cost?: string;
  params: DocParam[];
  playground?: DocPlayground;
  preview?: DocPreview;
  example?: Record<string, string>;
  comingSoon?: boolean;
}

const APIKEY_PARAM: DocParam = {
  name: "apikey",
  type: "text",
  required: true,
  description:
    "Sua chave de API para consumir os recursos. Envie no header x-apikey ou como parâmetro apikey na URL."
};

const TOKEN_PARAM: DocParam = APIKEY_PARAM;

function canvasCardDoc(
  slug: "welcome" | "goodbye",
  title: string,
  description: string
): ApiDoc {
  return {
    slug: ["canvas", slug],
    section: "Canvas",
    title,
    description,
    method: "GET",
    path: `/api/canvas/${slug}`,
    cost: "1 request",
    playground: slug,
    params: [
      TOKEN_PARAM,
      {
        name: "username",
        type: "text",
        required: true,
        description: "Nome de usuário usado no cartão."
      },
      {
        name: "title",
        type: "text",
        required: false,
        description: "Título exibido no cartão."
      },
      {
        name: "subtitle",
        type: "text",
        required: false,
        description: "Subtítulo exibido no cartão."
      },
      {
        name: "avatarUrl",
        type: "link",
        required: false,
        description: "URL da imagem de avatar."
      },
      {
        name: "bgUrl",
        type: "link",
        required: false,
        description: "URL da imagem de fundo."
      }
    ]
  };
}

const TTP_PARAMS: DocParam[] = [
  TOKEN_PARAM,
  {
    name: "text",
    type: "text",
    required: true,
    description: "Texto que será renderizado."
  },
  {
    name: "textColor",
    type: "text",
    required: false,
    description: "Cor do texto. Padrão: #ffffff."
  },
  {
    name: "backgroundColor",
    type: "text",
    required: false,
    description: "Cor de fundo. Padrão: #0f172a."
  },
  {
    name: "position",
    type: "text",
    required: false,
    description: "Alinhamento: left, center ou right. Padrão: center."
  },
  {
    name: "fontSize",
    type: "number",
    required: false,
    description: "Tamanho da fonte entre 16 e 120."
  },
  {
    name: "effect",
    type: "text",
    required: false,
    description: "Efeito: pulse, wave, typing, rainbow, glow ou zoomin."
  },
  {
    name: "duration",
    type: "number",
    required: false,
    description: "Duração da animação em segundos (1 a 8)."
  },
  {
    name: "fps",
    type: "number",
    required: false,
    description: "Quadros por segundo (5 a 20)."
  }
];

function ttpDoc(
  section: "Canvas" | "Stickers",
  slug: string,
  title: string,
  description: string,
  path: string,
  playground?: DocPlayground
): ApiDoc {
  return {
    slug: [section === "Canvas" ? "canvas" : "stickers", slug],
    section,
    title,
    description,
    method: "GET",
    path,
    cost: "1 request",
    playground,
    params: TTP_PARAMS
  };
}

interface DownloadDocOptions {
  preview?: DocPreview;
  includeUrl?: boolean;
  example?: Record<string, string>;
}

function downloadDoc(
  slug: string,
  route: string,
  title: string,
  description: string,
  extra: DocParam[] = [],
  { preview, includeUrl = true, example }: DownloadDocOptions = {}
): ApiDoc {
  return {
    slug: ["downloads", slug],
    section: "Downloads",
    title,
    description,
    method: "GET",
    path: `/api/download/${route}`,
    cost: "1 request",
    preview,
    example,
    params: [
      TOKEN_PARAM,
      ...(includeUrl
        ? [
            {
              name: "url",
              type: "link" as const,
              required: true,
              description: "URL do conteúdo que será processado."
            }
          ]
        : []),
      ...extra
    ]
  };
}

function comingSoon(
  slug: string[],
  section: string,
  title: string,
  description: string
): ApiDoc {
  return {
    slug,
    section,
    title,
    description,
    method: "",
    path: "",
    params: [],
    comingSoon: true
  };
}

export const DOCS: ApiDoc[] = [
  canvasCardDoc(
    "welcome",
    "Bem-vindo",
    "Cria um cartão de boas-vindas para recepção em grupos."
  ),
  canvasCardDoc(
    "goodbye",
    "Adeus",
    "Cria um cartão de despedida para membros que saem do grupo."
  ),
  {
    slug: ["canvas", "effects"],
    section: "Canvas",
    title: "Efeitos",
    description:
      "Aplica efeitos em uma imagem enviada por URL, multipart ou corpo bruto.",
    method: "GET/POST",
    path: "/api/canvas/effects",
    cost: "1 request",
    preview: "effects",
    example: {
      url: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400",
      effect: "circle"
    },
    params: [
      TOKEN_PARAM,
      {
        name: "url",
        type: "link",
        required: true,
        description: "URL da imagem que receberá os efeitos."
      },
      {
        name: "effect",
        type: "text",
        required: false,
        description:
          "Efeito: invert, blur, mirror, circle, gray, pixel ou upscale. Aceita vários separados por vírgula."
      },
      {
        name: "format",
        type: "text",
        required: false,
        description: "Formato de saída: png ou webp."
      },
      {
        name: "size",
        type: "number",
        required: false,
        description: "Tamanho máximo da imagem entre 16 e 2048."
      }
    ]
  },
  {
    slug: ["audio", "transcribe"],
    section: "Audio AI",
    title: "Transcrever",
    description:
      "Transcreve áudios usando o modelo Whisper e retorna o texto reconhecido.",
    method: "POST",
    path: "/api/transcribe",
    cost: "1 request",
    preview: "transcribe",
    params: [
      TOKEN_PARAM,
      {
        name: "language",
        type: "text",
        required: false,
        description: "Idioma do áudio: auto, pt ou en. Padrão: auto."
      },
      {
        name: "file",
        type: "file",
        required: true,
        description: "Arquivo de áudio enviado em multipart/form-data."
      }
    ]
  },
  {
    slug: ["audio", "summarize"],
    section: "Audio AI",
    title: "Resumir áudio",
    description:
      "Transcreve um áudio ou vídeo com o Whisper local e resume o conteúdo reconhecido usando a integração GPT.",
    method: "POST",
    path: "/api/audio/summarize",
    cost: "1 request",
    preview: "audio-summarize",
    params: [
      TOKEN_PARAM,
      { name: "file", type: "file", required: true, description: "Áudio ou vídeo em multipart/form-data. Até 50 MB e 10 minutos; o texto transcrito precisa caber no limite de 10.000 caracteres do resumo." },
      { name: "language", type: "text", required: false, description: "Idioma do áudio: auto, pt ou en. Padrão: auto." },
      { name: "style", type: "text", required: false, description: "Formato: paragraph ou bullets. Padrão: paragraph." },
      { name: "length", type: "text", required: false, description: "Tamanho: short, medium ou detailed. Padrão: medium." }
    ]
  },
  downloadDoc(
    "instagram",
    "instagram",
    "Instagram",
    "Baixa vídeos, áudios, imagens ou GIFs públicos do Instagram.",
    [
      {
        name: "type",
        type: "text",
        required: true,
        description: "Tipo de mídia: video ou image."
      }
    ],
    {
      preview: "media",
      example: {
        url: "https://www.instagram.com/reel/DfZkZLXP0gw/?vrfl=emx5aWQ5czR0ZmZo",
        type: "video"
      }
    }
  ),
  {
    slug: ["downloads", "pinterest"],
    section: "Downloads",
    title: "Pinterest",
    description:
      "Pesquisa pins por termo ou baixa a mídia de uma URL. Retorna imagens, vídeos e links prontos para uso.",
    method: "GET",
    path: "/api/download/pinterest",
    cost: "1 request",
    preview: "pinterest",
    example: { query: "gatos" },
    params: [
      TOKEN_PARAM,
      {
        name: "url",
        type: "link",
        required: false,
        description: "URL do pin para download."
      },
      {
        name: "query",
        type: "text",
        required: false,
        description: "Termo de pesquisa para listar pins."
      },
      {
        name: "type",
        type: "text",
        required: false,
        description: "Tipo de mídia: image, gif ou video. Padrão: image."
      }
    ]
  },
  downloadDoc(
    "play-audio",
    "play_audio",
    "Play Audio",
    "Pesquisa uma música pelo nome no YouTube e retorna a URL de download do áudio (MP3) no campo downloadUrl.",
    [
      {
        name: "name",
        type: "text",
        required: true,
        description: "Nome da música para buscar no YouTube e baixar como MP3."
      }
    ],
    {
      preview: "media",
      includeUrl: false,
      example: { name: "Shape of You" }
    }
  ),
  downloadDoc(
    "play-video",
    "play_video",
    "Play Video",
    "Pesquisa um vídeo pelo nome no YouTube e retorna a URL de download do vídeo (MP4) no campo downloadUrl.",
    [
      {
        name: "name",
        type: "text",
        required: true,
        description: "Nome do vídeo para buscar no YouTube e baixar como MP4."
      }
    ],
    {
      preview: "media",
      includeUrl: false,
      example: { name: "Vídeo de gatos" }
    }
  ),
  {
    slug: ["downloads", "ytdl-audio"],
    section: "Downloads",
    title: "YTDL Áudio",
    description:
      "Recebe a URL de um vídeo do YouTube e retorna o link direto de download do áudio (MP3).",
    method: "GET",
    path: "/api/download/ytdl_audio",
    cost: "1 request",
    preview: "media",
    example: { url: "https://www.youtube.com/watch?v=kJQP7kiw5Fk" },
    params: [
      TOKEN_PARAM,
      {
        name: "url",
        type: "link",
        required: true,
        description: "URL do vídeo do YouTube para extrair o link de download do áudio (MP3)."
      }
    ]
  },
  {
    slug: ["downloads", "ytdl-video"],
    section: "Downloads",
    title: "YTDL Vídeo",
    description:
      "Recebe a URL de um vídeo do YouTube e retorna o link direto de download do vídeo (MP4).",
    method: "GET",
    path: "/api/download/ytdl_video",
    cost: "1 request",
    preview: "media",
    example: { url: "https://www.youtube.com/watch?v=kJQP7kiw5Fk" },
    params: [
      TOKEN_PARAM,
      {
        name: "url",
        type: "link",
        required: true,
        description: "URL do vídeo do YouTube para extrair o link de download do vídeo (MP4)."
      }
    ]
  },
  downloadDoc(
    "tiktok-audio",
    "tiktok_audio",
    "TikTok Audio",
    "Extrai o áudio de um vídeo público do TikTok.",
    [],
    {
      preview: "media",
      example: { url: "https://vm.tiktok.com/ZSpk6mMKE/" }
    }
  ),
  downloadDoc(
    "tiktok-video",
    "tiktok_video",
    "TikTok Video",
    "Baixa um vídeo público do TikTok.",
    [],
    {
      preview: "media",
      example: { url: "https://vm.tiktok.com/ZSpk6mMKE/" }
    }
  ),
  downloadDoc(
    "tiktok-images",
    "tiktok_images",
    "TikTok Imagens",
    "Retorna todas as imagens/slides de um post do TikTok.",
    [],
    { preview: "tiktok-images" }
  ),
  downloadDoc(
    "facebook",
    "facebook",
    "Facebook",
    "Retorna os links de vídeo em SD e HD de publicações públicas do Facebook.",
    [],
    { preview: "video" }
  ),
  downloadDoc(
    "soundcloud",
    "soundcloud",
    "SoundCloud",
    "Retorna informações, capa e links de áudio de faixas do SoundCloud.",
    [],
    { preview: "audio" }
  ),
  downloadDoc(
    "spotify",
    "spotify",
    "Spotify",
    "Retorna metadados e links de mídia de conteúdo público do Spotify. A resposta contém links resolvidos pelo serviço de download; a Orbit não hospeda os arquivos.",
    [],
    {
      preview: "download",
      example: { url: "https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC" }
    }
  ),
  downloadDoc(
    "threads",
    "threads",
    "Threads",
    "Retorna informações e links de mídia de uma publicação pública do Threads.",
    [],
    {
      preview: "download",
      example: { url: "https://www.threads.com/@usuario/post/POST_ID" }
    }
  ),
  downloadDoc(
    "google-drive",
    "google-drive",
    "Google Drive",
    "Resolve um arquivo público do Google Drive e retorna seus metadados e link de download. O arquivo precisa estar acessível por link.",
    [],
    {
      preview: "download",
      example: { url: "https://drive.google.com/file/d/FILE_ID/view" }
    }
  ),
  downloadDoc(
    "capcut",
    "capcut",
    "CapCut",
    "Retorna informações e links de mídia de um template público do CapCut.",
    [],
    {
      preview: "download",
      example: { url: "https://www.capcut.com/template-detail/TEMPLATE_ID" }
    }
  ),
  downloadDoc(
    "twitter",
    "twitter",
    "Twitter / X",
    "Retorna informações e links de vídeo de uma publicação pública do Twitter/X.",
    [],
    {
      preview: "download",
      example: { url: "https://x.com/usuario/status/POST_ID" }
    }
  ),
  ttpDoc(
    "Stickers",
    "ttp",
    "TTP",
    "Gera um sticker estático de texto em PNG.",
    "/api/sticker/ttp",
    "ttp"
  ),
  ttpDoc(
    "Stickers",
    "attp",
    "ATTP",
    "Gera um sticker animado de texto em GIF.",
    "/api/sticker/attp",
    "attp"
  ),
  ttpDoc(
    "Stickers",
    "brat",
    "Brat",
    "Gera um sticker no estilo brat com texto sobre fundo personalizável.",
    "/api/sticker/brat",
    "brat"
  ),
  ttpDoc(
    "Stickers",
    "abrat",
    "Abrat",
    "Gera um sticker animado no estilo brat.",
    "/api/sticker/abrat",
    "abrat"
  ),
  {
    slug: ["utilitarios", "to-gif"],
    section: "Utilitários",
    title: "Converter para GIF",
    description: "Converte uma imagem WebP em GIF animado.",
    method: "POST",
    path: "/api/utility/to-gif",
    cost: "1 request",
    preview: "to-gif",
    params: [
      TOKEN_PARAM,
      {
        name: "file",
        type: "file",
        required: true,
        description: "Imagem enviada em multipart/form-data."
      }
    ]
  },
  {
    slug: ["image-ai", "stable-diffusion"],
    section: "Image AI",
    title: "Stable Diffusion",
    description: "Gera imagens com modelos Stable Diffusion disponíveis no AI Horde. Envie um prompt, ajustes de geração e, opcionalmente, um prompt negativo.",
    method: "POST",
    path: "/api/ai/image",
    cost: "1 request",
    preview: "image-generation",
    example: {
      prompt: "Uma raposa em uma floresta iluminada por vaga-lumes, ilustração digital",
      negative_prompt: "texto, marca d'água, imagem borrada"
    },
    params: [
      TOKEN_PARAM,
      { name: "prompt", type: "text", required: true, description: "Descrição positiva da imagem que deseja gerar." },
      { name: "negative_prompt", type: "text", required: false, description: "Características que deseja reduzir ou evitar. O efeito depende do modelo." },
      { name: "width", type: "number", required: false, description: "Largura em pixels (padrão 512)." },
      { name: "height", type: "number", required: false, description: "Altura em pixels (padrão 512)." },
      { name: "steps", type: "number", required: false, description: "Número de etapas de geração." },
    ]
  },
  {
    slug: ["image-ai", "ocr"],
    section: "Image AI",
    title: "OCR de imagem",
    description:
      "Extrai texto de imagens localmente usando Tesseract OCR. Aceita PNG, JPEG, GIF, WebP, BMP e TIFF até 15 MB.",
    method: "POST",
    path: "/api/ai/ocr",
    cost: "1 request",
    preview: "ocr",
    params: [
      TOKEN_PARAM,
      { name: "file", type: "file", required: true, description: "Imagem em multipart/form-data. Aceita os campos file ou image." },
      { name: "language", type: "text", required: false, description: "Idioma do texto: auto, pt ou en. Padrão: auto (português e inglês)." }
    ]
  },
  {
    slug: ["text-ai", "gpt"],
    section: "Text AI",
    title: "GPT",
    description:
      "Consulta a inteligência artificial GPT e retorna a resposta em JSON. Aceita GET com query na URL ou POST com JSON/form.",
    method: "GET/POST",
    path: "/api/ai/gpt",
    cost: "1 request",
    preview: "ai",
    params: [
      TOKEN_PARAM,
      {
        name: "query",
        type: "text",
        required: true,
        description: "Pergunta ou instrução enviada para a IA."
      }
    ]
  },
  {
    slug: ["text-ai", "summarize"],
    section: "Text AI",
    title: "Resumir texto",
    description:
      "Gera um resumo de texto usando a integração GPT já disponível na Orbit API. O texto é enviado ao provedor de IA para processamento.",
    method: "POST",
    path: "/api/ai/summarize",
    cost: "1 request",
    preview: "summarize",
    example: {
      text: "A Orbit API reúne recursos de downloads, inteligência artificial, canvas, stickers e utilitários em uma única integração.",
      language: "pt",
      style: "bullets",
      length: "short"
    },
    params: [
      TOKEN_PARAM,
      { name: "text", type: "text", required: true, description: "Texto para resumir. Limite de 10.000 caracteres; textos longos são divididos internamente em partes menores." },
      { name: "language", type: "text", required: false, description: "Idioma: auto, pt ou en. Padrão: auto (mesmo idioma do texto)." },
      { name: "style", type: "text", required: false, description: "Formato: paragraph ou bullets. Padrão: paragraph." },
      { name: "length", type: "text", required: false, description: "Tamanho: short, medium ou detailed. Padrão: medium." }
    ]
  },
  {
    slug: ["text-ai", "groq"],
    section: "Text AI",
    title: "Groq",
    description:
      "Consulta a inteligência artificial Groq e retorna a resposta em JSON. Aceita GET com query na URL ou POST com JSON/form.",
    method: "GET/POST",
    path: "/api/ai/groq",
    cost: "1 request",
    preview: "ai",
    params: [
      TOKEN_PARAM,
      {
        name: "query",
        type: "text",
        required: true,
        description: "Pergunta ou instrução enviada para a IA."
      }
    ]
  },
  {
    slug: ["text-ai", "gemini"],
    section: "Text AI",
    title: "Gemini",
    description:
      "Consulta a inteligência artificial Gemini e retorna a resposta em JSON. Aceita GET com query na URL ou POST com JSON/form.",
    method: "GET/POST",
    path: "/api/ai/gemini",
    cost: "1 request",
    preview: "ai",
    params: [
      TOKEN_PARAM,
      {
        name: "query",
        type: "text",
        required: true,
        description: "Pergunta ou instrução enviada para a IA."
      }
    ]
  },
  {
    slug: ["pesquisa", "youtube_search"],
    section: "Pesquisa",
    title: "YouTube Search",
    description:
      "Pesquisa vídeos no YouTube e retorna título, canal, thumbnail, duração e link em JSON.",
    method: "GET/POST",
    path: "/api/search/youtube",
    cost: "1 request",
    preview: "youtube",
    params: [
      TOKEN_PARAM,
      {
        name: "query",
        type: "text",
        required: true,
        description: "Termo de pesquisa."
      }
    ]
  },
  {
    slug: ["ferramentas", "shazam"],
    section: "Ferramentas",
    title: "Shazam",
    description:
      "Identifica uma música a partir de uma URL de áudio e retorna título, artista, capa e preview.",
    method: "GET/POST",
    path: "/api/ai/shazam",
    cost: "1 request",
    preview: "shazam",
    params: [
      TOKEN_PARAM,
      {
        name: "audioUrl",
        type: "link",
        required: true,
        description: "URL pública do áudio que será identificado (mp3, m4a etc.)."
      }
    ]
  },
  comingSoon(
    ["bot-de-exemplo"],
    "Outros",
    "Bot de exemplo",
    "Exemplos de integração da Orbit API em bots."
  ),
  comingSoon(
    ["sugestao"],
    "Outros",
    "Sugestões e Erros",
    "Envie sugestões ou reporte erros da plataforma."
  ),
  comingSoon(
    ["suporte"],
    "Outros",
    "Grupo de suporte",
    "Entre no grupo de suporte para tirar dúvidas."
  )
];

export function findDoc(slug: string[]): ApiDoc | undefined {
  const key = slug.join("/");

  if (key === "pesquisa/youtube-v2" || key === "pesquisa/youtube") {
    return DOCS.find((doc) => doc.slug.join("/") === "pesquisa/youtube_search");
  }

  return DOCS.find((doc) => doc.slug.join("/") === key);
}

export function slugHref(slug: string[]): string {
  return `/app/doc/${slug.join("/")}`;
}

export function docHref(doc: ApiDoc): string {
  return slugHref(doc.slug);
}
