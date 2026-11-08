import {
  getConfiguredCorsOrigins,
  isCorsHeaderAllowed,
  isCorsMethodAllowed,
  normalizeOrigin
} from '@utils/cors.util';

const ALLOWED_METHODS = 'GET, HEAD, POST, PUT, PATCH, DELETE, OPTIONS';
const ALLOWED_HEADERS = 'Accept, Content-Type, Range, X-Apikey, X-Api-Key, X-CSRF-Token';
const EXPOSED_HEADERS = 'Accept-Ranges, Content-Disposition, Content-Length, Content-Range';

function isAllowedOrigin(origin: string | null): origin is string {
  const normalized = normalizeOrigin(origin);
  return Boolean(normalized && getConfiguredCorsOrigins().has(normalized));
}

function corsHeaders(origin: string): Headers {
  const headers = new Headers({
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Expose-Headers': EXPOSED_HEADERS,
    'Vary': 'Origin'
  });
  return headers;
}

export function handleCorsRequest(req: Request): Response | null {
  const origin = req.headers.get('origin');

  if (req.method.toUpperCase() !== 'OPTIONS') {
    if (origin && !isAllowedOrigin(origin)) {
      return Response.json(
        { success: false, message: 'Origem não permitida.' },
        { status: 403, headers: { Vary: 'Origin' } }
      );
    }
    return null;
  }

  if (!origin || !isAllowedOrigin(origin)) {
    return Response.json(
      { success: false, message: 'Origem não permitida.' },
      { status: 403, headers: { Vary: 'Origin' } }
    );
  }

  const requestedMethod = req.headers.get('access-control-request-method') || '';
  if (!isCorsMethodAllowed(requestedMethod)) {
    return Response.json(
      { success: false, message: 'Método CORS não permitido.' },
      { status: 403, headers: { Vary: 'Origin' } }
    );
  }

  const requestedHeaders = (req.headers.get('access-control-request-headers') || '')
    .split(',')
    .map(header => header.trim())
    .filter(Boolean);
  if (requestedHeaders.some(header => !isCorsHeaderAllowed(header))) {
    return Response.json(
      { success: false, message: 'Header CORS não permitido.' },
      { status: 403, headers: { Vary: 'Origin' } }
    );
  }

  const headers = corsHeaders(normalizeOrigin(origin)!);
  headers.set('Access-Control-Allow-Methods', ALLOWED_METHODS);
  headers.set('Access-Control-Allow-Headers', ALLOWED_HEADERS);
  headers.set('Access-Control-Max-Age', '600');
  return new Response(null, { status: 204, headers });
}

export function applyCorsHeaders(req: Request, response: Response): Response {
  const origin = req.headers.get('origin');
  if (!origin || !isAllowedOrigin(origin)) return response;

  const headers = new Headers(response.headers);
  corsHeaders(normalizeOrigin(origin)!).forEach((value, name) => {
    if (name.toLowerCase() === 'vary') return;
    headers.set(name, value);
  });
  const vary = headers.get('Vary');
  const varyValues = vary?.split(',').map(value => value.trim().toLowerCase()) ?? [];
  if (!varyValues.includes('origin')) headers.set('Vary', vary ? `${vary}, Origin` : 'Origin');

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}
