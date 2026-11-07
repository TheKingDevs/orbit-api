import { InvalidParameterError, DangerError } from '@errors/index';

const SAFE_METHODS = new Set(['GET', 'POST']);

export function assertReadMethod(req: Request): void {
  if (!SAFE_METHODS.has(req.method.toUpperCase())) {
    throw new DangerError('Método não permitido. Use GET ou POST.', 405);
  }
}

export async function readRequestParam(
  req: Request,
  url: URL,
  names: string[]
): Promise<string | undefined> {
  for (const name of names) {
    const value = url.searchParams.get(name);

    if (value && value.trim()) {
      return value.trim();
    }
  }

  if (req.method.toUpperCase() !== 'POST') {
    return undefined;
  }

  const contentType = (req.headers.get('content-type') || '').toLowerCase();

  try {
    if (contentType.startsWith('application/json')) {
      const body: any = await req.json();

      for (const name of names) {
        if (typeof body?.[name] === 'string' && body[name].trim()) {
          return body[name].trim();
        }
      }

      return undefined;
    }

    if (contentType.startsWith('application/x-www-form-urlencoded') || contentType.startsWith('multipart/form-data')) {
      const form = await req.formData();

      for (const name of names) {
        const value = form.get(name);

        if (typeof value === 'string' && value.trim()) {
          return value.trim();
        }
      }
    }
  } catch (error: any) {
    if (error instanceof InvalidParameterError) throw error;
    throw new InvalidParameterError('Não foi possível ler os parâmetros enviados no corpo da requisição.');
  }

  return undefined;
}

export function jsonResponse(data: unknown, status: number = 200): Response {
  return Response.json(data, {
    status,
    headers: {
      'Cache-Control': 'no-store'
    }
  });
}
