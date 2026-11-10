import { DangerError } from '@errors/index';
import { authMiddleware } from '@middlewares/authMiddleware';
import { TranscriptionService } from '@services/transcription.service';
import { readAudioUpload } from '@utils/audioUpload.util';
import { ValidatorUtil } from '@utils/validator.util';

export async function transcribeRoute(req: Request, url: URL): Promise<Response> {
  if (req.method !== 'POST') {
    throw new DangerError('Método não permitido. Use POST.', 405);
  }

  authMiddleware(req);

  const { languageInput, input } = await readAudioUpload(req, url);
  const dto = ValidatorUtil.validateTranscribePayload(languageInput);
  const result = await TranscriptionService.transcribe(input, dto.language);

  return Response.json(
    {
      success: true,
      message: 'Transcrição concluída com sucesso.',
      ...result
    },
    {
      headers: {
        'Cache-Control': 'no-store'
      }
    }
  );
}
