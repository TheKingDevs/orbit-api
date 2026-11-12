import { authMiddleware } from '@middlewares/authMiddleware';
import { DangerError, InvalidParameterError } from '@errors/index';
import { jsonResponse } from '@utils/request.util';
import { APP_VERSION } from '@utils/appVersion';

const HORDE_API = 'https://aihorde.net/api/v2';

export async function imageGenerationRoute(req: Request): Promise<Response> {
  if (req.method !== 'POST') throw new DangerError('Método não permitido. Use POST.', 405);
  authMiddleware(req);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    throw new InvalidParameterError('Envie um corpo JSON válido.');
  }

  if (typeof body.prompt !== 'string' || !body.prompt.trim()) {
    throw new InvalidParameterError('O campo "prompt" é obrigatório.');
  }

  const negativePrompt = typeof body.negative_prompt === 'string' ? body.negative_prompt.trim() : '';
  const payload: Record<string, unknown> = {
    prompt: negativePrompt ? `${body.prompt.trim()} ### ${negativePrompt}` : body.prompt.trim()
  };
  const params: Record<string, unknown> = {};
  if (body.params !== undefined) {
    if (!body.params || typeof body.params !== 'object' || Array.isArray(body.params)) {
      throw new InvalidParameterError('O campo "params" deve ser um objeto JSON.');
    }
    Object.assign(params, body.params);
  }
  for (const key of ['width', 'height', 'steps'] as const) {
    if (body[key] === undefined) continue;
    const value = typeof body[key] === 'number' ? body[key] : Number(body[key]);
    if (!Number.isSafeInteger(value) || value <= 0) {
      throw new InvalidParameterError(`O campo "${key}" deve ser um número inteiro positivo.`);
    }
    params[key] = value;
  }
  if (Object.keys(params).length) payload.params = params;
  if (body.r2 !== undefined) payload.r2 = body.r2;
  if (body.webhook !== undefined) payload.webhook = body.webhook;

  const response = await fetch(`${HORDE_API}/generate/async`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: process.env.AIHORDE_API_KEY || '0000000000',
      'Client-Agent': `Orbit-API:${APP_VERSION}:github.com/orbit-api`
    },
    body: JSON.stringify(payload)
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const message = typeof data?.message === 'string' ? data.message : 'Falha ao solicitar geração ao AI Horde.';
    throw new DangerError(message, response.status >= 500 ? 502 : response.status);
  }
  return jsonResponse(data, response.status);
}

export async function imageGenerationStatusRoute(req: Request, url: URL): Promise<Response> {
  if (req.method !== 'GET') throw new DangerError('Método não permitido. Use GET.', 405);
  authMiddleware(req, undefined, false);
  const id = url.searchParams.get('id')?.trim();
  if (!id || !/^[a-zA-Z0-9-]+$/.test(id)) throw new InvalidParameterError('Informe um id de geração válido.');

  const response = await fetch(`${HORDE_API}/generate/status/${encodeURIComponent(id)}`, {
    headers: {
      apikey: process.env.AIHORDE_API_KEY || '0000000000',
      'Client-Agent': `Orbit-API:${APP_VERSION}:github.com/orbit-api`
    }
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const message = typeof data?.message === 'string' ? data.message : 'Falha ao consultar o AI Horde.';
    throw new DangerError(message, response.status >= 500 ? 502 : response.status);
  }
  return jsonResponse(data);
}
