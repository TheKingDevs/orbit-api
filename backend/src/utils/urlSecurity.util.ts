import { isIP } from 'node:net';
import type { LookupAddress } from 'node:dns';
import { lookup } from 'node:dns/promises';
import { request as httpRequest } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { Readable } from 'node:stream';
import { InvalidParameterError } from '@errors/index';

export type TrustedPlatform =
  | 'youtube'
  | 'tiktok'
  | 'instagram'
  | 'facebook'
  | 'soundcloud'
  | 'pinterest'
  | 'spotify'
  | 'threads'
  | 'google-drive'
  | 'capcut'
  | 'twitter';

export interface PlatformRule {
  name: string;
  regex: RegExp;
  example: string;
}

export const PLATFORM_RULES: Record<TrustedPlatform, PlatformRule> = {
  youtube: {
    name: 'YouTube',
    regex: /^(?:[a-zA-Z0-9-]+\.)*(?:youtube\.com|youtu\.be)$/i,
    example: 'https://www.youtube.com/watch?v=... ou https://youtu.be/...'
  },
  tiktok: {
    name: 'TikTok',
    regex: /^(?:[a-zA-Z0-9-]+\.)*(?:tiktok\.com|douyin\.com)$/i,
    example: 'https://www.tiktok.com/... ou https://vm.tiktok.com/...'
  },
  instagram: {
    name: 'Instagram',
    regex: /^(?:[a-zA-Z0-9-]+\.)*(?:instagram\.com|instagr\.am)$/i,
    example: 'https://www.instagram.com/reel/... ou https://www.instagram.com/p/...'
  },
  facebook: {
    name: 'Facebook',
    regex: /^(?:[a-zA-Z0-9-]+\.)*(?:facebook\.com|fb\.watch|fb\.com)$/i,
    example: 'https://www.facebook.com/watch/?v=... ou https://fb.watch/...'
  },
  soundcloud: {
    name: 'SoundCloud',
    regex: /^(?:[a-zA-Z0-9-]+\.)*soundcloud\.com$/i,
    example: 'https://soundcloud.com/usuario/faixa'
  },
  pinterest: {
    name: 'Pinterest',
    regex: /^(?:[a-zA-Z0-9-]+\.)*(?:pinterest\.[a-z.]{2,6}|pin\.it)$/i,
    example: 'https://br.pinterest.com/pin/... ou https://pin.it/...'
  },
  spotify: {
    name: 'Spotify',
    regex: /^(?:(?:www|open)\.)?spotify\.com$|^(?:www\.)?spotify\.link$/i,
    example: 'https://open.spotify.com/track/...'
  },
  threads: {
    name: 'Threads',
    regex: /^(?:[a-zA-Z0-9-]+\.)*threads\.(?:com|net)$/i,
    example: 'https://www.threads.com/@usuario/post/...'
  },
  'google-drive': {
    name: 'Google Drive',
    regex: /^drive\.google\.com$/i,
    example: 'https://drive.google.com/file/d/.../view'
  },
  capcut: {
    name: 'CapCut',
    regex: /^(?:[a-zA-Z0-9-]+\.)*capcut\.com$/i,
    example: 'https://www.capcut.com/template-detail/...'
  },
  twitter: {
    name: 'Twitter/X',
    regex: /^(?:[a-zA-Z0-9-]+\.)*(?:twitter\.com|x\.com)$/i,
    example: 'https://x.com/usuario/status/...'
  }
};

const BLOCKED_HOST_SUFFIXES = [
  '.localhost',
  '.local',
  '.internal',
  '.lan',
  '.home',
  '.corp',
  '.test',
  '.invalid',
  '.example'
];

const BLOCKED_HOST_EXACT = new Set([
  'localhost',
  'metadata.google.internal',
  'instance-data'
]);

export interface ValidateUrlOptions {
  platform?: TrustedPlatform;
  fieldName?: string;
  requireHttps?: boolean;
}

export interface SafeFetchOptions extends ValidateUrlOptions {
  maxRedirects?: number;
}

function isPublicIPv4(address: string): boolean {
  const parts = address.split('.').map(Number);
  if (parts.length !== 4 || parts.some(part => !Number.isInteger(part) || part < 0 || part > 255)) return false;
  const value = parts.reduce((total, part) => (total << 8) | part, 0) >>> 0;
  const blocked: Array<[number, number]> = [
    [0x00000000, 8], [0x0a000000, 8], [0x64400000, 10], [0x7f000000, 8],
    [0xa9fe0000, 16], [0xac100000, 12], [0xc0000000, 24], [0xc0000200, 24],
    [0xc0586300, 24], [0xc0a80000, 16], [0xc6120000, 15], [0xc6336400, 24],
    [0xcb007100, 24], [0xe0000000, 4], [0xf0000000, 4]
  ];
  return !blocked.some(([network, bits]) => (value >>> (32 - bits)) === (network >>> (32 - bits)));
}

