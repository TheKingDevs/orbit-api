import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { mkdtempSync, readFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { InvalidParameterError } from '@errors/index';
import { ITranscriptionEngine } from '@interface/ITranscription';
import { transcribeRoute } from '@routes/api/transcribe';
import { publicWelcomeRoute } from '@routes/public/welcome';
import { TranscriptionService, TranscriptionServiceImpl } from '@services/transcription.service';
import { TranscribeLanguage, TranscriptionResult } from '@types/transcribe.type';
import { ValidatorUtil } from '@utils/validator.util';

class FakeEngine implements ITranscriptionEngine {
  calls = 0;
  samples = 0;
  sampleRate = 0;
  language: TranscribeLanguage = 'auto';

  async transcribe(samples: Float32Array, sampleRate: number, language: TranscribeLanguage) {
    this.calls += 1;
    this.samples = samples.length;
    this.sampleRate = sampleRate;
    this.language = language;

    return {
      text: 'transcrição de teste',
      language: language === 'auto' ? 'pt' : language
    };
  }
}

let directory = '';
let mp3: Buffer | undefined;
let mp4: Buffer | undefined;

async function createAudio(filename: string, codecArgs: string[]): Promise<Buffer> {
  const ffmpeg = Bun.which('ffmpeg');

  if (!ffmpeg) {
    throw new Error('ffmpeg indisponível.');
  }

  const output = join(directory, filename);
  const proc = Bun.spawn(
    [
      ffmpeg,
      '-y',
      '-hide_banner',
      '-loglevel', 'error',
      '-f', 'lavfi',
      '-i', 'sine=frequency=440:duration=1',
      '-ac', '1',
      '-ar', '16000',
      ...codecArgs,
      output
    ],
    {
      stdout: 'ignore',
      stderr: 'pipe'
    }
  );

  const stderr = await new Response(proc.stderr).text();
  const exitCode = await proc.exited;

  if (exitCode !== 0) {
    throw new Error(stderr || 'ffmpeg falhou ao gerar o áudio de teste.');
  }

  return readFileSync(output);
}

beforeAll(async () => {
  if (!Bun.which('ffmpeg')) return;

  directory = mkdtempSync(join(tmpdir(), 'orbit-transcribe-test-'));
  mp3 = await createAudio('sample.mp3', ['-c:a', 'libmp3lame', '-b:a', '64k']);
  mp4 = await createAudio('sample.mp4', ['-c:a', 'aac', '-b:a', '64k']);
});

afterAll(() => {
  if (directory) rmSync(directory, { recursive: true, force: true });
});

describe('Endpoint /api/transcribe', () => {
  test('Valida language, idioma, lang e rejeita idioma desconhecido', () => {
    expect(ValidatorUtil.validateTranscribePayload({ language: 'PT' }).language).toBe('pt');
    expect(ValidatorUtil.validateTranscribePayload({ idioma: 'en' }).language).toBe('en');
    expect(ValidatorUtil.validateTranscribePayload({ lang: 'auto' }).language).toBe('auto');
    expect(ValidatorUtil.validateTranscribePayload({}).language).toBe('auto');
    expect(() => ValidatorUtil.validateTranscribePayload({ language: 'es' })).toThrow(InvalidParameterError);
  });

  test('Converte MP3 para WAV 16kHz mono antes de transcrever', async () => {
    if (!mp3) {
      console.warn('ffmpeg indisponível; teste de MP3 ignorado.');
      return;
    }

    const engine = new FakeEngine();
    const service = new TranscriptionServiceImpl(engine);
    const result = await service.transcribe(
      { data: mp3, filename: 'sample.mp3', mimeType: 'audio/mpeg' },
      'pt'
    );

    expect(result.text).toBe('transcrição de teste');
    expect(result.language).toBe('pt');
    expect(result.requestedLanguage).toBe('pt');
    expect(result.duration).toBeGreaterThan(0.8);
    expect(result.duration).toBeLessThan(1.3);
    expect(engine.calls).toBe(1);
    expect(engine.sampleRate).toBe(16000);
    expect(engine.samples).toBeGreaterThan(15_000);
    expect(engine.language).toBe('pt');
  }, 30_000);

  test('Aceita MP4 e repassa language auto para o motor', async () => {
    if (!mp4) {
      console.warn('ffmpeg indisponível; teste de MP4 ignorado.');
      return;
    }

    const engine = new FakeEngine();
    const service = new TranscriptionServiceImpl(engine);
    const result = await service.transcribe(
      { data: mp4, filename: 'sample.mp4', mimeType: 'video/mp4' },
      'auto'
    );

    expect(result.language).toBe('pt');
    expect(result.requestedLanguage).toBe('auto');
    expect(result.duration).toBeGreaterThan(0.8);
    expect(result.duration).toBeLessThan(1.3);
    expect(engine.sampleRate).toBe(16000);
    expect(engine.language).toBe('auto');
  }, 30_000);

  test('Rejeita arquivo vazio e formato não suportado', async () => {
    const service = new TranscriptionServiceImpl(new FakeEngine());

    await expect(service.transcribe({ data: new Uint8Array() }, 'auto'))
      .rejects.toBeInstanceOf(InvalidParameterError);

    await expect(service.transcribe(
      { data: new Uint8Array([1, 2, 3]), filename: 'arquivo.txt', mimeType: 'text/plain' },
      'auto'
    )).rejects.toBeInstanceOf(InvalidParameterError);
  });

  test('POST multipart retorna JSON de transcrição', async () => {
    const original = TranscriptionService.transcribe;
    const mocked: TranscriptionResult = {
      text: 'olá mundo',
      language: 'en',
      requestedLanguage: 'en',
      duration: 1.25
    };

    TranscriptionService.transcribe = async () => mocked;

    try {
      const form = new FormData();
      form.set('file', new File([new Uint8Array([1, 2, 3])], 'audio.mp3', { type: 'audio/mpeg' }));
      form.set('language', 'en');

      const req = new Request('http://localhost/api/transcribe?token=public-token', {
        method: 'POST',
        body: form
      });
      const res = await transcribeRoute(req, new URL(req.url));
      const data = await res.json() as any;

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Transcrição concluída com sucesso.');
      expect(data.text).toBe('olá mundo');
      expect(data.language).toBe('en');
      expect(data.requestedLanguage).toBe('en');
      expect(data.duration).toBe(1.25);
    } finally {
      TranscriptionService.transcribe = original;
    }
  });

  test('POST com corpo bruto audio/mpeg também é aceito', async () => {
    const original = TranscriptionService.transcribe;
    const mocked: TranscriptionResult = {
      text: 'áudio bruto',
      language: 'pt',
      requestedLanguage: 'pt',
      duration: 0.5
    };

    TranscriptionService.transcribe = async () => mocked;

    try {
      const req = new Request('http://localhost/api/transcribe?token=public-token&language=pt', {
        method: 'POST',
        headers: {
          'content-type': 'audio/mpeg',
          'x-filename': 'audio.mp3'
        },
        body: new Uint8Array([1, 2, 3])
      });
      const res = await transcribeRoute(req, new URL(req.url));
      const data = await res.json() as any;

      expect(res.status).toBe(200);
      expect(data.text).toBe('áudio bruto');
      expect(data.requestedLanguage).toBe('pt');
    } finally {
      TranscriptionService.transcribe = original;
    }
  });

  test('POST multipart sem arquivo retorna erro de validação', async () => {
    const req = new Request('http://localhost/api/transcribe?token=public-token', {
      method: 'POST',
      body: new FormData()
    });

    await expect(transcribeRoute(req, new URL(req.url)))
      .rejects.toBeInstanceOf(InvalidParameterError);
  });

  test('Lista TTP, ATTP e transcribe no endpoint raiz', async () => {
    const res = await publicWelcomeRoute();
    const data = await res.json() as any;

    expect(data.endpoints.canvas_ttp).toContain('/api/canvas/ttp');
    expect(data.endpoints.canvas_attp).toContain('/api/canvas/attp');
    expect(data.endpoints.ttp_preview).toBe('/preview/ttp');
    expect(data.endpoints.transcribe).toContain('/api/transcribe');
  });
});
