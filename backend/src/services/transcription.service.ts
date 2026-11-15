import { existsSync, mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from 'fs';
import { extname, join, resolve } from 'path';
import { DangerError, InvalidParameterError } from '@errors/index';
import { ITranscriptionEngine, ITranscriptionService, TranscriptionInput } from '@interface/ITranscription';
import { TranscribeLanguage, TranscriptionResult } from '@apptypes/transcribe.type';
import { Logger } from '@utils/logger';
import { getTempDir } from '@utils/temp.util';
import { transcriptionTimeoutMs, transcriptionProcessTimeoutMs } from '@utils/timeout.util';

const MAX_DURATION_SECONDS = 10 * 60;
const MAX_ACTIVE_TRANSCRIPTIONS = 2;
let activeTranscriptions = 0;
const MODEL_BASE_URL = 'https://huggingface.co/csukuangfj/sherpa-onnx-whisper-tiny/resolve/main';
const MODEL_FILES = [
  'tiny-encoder.int8.onnx',
  'tiny-decoder.int8.onnx',
  'tiny-tokens.txt'
];

const ALLOWED_EXTENSIONS = new Set([
  'mp3', 'mp4', 'm4a', 'wav', 'ogg', 'oga', 'opus', 'webm', 'mov', 'aac', 'flac', 'bin'
]);

const EXTENSION_BY_MIME: Record<string, string> = {
  'audio/mpeg': 'mp3',
  'audio/mp3': 'mp3',
  'audio/mp4': 'm4a',
  'audio/x-m4a': 'm4a',
  'video/mp4': 'mp4',
  'audio/wav': 'wav',
  'audio/x-wav': 'wav',
  'audio/ogg': 'ogg',
  'audio/opus': 'opus',
  'audio/webm': 'webm',
  'video/webm': 'webm',
  'video/quicktime': 'mov',
  'audio/aac': 'aac',
  'audio/flac': 'flac',
  'audio/x-flac': 'flac',
  'application/octet-stream': 'bin'
};

interface WavData {
  samples: Float32Array;
  sampleRate: number;
}

class TranscriptionServiceImpl implements ITranscriptionService {
  constructor(private readonly engine: ITranscriptionEngine = new SherpaWhisperEngine()) {}

  async transcribe(input: TranscriptionInput, language: TranscribeLanguage): Promise<TranscriptionResult> {
    if (activeTranscriptions >= MAX_ACTIVE_TRANSCRIPTIONS) {
      throw new DangerError('O serviço de transcrição está ocupado. Tente novamente em instantes.', 503);
    }

    activeTranscriptions += 1;
    const operation = this.transcribeInternal(input, language);
    const releaseSlot = () => {
      activeTranscriptions = Math.max(0, activeTranscriptions - 1);
    };
    void operation.then(releaseSlot, releaseSlot);

    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    const timeoutError = new DangerError('A transcrição excedeu o tempo limite.', 504);
    try {
      return await Promise.race([
        operation,
        new Promise<never>((_, reject) => {
          timeoutId = setTimeout(() => reject(timeoutError), transcriptionTimeoutMs());
        })
      ]);
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }
  }

  private async transcribeInternal(input: TranscriptionInput, language: TranscribeLanguage): Promise<TranscriptionResult> {
    const data = input.data instanceof Uint8Array
      ? input.data
      : new Uint8Array(input.data);

    if (data.byteLength === 0) {
      throw new InvalidParameterError('O arquivo de áudio/vídeo está vazio.');
    }

    const extension = this.resolveExtension(input.filename, input.mimeType);

    if (!extension) {
      throw new InvalidParameterError(
        'Formato não suportado. Envie um arquivo MP3 ou MP4.',
        [{ field: 'file', message: 'Extensão ou Content-Type não reconhecido.' }]
      );
    }

    const ffmpeg = Bun.which('ffmpeg');

    if (!ffmpeg) {
      throw new DangerError('ffmpeg não encontrado. Instale o ffmpeg para transcrever áudio.');
    }

    const ffprobe = Bun.which('ffprobe');
    const directory = mkdtempSync(join(getTempDir(), 'orbit-transcribe-'));
    const inputPath = join(directory, `input.${extension}`);
    const wavPath = join(directory, 'audio.wav');

    try {
      writeFileSync(inputPath, data);

      if (ffprobe) {
        await this.assertDuration(ffprobe, inputPath);
      }

      await this.convertToWav(ffmpeg, inputPath, wavPath);

      const wav = this.readWav(readFileSync(wavPath));

      if (wav.samples.length === 0) {
        throw new InvalidParameterError('O arquivo enviado não contém áudio.');
      }

      const result = await this.engine.transcribe(wav.samples, wav.sampleRate, language);

      return {
        text: result.text.trim(),
        language: result.language || (language === 'auto' ? 'unknown' : language),
        requestedLanguage: language,
        duration: Number((wav.samples.length / wav.sampleRate).toFixed(2))
      };
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  }

  private resolveExtension(filename?: string, mimeType?: string): string | undefined {
    const extension = filename ? extname(filename).slice(1).toLowerCase() : '';

    if (ALLOWED_EXTENSIONS.has(extension)) return extension;

    const mime = (mimeType || '').split(';')[0].trim().toLowerCase();
    const mimeExtension = EXTENSION_BY_MIME[mime];

    if (mimeExtension) return mimeExtension;

    if (mime.startsWith('audio/') || mime.startsWith('video/')) return 'bin';

    return undefined;
  }

  private async assertDuration(ffprobe: string, inputPath: string): Promise<void> {
    const proc = Bun.spawn(
      [
        ffprobe,
        '-v', 'error',
        '-show_entries', 'format=duration',
        '-of', 'default=noprint_wrappers=1:nokey=1',
        inputPath
      ],
      {
        stdout: 'pipe',
        stderr: 'ignore'
      }
    );

    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      proc.kill();
    }, transcriptionProcessTimeoutMs());
    timeout.unref?.();

    const output = await new Response(proc.stdout).text();
    const exitCode = await proc.exited;
    clearTimeout(timeout);

    if (timedOut) throw new DangerError('A análise do áudio excedeu o tempo limite.', 504);

    if (exitCode !== 0) return;

    const duration = Number.parseFloat(output.trim());

    if (Number.isFinite(duration) && duration > MAX_DURATION_SECONDS) {
      throw new InvalidParameterError(
        `Áudio muito longo. O limite é de ${MAX_DURATION_SECONDS / 60} minutos.`,
        [{ field: 'file', message: `Duração detectada: ${Math.ceil(duration)} segundos.` }]
      );
    }
  }

  private async convertToWav(ffmpeg: string, inputPath: string, outputPath: string): Promise<void> {
    const proc = Bun.spawn(
      [
        ffmpeg,
        '-y',
        '-nostdin',
        '-hide_banner',
        '-loglevel', 'error',
        '-i', inputPath,
        '-vn',
        '-acodec', 'pcm_s16le',
        '-ac', '1',
        '-ar', '16000',
        '-t', String(MAX_DURATION_SECONDS),
        outputPath
      ],
      {
        stdout: 'ignore',
        stderr: 'pipe'
      }
    );

    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      proc.kill();
    }, transcriptionProcessTimeoutMs());
    timeout.unref?.();

    const stderr = await new Response(proc.stderr).text();
    const exitCode = await proc.exited;
    clearTimeout(timeout);

    if (timedOut) throw new DangerError('A conversão do áudio excedeu o tempo limite.', 504);

    if (exitCode !== 0) {
      throw new InvalidParameterError(
        'Não foi possível processar o arquivo de áudio/vídeo.',
        [{ field: 'file', message: stderr.trim().split('\n').pop()?.slice(0, 300) || 'ffmpeg falhou.' }]
      );
    }
  }

  private readWav(buffer: Buffer): WavData {
    if (buffer.toString('ascii', 0, 4) !== 'RIFF' || buffer.toString('ascii', 8, 12) !== 'WAVE') {
      throw new InvalidParameterError('O áudio convertido não está em um formato WAV válido.');
    }

    let offset = 12;
    let audioFormat = 0;
    let channels = 0;
    let sampleRate = 0;
    let bitsPerSample = 0;
    let dataOffset = -1;
    let dataSize = 0;

    while (offset + 8 <= buffer.length) {
      const id = buffer.toString('ascii', offset, offset + 4);
      const size = buffer.readUInt32LE(offset + 4);
      const body = offset + 8;

      if (id === 'fmt ') {
        audioFormat = buffer.readUInt16LE(body);
        channels = buffer.readUInt16LE(body + 2);
        sampleRate = buffer.readUInt32LE(body + 4);
        bitsPerSample = buffer.readUInt16LE(body + 14);
      } else if (id === 'data') {
        dataOffset = body;
        dataSize = Math.min(size, buffer.length - body);
        break;
      }

      offset = body + size + (size % 2);
    }

    if (audioFormat !== 1 || channels < 1 || bitsPerSample !== 16 || dataOffset < 0 || sampleRate < 1) {
      throw new InvalidParameterError('O áudio convertido não está em PCM 16-bit válido.');
    }

    if (dataSize % 2 !== 0) dataSize -= 1;

    const sampleCount = Math.floor(dataSize / (2 * channels));
    const samples = new Float32Array(sampleCount);
    const view = new DataView(buffer.buffer, buffer.byteOffset + dataOffset, dataSize);

    for (let index = 0; index < sampleCount; index += 1) {
      samples[index] = view.getInt16(index * channels * 2, true) / 32768;
    }

    return { samples, sampleRate };
  }
}