function ipv6ToBigInt(address: string): bigint | undefined {
  const normalized = address.toLowerCase().split('%')[0];
  const halves = normalized.split('::');
  if (halves.length > 2) return undefined;
  const parseHalf = (half: string): number[] => half ? half.split(':').map(part => parseInt(part, 16)) : [];
  let groups = [...parseHalf(halves[0]), ...(halves.length === 2 ? Array(8 - parseHalf(halves[0]).length - parseHalf(halves[1]).length).fill(0) : []), ...(halves.length === 2 ? parseHalf(halves[1]) : [])];
  if (groups.length !== 8 || groups.some(group => !Number.isInteger(group) || group < 0 || group > 0xffff)) return undefined;
  return groups.reduce((value, group) => (value << 16n) | BigInt(group), 0n);
}

export function isPublicIp(address: string): boolean {
  const family = isIP(address);
  if (family === 4) return isPublicIPv4(address);
  if (family !== 6) return false;

  const value = ipv6ToBigInt(address);
  if (value === undefined) return false;
  const inRange = (network: bigint, bits: number) => (value >> BigInt(128 - bits)) === (network >> BigInt(128 - bits));
  const globalUnicast = inRange(0x20000000000000000000000000000000n, 3);
  const special = [
    [0x20010000000000000000000000000000n, 23], // IETF protocol assignments
    [0x20010db8000000000000000000000000n, 32], // documentation
    [0x20020000000000000000000000000000n, 16], // 6to4 embeds IPv4
    [0x3fff0000000000000000000000000000n, 20] // documentation
  ] as const;
  return globalUnicast && !special.some(([network, bits]) => inRange(network, bits));
}

function requestPinned(url: URL, init: RequestInit, addresses: LookupAddress[]): Promise<Response> {
  return new Promise((resolve, reject) => {
    const requestFn = url.protocol === 'https:' ? httpsRequest : httpRequest;
    const headers = new Headers(init.headers);
    headers.delete('host');
    headers.delete('connection');
    headers.delete('transfer-encoding');
    if (!headers.has('accept-encoding')) headers.set('accept-encoding', 'identity');

    const pinnedLookup = (_hostname: string, options: { all?: boolean }, callback: (...args: any[]) => void) => {
      if (options?.all) callback(null, addresses);
      else callback(null, addresses[0].address, addresses[0].family);
    };
    const request = requestFn(url, {
      method: init.method,
      headers: Object.fromEntries(headers.entries()),
      lookup: pinnedLookup as never,
      signal: init.signal ?? undefined
    }, upstream => {
      const responseHeaders = new Headers();
      for (let index = 0; index < upstream.rawHeaders.length; index += 2) {
        const name = upstream.rawHeaders[index];
        if (!['connection', 'keep-alive', 'proxy-authenticate', 'proxy-authorization', 'te', 'trailer', 'transfer-encoding', 'upgrade'].includes(name.toLowerCase())) {
          responseHeaders.append(name, upstream.rawHeaders[index + 1]);
        }
      }
      const noBody = init.method === 'HEAD' || [204, 205, 304].includes(upstream.statusCode ?? 0);
      const body = noBody ? null : Readable.toWeb(upstream) as unknown as ReadableStream<Uint8Array>;
      resolve(new Response(body, {
        status: upstream.statusCode ?? 502,
        statusText: upstream.statusMessage,
        headers: responseHeaders
      }));
    });
    request.once('error', reject);
    request.end();
  });
}

async function fetchPinnedPublicUrl(rawUrl: string, init: RequestInit): Promise<Response> {
  const url = new URL(rawUrl);
  if (url.username || url.password) throw new InvalidParameterError('Credenciais embutidas em URL não são permitidas.');

  let addresses: LookupAddress[];
  try {
    const resolved = await lookup(url.hostname, { all: true, verbatim: true });
    addresses = Array.isArray(resolved) ? resolved : [resolved];
  } catch {
    throw new InvalidParameterError('Não foi possível resolver o domínio da URL remota.');
  }
  if (addresses.length === 0 || addresses.some(entry => !isPublicIp(entry.address))) {
    throw new InvalidParameterError('A URL remota resolve para um endereço IP não público.');
  }

  return requestPinned(url, init, addresses);
}

/**
 * Valida se uma URL é segura para ser acessada pelo backend:
 * 1. Exige protocolo HTTP ou HTTPS (rejeita file://, gopher://, data://, etc.)
 * 2. Bloqueia SSRF contra localhost, 127.0.0.1, redes locais e IPs privados
 * 3. Bloqueia acessos diretos por endereço IP (apenas domínios públicos são aceitos)
 * 4. Bloqueia nomes internos de contêineres/hosts (exige TLD válido com ponto)
 * 5. Se informado 'platform', restringe o hostname exclusivamente aos domínios confiáveis daquela plataforma.
 */
