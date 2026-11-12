const ALLOWED_METHODS = new Set(['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']);
const ALLOWED_HEADERS = new Set([
  'accept',
  'content-type',
  'range',
  'x-apikey',
  'x-api-key',
  'x-csrf-token'
]);

export function normalizeOrigin(value: string | null | undefined): string | null {
  if (!value) return null;

  try {
    const parsed = new URL(value.trim());
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    if (parsed.pathname !== '/' || parsed.search || parsed.hash || parsed.username || parsed.password) return null;
    return parsed.origin;
  } catch {
    return null;
  }
}

export function getConfiguredCorsOrigins(): Set<string> {
  const configuredOrigins = (process.env.CORS_ORIGIN || '').split(',');
  const applicationOrigins = [process.env.FRONTEND_URL, process.env.BACKEND_URL];

  return new Set(
    [...configuredOrigins, ...applicationOrigins]
      .map(origin => normalizeOrigin(origin))
      .filter((origin): origin is string => Boolean(origin))
  );
}

export function isCorsMethodAllowed(method: string): boolean {
  return ALLOWED_METHODS.has(method.toUpperCase());
}

export function isCorsHeaderAllowed(header: string): boolean {
  return ALLOWED_HEADERS.has(header.toLowerCase());
}
