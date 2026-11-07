import dwbr from 'devworldbr-sdk';
import { DangerError, InvalidParameterError } from '@errors/index';
import { IDevWorldBRService } from '@interface/IDevWorldBR';
import { Logger } from '@utils/logger';
import { SdkResponse } from '@types/devworldbr.type';

const PROMO_KEYS = ['criador', 'whatsapp'] as const;

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

function requireUrl(value: string | undefined | null, field: string): string {
  const text = requireText(value, field);

  try {
    const parsed = new URL(text);

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new Error('unsupported protocol');
    }
  } catch {
    throw new InvalidParameterError(`O parâmetro '${field}' deve ser uma URL válida.`);
  }

  return text;
}

async function execute(label: string, operation: () => Promise<unknown>): Promise<SdkResponse> {
  try {
    Logger.info(`Executando ${label} via devworldbr-sdk`, 'DevWorldBR');
    const response = await operation();
    return sanitizeResponse(response);
  } catch (error: any) {
    if (error instanceof InvalidParameterError) throw error;

    Logger.error(`Falha em ${label}: ${error.message}`, 'DevWorldBR');
    throw new DangerError(`Falha ao executar ${label}: ${error.message}`, 502);
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

  async tiktokImages(url: string | undefined | null): Promise<SdkResponse> {
    const link = requireUrl(url, 'url');
    const response = await execute('tiktok_images', () => dwbr.tiktok_images(link));
    return normalizeTikTokImages(response);
  }

  kwai(url: string | undefined | null): Promise<SdkResponse> {
    const link = requireUrl(url, 'url');
    return execute('kwai', () => dwbr.kwaiDl(link));
  }

  pinterest(queryOrUrl: string | undefined | null): Promise<SdkResponse> {
    const value = requireText(queryOrUrl, 'query');
    return execute('pinterest', () => dwbr.pinterest(value));
  }

  facebook(url: string | undefined | null): Promise<SdkResponse> {
    const link = requireUrl(url, 'url');
    return execute('facebook', () => dwbr.facebookDl(link));
  }

  soundcloud(url: string | undefined | null): Promise<SdkResponse> {
    const link = requireUrl(url, 'url');
    return execute('soundcloud', () => dwbr.soundcloudDl(link));
  }
}

export { sanitizeResponse };
export const devWorldBRService = new DevWorldBRService();