export function validateSafeUrl(
  rawUrl: string | null | undefined,
  options: ValidateUrlOptions = {}
): string {
  const field = options.fieldName || 'url';

  if (!rawUrl || typeof rawUrl !== 'string') {
    throw new InvalidParameterError(`O parâmetro '${field}' é obrigatório.`);
  }

  const trimmed = rawUrl.trim();
  if (!trimmed) {
    throw new InvalidParameterError(`O parâmetro '${field}' não pode ficar vazio.`);
  }

  // Extrai URL limpa caso venha acompanhada de texto extra (ex: links compartilhados de apps)
  const match = trimmed.match(/https?:\/\/[^\s]+/i);
  const candidate = match ? match[0] : trimmed;

  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    throw new InvalidParameterError(`O parâmetro '${field}' deve ser uma URL válida com http ou https.`);
  }

  const protocol = parsed.protocol.toLowerCase();
  if (protocol !== 'http:' && protocol !== 'https:') {
    throw new InvalidParameterError(`Protocolo inválido em '${field}'. Apenas HTTP e HTTPS são permitidos.`);
  }

  if (options.requireHttps && protocol !== 'https:') {
    throw new InvalidParameterError(`O parâmetro '${field}' deve utilizar HTTPS seguro.`);
  }

  if (parsed.username || parsed.password) {
    throw new InvalidParameterError(`Credenciais embutidas em URL não são permitidas em '${field}'.`);
  }

  const rawHost = parsed.hostname;
  const host = rawHost.replace(/^\[|\]$/g, '').toLowerCase().replace(/\.+$/, '');

  if (!host) {
    throw new InvalidParameterError(`URL inválida no parâmetro '${field}': hostname ausente.`);
  }

  // 1. Bloqueia localhost e domínios de rede interna / privada
  if (BLOCKED_HOST_EXACT.has(host) || BLOCKED_HOST_SUFFIXES.some(suffix => host.endsWith(suffix))) {
    throw new InvalidParameterError(
      `Acesso não permitido: endereços locais ou internos (localhost, .local, .internal) são estritamente proibidos.`
    );
  }

  // 2. Bloqueia qualquer endereço IP literal (IPv4 ou IPv6 ou representações decimais/hex)
  if (isIP(host) !== 0) {
    throw new InvalidParameterError(
      `Acesso direto por endereço IP não é permitido (ex: http://${rawHost}). Utilize apenas domínios públicos confiáveis.`
    );
  }

  // 3. Exige pelo menos um ponto (domínio + TLD) para impedir nomes de contêineres/serviços internos
  if (!host.includes('.')) {
    throw new InvalidParameterError(
      `Domínio inválido em '${field}'. Nomes de rede interna ou serviços sem extensão pública não são permitidos.`
    );
  }

  // 4. Se uma plataforma específica for requisitada, valida contra os domínios confiáveis permitidos
  if (options.platform) {
    const rule = PLATFORM_RULES[options.platform];
    if (rule && !rule.regex.test(host)) {
      throw new InvalidParameterError(
        `URL não permitida para ${rule.name}. Utilize uma fonte confiável compatível (exemplo: ${rule.example}).`
      );
    }
  }

  return parsed.toString();
}

export function isSafeUrl(rawUrl: string | null | undefined, options: ValidateUrlOptions = {}): boolean {
  try {
    validateSafeUrl(rawUrl, options);
    return true;
  } catch {
    return false;
  }
}

/** Fetches user-influenced URLs without allowing automatic redirects to bypass URL validation. */
export async function fetchSafeUrl(
  rawUrl: string,
  init: RequestInit = {},
  options: SafeFetchOptions = {}
): Promise<Response> {
  const method = (init.method ?? 'GET').toUpperCase();
  if (method !== 'GET' && method !== 'HEAD') {
    throw new InvalidParameterError('A busca segura aceita somente GET ou HEAD.');
  }

  const { maxRedirects = 5, ...validateOptions } = options;
  let currentUrl = validateSafeUrl(rawUrl, validateOptions);

  for (let redirects = 0; ; redirects++) {
    const response = await fetchPinnedPublicUrl(currentUrl, { ...init, method });
    const isRedirect = [301, 302, 303, 307, 308].includes(response.status);
    const location = isRedirect ? response.headers.get('location') : null;
    if (!location) return response;

    await response.body?.cancel();
    if (redirects >= maxRedirects) {
      throw new InvalidParameterError('A URL excedeu o limite de redirecionamentos permitidos.');
    }

    const nextUrl = new URL(location, currentUrl).toString();
    const validatedNextUrl = validateSafeUrl(nextUrl, validateOptions);
    const previousOrigin = new URL(currentUrl).origin;
    const nextOrigin = new URL(validatedNextUrl).origin;
    if (previousOrigin !== nextOrigin) {
      const headers = new Headers(init.headers);
      headers.delete('authorization');
      headers.delete('cookie');
      headers.delete('proxy-authorization');
      init = { ...init, headers };
    }
    currentUrl = validatedNextUrl;
  }
}