class SherpaWhisperEngine implements ITranscriptionEngine {
  private recognizerPromise?: Promise<any>;
  private modelReady?: Promise<string>;
  private currentLanguage?: string;
  private queue: Promise<void> = Promise.resolve();

  async transcribe(
    samples: Float32Array,
    sampleRate: number,
    language: TranscribeLanguage
  ): Promise<{ text: string; language: string }> {
    return this.enqueue(async () => {
      const recognizer = await this.getRecognizer();
      const desiredLanguage = language === 'auto' ? '' : language;

      if (this.currentLanguage !== desiredLanguage) {
        const modelDirectory = await this.ensureModel();
        recognizer.setConfig(this.buildConfig(modelDirectory, desiredLanguage));
        this.currentLanguage = desiredLanguage;
      }

      const stream = recognizer.createStream();
      stream.acceptWaveform({ samples, sampleRate });
      const result = await recognizer.decodeAsync(stream);
      const detectedLanguage = typeof result?.lang === 'string' && result.lang
        ? result.lang
        : desiredLanguage || 'unknown';

      return {
        text: typeof result?.text === 'string' ? result.text.trim() : '',
        language: detectedLanguage
      };
    });
  }

  private enqueue<T>(task: () => Promise<T>): Promise<T> {
    const run = this.queue.then(task, task);
    this.queue = run.then(() => undefined, () => undefined);
    return run;
  }

