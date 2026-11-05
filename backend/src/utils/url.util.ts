const SCHEME_PATTERN = /^[a-z][a-z0-9+.-]*:\/\//i;
const LOCAL_HOST_PATTERN = /^(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?(?:\/|$)/i;

export function normalizeBaseUrl(value: string | null | undefined): string | null {
  if (!value) return null;

  const trimmed = value.trim().replace(/\/+$/, '');
  if (!trimmed) return null;

  if (SCHEME_PATTERN.test(trimmed)) return trimmed;

  const protocol = LOCAL_HOST_PATTERN.test(trimmed) ? 'http' : 'https';
  return `${protocol}://${trimmed}`;
}
