import { DangerError } from '@errors/index';
import { authMiddleware } from '@middlewares/authMiddleware';
import { TranscriptionService } from '@services/transcription.service';
import { SummarizationService } from '@services/summarization.service';
import { readAudioUpload } from '@routes/api/transcribe';
import { ValidatorUtil } from '@utils/validator.util';
import { jsonResponse } from '@utils/request.util';

export async function audioSummarizeRoute(req: Request, url: URL): Promise<Response> {
  if (req.method !== 'POST') throw new DangerError('Método não permitido. Use POST.', 405);
  authMiddleware(req);

  const { languageInput, input } = await readAudioUpload(req, url);
  const options = ValidatorUtil.validateAudioSummarizeOptions(languageInput);
  const transcription = await TranscriptionService.transcribe(input, options.language);

  if (!transcription.text.trim()) {
    throw new DangerError('A transcrição não reconheceu fala suficiente para gerar um resumo.', 422);
  }

  const summary = await SummarizationService.summarize(
    transcription.text,
    options,
    transcription.language
  );

  return jsonResponse({
    success: true,
    message: 'Áudio transcrito e resumido com sucesso.',
    text: transcription.text,
    language: transcription.language,
    requestedLanguage: transcription.requestedLanguage,
    duration: transcription.duration,
    summary
  });
}