  private getRecognizer(): Promise<any> {
    if (!this.recognizerPromise) {
      this.recognizerPromise = (async () => {
        let sherpa: any;
        try {
          sherpa = await import('sherpa-onnx-node');
        } catch {
          throw new DangerError('O motor local de transcrição não está disponível neste ambiente.', 503);
        }
        const modelDirectory = await this.ensureModel();
        const recognizer = await sherpa.OfflineRecognizer.createAsync(
          this.buildConfig(modelDirectory, '')
        );

        this.currentLanguage = '';
        return recognizer;
      })();

      this.recognizerPromise.catch(() => {
        this.recognizerPromise = undefined;
      });
    }

    return this.recognizerPromise;
  }

  private buildConfig(modelDirectory: string, language: string): any {
    const configuredThreads = Number(process.env.WHISPER_THREADS);
    const numThreads = Number.isFinite(configuredThreads) && configuredThreads > 0
      ? Math.min(8, Math.floor(configuredThreads))
      : 2;

    return {
      featConfig: {
        sampleRate: 16000,
        featureDim: 80
      },
      modelConfig: {
        whisper: {
          encoder: join(modelDirectory, 'tiny-encoder.int8.onnx'),
          decoder: join(modelDirectory, 'tiny-decoder.int8.onnx'),
          language,
          task: 'transcribe'
        },
        tokens: join(modelDirectory, 'tiny-tokens.txt'),
        numThreads,
        provider: 'cpu',
        debug: 0
      }
    };
  }

  private ensureModel(): Promise<string> {
    if (!this.modelReady) {
      this.modelReady = this.prepareModel();
      this.modelReady.catch(() => {
        this.modelReady = undefined;
      });
    }

    return this.modelReady;
  }

  private async prepareModel(): Promise<string> {
    const directory = this.resolveModelDirectory();

    if (this.hasModel(directory)) return directory;

    if (process.env.WHISPER_AUTO_DOWNLOAD === 'false') {
      throw new DangerError(
        `Modelo Whisper local não encontrado em "${directory}". Defina WHISPER_MODEL_DIR ou permita o download automático.`,
        503
      );
    }

    mkdirSync(directory, { recursive: true });
    Logger.info(`Baixando modelo Whisper Tiny (~103 MB) para ${directory}...`, 'Transcription');

    for (const filename of MODEL_FILES) {
      const destination = join(directory, filename);

      if (this.hasModelFile(destination)) continue;

      const temporary = `${destination}.part`;

      try {
        const response = await fetch(`${MODEL_BASE_URL}/${filename}`, {
          signal: AbortSignal.timeout(300_000)
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        await Bun.write(temporary, response);
        renameSync(temporary, destination);
      } catch (error: any) {
        if (existsSync(temporary)) rmSync(temporary, { force: true });

        throw new DangerError(
          `Falha ao baixar o modelo Whisper local (${filename}): ${error.message}`,
          503
        );
      }
    }

    if (!this.hasModel(directory)) {
      throw new DangerError('O modelo Whisper local está incompleto.', 503);
    }

    Logger.success('Modelo Whisper Tiny pronto para uso local.', 'Transcription');
    return directory;
  }

  private resolveModelDirectory(): string {
    if (process.env.WHISPER_MODEL_DIR) {
      return resolve(process.env.WHISPER_MODEL_DIR);
    }

    const candidates = [
      resolve(process.cwd(), 'models/whisper-tiny'),
      resolve(process.cwd(), 'models/sherpa-onnx-whisper-tiny'),
      resolve(process.cwd(), 'sherpa-onnx-whisper-tiny')
    ];

    return candidates.find(candidate => this.hasModel(candidate)) ?? candidates[0];
  }

  private hasModel(directory: string): boolean {
    return MODEL_FILES.every(filename => this.hasModelFile(join(directory, filename)));
  }

  private hasModelFile(path: string): boolean {
    try {
      return existsSync(path) && statSync(path).size > 0;
    } catch {
      return false;
    }
  }
}

export { SherpaWhisperEngine, TranscriptionServiceImpl };
export const TranscriptionService = new TranscriptionServiceImpl();
