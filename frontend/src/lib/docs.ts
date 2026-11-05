export interface DocParam {
  name: string;
  type: string;
  required: boolean;
  description: string;
}

export type DocPlayground = "welcome" | "goodbye" | "ttp" | "attp" | "brat" | "abrat";

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
  comingSoon?: boolean;
}

const TOKEN_PARAM: DocParam = {
  name: "token",
  type: "text",
  required: true,
  description:
    "Sua API Key. Também é possível autenticar com o cookie de sessão ou com o header Authorization: Bearer."
};

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

function downloadDoc(
  slug: string,
  route: string,
  title: string,
  description: string,
  extra: DocParam[] = []
): ApiDoc {
  return {
    slug: ["downloads", slug],
    section: "Downloads",
    title,
    description,
    method: "GET",
    path: `/api/download/${route}`,
    cost: "1 request",
    params: [
      TOKEN_PARAM,
      {
        name: "url",
        type: "link",
        required: true,
        description: "URL do conteúdo que será processado."
      },
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
    ]
  ),
  downloadDoc(
    "pinterest",
    "pinterest",
    "Pinterest",
    "Baixa imagens ou vídeos públicos do Pinterest.",
    [
      {
        name: "type",
        type: "text",
        required: false,
        description: "Tipo de mídia: image, gif ou video. Padrão: image."
      }
    ]
  ),
  downloadDoc(
    "play-audio",
    "play_audio",
    "Play Audio",
    "Extrai o áudio de conteúdos do YouTube e de outras plataformas.",
    [
      {
        name: "platform",
        type: "text",
        required: false,
        description: "Plataforma do conteúdo. Padrão: youtube."
      }
    ]
  ),
  downloadDoc(
    "play-video",
    "play_video",
    "Play Video",
    "Baixa o vídeo de conteúdos do YouTube e de outras plataformas.",
    [
      {
        name: "platform",
        type: "text",
        required: false,
        description: "Plataforma do conteúdo. Padrão: youtube."
      }
    ]
  ),
  downloadDoc(
    "tiktok-audio",
    "tiktok_audio",
    "TikTok Audio",
    "Extrai o áudio de um vídeo público do TikTok."
  ),
  downloadDoc(
    "tiktok-video",
    "tiktok_video",
    "TikTok Video",
    "Baixa um vídeo público do TikTok."
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
  comingSoon(
    ["image-ai"],
    "API's",
    "Image AI",
    "Geração e edição de imagens com inteligência artificial."
  ),
  comingSoon(
    ["pesquisa"],
    "API's",
    "Pesquisa",
    "Pesquisa e busca de conteúdo para bots e automações."
  ),
  comingSoon(
    ["text-ai"],
    "API's",
    "Text AI",
    "Geração de texto com inteligência artificial."
  ),
  comingSoon(
    ["ferramentas"],
    "Outros",
    "Ferramentas",
    "Ferramentas e utilitários da Orbit API."
  ),
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

  return DOCS.find((doc) => doc.slug.join("/") === key);
}

export function slugHref(slug: string[]): string {
  return `/app/doc/${slug.join("/")}`;
}

export function docHref(doc: ApiDoc): string {
  return slugHref(doc.slug);
}
