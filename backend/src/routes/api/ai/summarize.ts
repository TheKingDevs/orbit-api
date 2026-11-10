import { DangerError, InvalidParameterError } from '@errors/index';
import { authMiddleware } from '@middlewares/authMiddleware';
import { SummarizationService } from '@services/summarization.service';
import { ValidatorUtil } from '@utils/validator.util';
import { jsonResponse } from '@utils/request.util';

const MAX_BODY_BYTES = 512 * 1024;

export async function summarizeRoute(req: Request): Promise<Response> {
  if (req.method !== 'POST') throw new DangerError('Método não permitido. Use POST.', 405);
  authMiddleware(req);

  const contentLength = Number(req.headers.get('content-length') || 0);
  if (contentLength > MAX_BODY_BYTES) {
    throw new DangerError('Corpo da requisição muito grande. O limite é de 512 KB.', 413);
  }

  let body: Record<string, unknown>;
  try {
    const contentType = (req.headers.get('content-type') || '').toLowerCase();
    if (contentType.startsWith('application/json')) {
      body = await req.json();
    } else if (contentType.startsWith('multipart/form-data') || contentType.startsWith('application/x-www-form-urlencoded')) {
      const form = await req.formData();
      body = Object.fromEntries(form.entries());
    } else {
      throw new InvalidParameterError('Envie os parâmetros em JSON ou form-data.');
    }
  } catch (error) {
    if (error instanceof InvalidParameterError) throw error;
    throw new InvalidParameterError('Envie um corpo de requisição válido.');
  }

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new InvalidParameterError('O corpo da requisição deve ser um objeto.');
  }

  const dto = ValidatorUtil.validateSummarizePayload(body);
  const summary = await SummarizationService.summarize(dto.text, dto);

  return jsonResponse({
    success: true,
    message: 'Resumo gerado com sucesso.',
    summary,
    language: dto.language
  });
}
