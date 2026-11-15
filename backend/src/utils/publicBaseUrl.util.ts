import { normalizeBaseUrl } from '@utils/url.util';

function toOrigin(value: string | null | undefined): string | null {
  const normalized = normalizeBaseUrl(value);

  if (!normalized) return null;

  try {
    const parsed = new URL(normalized);

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;

    return parsed.origin;
  } catch {
    return null;
  }
}

/**
 * Resolve a origem pública usada em links de storage.
 *
 * Em produção o backend normalmente roda atrás de um proxy (Vercel/Render), então
 * `url.origin` aponta para o host interno. A ordem prioriza configuração explícita
 * e, depois, headers encaminhados pelo proxy.
 */
export function resolvePublicBaseUrl(req: Request | undefined, url: URL): string {
  const configured =
    toOrigin(process.env.PUBLIC_BASE_URL) ??
    toOrigin(process.env.FRONTEND_URL);
  if (configured) return configured;

  if (req) {
    const frontendOrigin = toOrigin(req.headers.get('x-public-base-url'));
    if (frontendOrigin) return frontendOrigin;

    const forwardedHost = req.headers.get('x-forwarded-host')?.split(',')[0]?.trim();
    if (forwardedHost) {
      const forwardedProto = req.headers.get('x-forwarded-proto')?.split(',')[0]?.trim() || 'https';
      const forwardedOrigin = toOrigin(`${forwardedProto}://${forwardedHost}`);
      if (forwardedOrigin) return forwardedOrigin;
    }
  }

  return toOrigin(url.origin) ?? url.origin;
}
