import { isIP } from 'node:net';
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
