import dwbr from 'devworldbr-sdk';
import { DangerError, InvalidParameterError } from '@errors/index';
import { IDevWorldBRService } from '@interface/IDevWorldBR';
import { Logger } from '@utils/logger';
import { SdkResponse } from '@types/devworldbr.type';
import { validateSafeUrl, TrustedPlatform } from '@utils/urlSecurity.util';

const PROMO_KEYS = ['criador', 'whatsapp'] as const;
const DEVWORLD_API_BASE = (process.env.DEVWORLDBR_API_BASE || 'https://api.devworldbr.site/api').replace(/\/+$/, '');

function sanitizeResponse(response: unknown): SdkResponse {
  if (!response || typeof response !== 'object' || Array.isArray(response)) {
    return { data: response };
  }

  const clean = { ...(response as Record<string, unknown>) };

  for (const key of PROMO_KEYS) {
    delete clean[key];
  }

  if (typeof clean.autor === 'string') {
    delete clean.autor;
  }

  return clean as SdkResponse;
}

function normalizeTikTokImages(response: SdkResponse): SdkResponse {
  const result = response.resultado;

  if (!result || typeof result !== 'object' || Array.isArray(result)) {
    return response;
  }

  const imagens = Object.entries(result as Record<string, unknown>)
    .filter(([, value]) => typeof value === 'string' && value)
    .sort(([left], [right]) => left.localeCompare(right, undefined, { numeric: true }))
    .map(([, value]) => value as string);

  const { resultado, ...rest } = response;

  return {
    ...rest,
    imagens
  };
}

function requireText(value: string | undefined | null, field: string): string {
  const text = typeof value === 'string' ? value.trim() : '';

  if (!text) {
    throw new InvalidParameterError(`O parâmetro '${field}' é obrigatório.`);
  }

  return text;
}

function requireUrl(value: string | undefined | null, field: string, platform?: TrustedPlatform): string {
  const text = requireText(value, field);
  return validateSafeUrl(text, { platform, fieldName: field });
}

async function execute(label: string, operation: () => Promise<unknown>): Promise<SdkResponse> {
  try {
    Logger.info(`Executando ${label} via devworldbr-sdk`, 'DevWorldBR');
    const response = await operation();
    return sanitizeResponse(response);
  } catch (error: any) {
    if (error instanceof InvalidParameterError) throw error;

    Logger.error(`Falha em ${label}: ${error.message}`, 'DevWorldBR');
    throw new DangerError(`Falha ao executar ${label}: Ocorreu uma falha no serviço.`, 502);
  }
}

class DevWorldBRService implements IDevWorldBRService {
  shazam(audioUrl: string | undefined | null): Promise<SdkResponse> {
    const url = requireUrl(audioUrl, 'audioUrl');
    return execute('shazam', () => dwbr.shazam(url));
  }

  gpt(query: string | undefined | null): Promise<SdkResponse> {
    const text = requireText(query, 'query');
    return execute('gpt', () => dwbr.chatgpt(text));
  }

  groq(query: string | undefined | null): Promise<SdkResponse> {
    const text = requireText(query, 'query');
    return execute('groq', () => dwbr.groq(text));
  }

  gemini(query: string | undefined | null): Promise<SdkResponse> {
    const text = requireText(query, 'query');
    return execute('gemini', () => dwbr.gemini(text));
  }

  ytSearch(query: string | undefined | null): Promise<SdkResponse> {
    const text = requireText(query, 'query');
    return execute('ytsearch', () => dwbr.ytSearch(text));
  }

  ytSearchV2(query: string | undefined | null): Promise<SdkResponse> {
    const text = requireText(query, 'query');
    return execute('ytsearch_v2', () => dwbr.ytSearch2(text));
  }

  youtubeMediaSource(url: string | undefined | null, type: 'audio' | 'video'): string {
    const link = requireUrl(url, 'url', 'youtube');
    return `${DEVWORLD_API_BASE}/downloads/youtube/${type}/v1?link=${encodeURIComponent(link)}`;
  }

  instagram(url: string | undefined | null): Promise<SdkResponse> {
    const link = requireUrl(url, 'url', 'instagram');
    return execute('instagram_download', () => dwbr.igdl(link));
  }

  async tiktokImages(url: string | undefined | null): Promise<SdkResponse> {
    const link = requireUrl(url, 'url', 'tiktok');
    try {
      const response = await execute('tiktok_images', () => dwbr.tiktok_images(link));
      return normalizeTikTokImages(response);
    } catch (err: any) {
      if (err instanceof InvalidParameterError) throw err;

      try {
        const apiUrl = `https://www.tikwm.com/api/?url=${encodeURIComponent(link)}`;
        const res = await fetch(apiUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
          signal: AbortSignal.timeout(25_000)
        });
        const json = (await res.json()) as any;
        if (json.code === 0 && json.data) {
          const imagens = Array.isArray(json.data.images) && json.data.images.length > 0
            ? json.data.images
            : json.data.cover ? [json.data.cover] : [];

          return {
            status: 200,
            titulo: json.data.title || '',
            autor: json.data.author?.nickname || '',
            imagens
          };
        }
      } catch {}

      throw err;
    }
  }

  pinterest(queryOrUrl: string | undefined | null): Promise<SdkResponse> {
    const value = requireText(queryOrUrl, 'query');
    if (/^https?:\/\//i.test(value)) {
      validateSafeUrl(value, { platform: 'pinterest', fieldName: 'url' });
    }
    return execute('pinterest', () => dwbr.pinterest(value));
  }

  facebook(url: string | undefined | null): Promise<SdkResponse> {
    const link = requireUrl(url, 'url', 'facebook');
    return execute('facebook', () => dwbr.facebookDl(link));
  }

  soundcloud(url: string | undefined | null): Promise<SdkResponse> {
    const link = requireUrl(url, 'url', 'soundcloud');
    return execute('soundcloud', () => dwbr.soundcloudDl(link));
  }
}

export { sanitizeResponse };
export const devWorldBRService = new DevWorldBRService();
