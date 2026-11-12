import { DangerError, InvalidParameterError } from '@errors/index';
import { authMiddleware } from '@middlewares/authMiddleware';
import { devWorldBRService } from '@services/devworldbr.service';
import { ShazamUploadService } from '@services/shazam-upload.service';
import { assertReadMethod, jsonResponse } from '@utils/request.util';
import { validateSafeUrl } from '@utils/urlSecurity.util';

const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;
const URL_FIELDS = ['audioUrl', 'audio_url', 'url', 'audio', 'link'];

function getAudioUrl(url: URL, body: Record<string, unknown>): string | undefined {
  for (const name of URL_FIELDS) {
    const queryValue = url.searchParams.get(name);
    const bodyValue = body[name];
    const value = typeof bodyValue === 'string' && bodyValue.trim()
      ? bodyValue.trim()
      : queryValue?.trim();
    if (value) return validateSafeUrl(value, { fieldName: 'audioUrl' });
  }
  return undefined;
}

export async function shazamRoute(req: Request, url: URL): Promise<Response> {
  assertReadMethod(req);
  authMiddleware(req);

  const contentType = (req.headers.get('content-type') || '').toLowerCase();
  if (req.method === 'POST' && contentType.startsWith('multipart/form-data')) {
    const contentLength = Number(req.headers.get('content-length') || 0);
    if (contentLength > MAX_UPLOAD_BYTES + 1024 * 1024) {
      throw new DangerError('Arquivo muito grande. O limite é de 50 MB.', 413);
    }

    let form: FormData;
    try {
      form = await req.formData();
    } catch {
      throw new InvalidParameterError('Não foi possível ler o formulário multipart.');
    }

    const file = form.get('file') ?? form.get('audio');
    if (!(file instanceof Blob)) {
      const body = Object.fromEntries(form.entries());
      const audioUrl = getAudioUrl(url, body);
      if (!audioUrl) throw new InvalidParameterError('Envie o áudio no campo "file" ou informe "audioUrl".');
      return jsonResponse(await devWorldBRService.shazam(audioUrl));
    }
    if (file.size === 0) throw new InvalidParameterError('O arquivo de áudio está vazio.');
    if (file.size > MAX_UPLOAD_BYTES) {
      throw new DangerError('Arquivo muito grande. O limite é de 50 MB.', 413);
    }

    const data = new Uint8Array(await file.arrayBuffer());
    return jsonResponse(await ShazamUploadService.recognize(data));
  }

  let body: Record<string, unknown> = {};
  if (req.method === 'POST' && contentType.startsWith('application/json')) {
    try {
      const parsed: unknown = await req.json();
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        body = parsed as Record<string, unknown>;
      }
    } catch {
      throw new InvalidParameterError('Envie um JSON válido.');
    }
  } else if (req.method === 'POST' && contentType.startsWith('application/x-www-form-urlencoded')) {
    try {
      body = Object.fromEntries(new URLSearchParams(await req.text()).entries());
    } catch {
      throw new InvalidParameterError('Envie parâmetros de formulário válidos.');
    }
  }

  const audioUrl = getAudioUrl(url, body);
  if (!audioUrl) throw new InvalidParameterError('Informe "audioUrl" ou envie um arquivo no campo "file".');
  return jsonResponse(await devWorldBRService.shazam(audioUrl));
}
