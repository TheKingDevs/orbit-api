import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { DangerError, InvalidParameterError } from '@errors/index';
import { getTempDir } from '@utils/temp.util';

const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
const OCR_TIMEOUT_MS = 60_000;

const IMAGE_FORMATS: Array<{ extension: string; matches: (data: Buffer) => boolean }> = [
  { extension: 'png', matches: data => data.length >= 8 && data.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  { extension: 'jpg', matches: data => data.length >= 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff },
  { extension: 'gif', matches: data => data.length >= 6 && ['GIF87a', 'GIF89a'].includes(data.toString('ascii', 0, 6)) },
  { extension: 'webp', matches: data => data.length >= 12 && data.toString('ascii', 0, 4) === 'RIFF' && data.toString('ascii', 8, 12) === 'WEBP' },
  { extension: 'bmp', matches: data => data.length >= 2 && data.toString('ascii', 0, 2) === 'BM' },
  { extension: 'tif', matches: data => data.length >= 4 && (data.subarray(0, 4).equals(Buffer.from([0x49, 0x49, 0x2a, 0x00])) || data.subarray(0, 4).equals(Buffer.from([0x4d, 0x4d, 0x00, 0x2a]))) }
];

function detectImageFormat(data: Buffer): string | undefined {
  return IMAGE_FORMATS.find(format => format.matches(data))?.extension;
}

class OcrServiceImpl {
  async recognize(data: Uint8Array, language: 'auto' | 'pt' | 'en'): Promise<{ text: string; language: string }> {
    if (data.byteLength === 0) {
      throw new InvalidParameterError('A imagem enviada está vazia.');
    }

    if (data.byteLength > MAX_IMAGE_BYTES) {
      throw new DangerError('Imagem muito grande. O limite é de 15 MB.', 413);
    }

    const image = Buffer.from(data.buffer, data.byteOffset, data.byteLength);
    const extension = detectImageFormat(image);

    if (!extension) {
      throw new InvalidParameterError(
        'Formato de imagem não suportado. Envie PNG, JPEG, GIF, WebP, BMP ou TIFF.',
        [{ field: 'file', message: 'O conteúdo enviado não corresponde a um formato de imagem aceito.' }]
      );
    }

    const binary = process.env.TESSERACT_PATH?.trim() || 'tesseract';
    const executable = Bun.which(binary) ?? (existsSync(binary) ? binary : undefined);

    if (!executable) {
      throw new DangerError('Tesseract OCR não encontrado. Instale o Tesseract ou configure TESSERACT_PATH.', 503);
    }

    const directory = mkdtempSync(join(getTempDir(), 'orbit-ocr-'));
    const inputPath = join(directory, `input.${extension}`);
    const engineLanguage = language === 'pt' ? 'por' : language === 'en' ? 'eng' : 'por+eng';

    try {
      writeFileSync(inputPath, image);

      let processHandle: ReturnType<typeof Bun.spawn>;
      try {
        processHandle = Bun.spawn(
          [executable, inputPath, 'stdout', '-l', engineLanguage, '--psm', '3'],
          { stdout: 'pipe', stderr: 'pipe' }
        );
      } catch {
        throw new DangerError('Não foi possível iniciar o Tesseract OCR.', 503);
      }

      let timedOut = false;
      const timeout = setTimeout(() => {
        timedOut = true;
        processHandle.kill();
      }, OCR_TIMEOUT_MS);
      timeout.unref?.();

      const [text, stderr, exitCode] = await Promise.all([
        new Response(processHandle.stdout).text(),
        new Response(processHandle.stderr).text(),
        processHandle.exited
      ]);
      clearTimeout(timeout);

      if (timedOut) {
        throw new DangerError('O OCR excedeu o tempo máximo de processamento.', 504);
      }

      if (exitCode !== 0) {
        if (/failed loading language|error opening data file|tessdata/i.test(stderr)) {
          throw new DangerError(`Dados do idioma OCR não encontrados (${engineLanguage}).`, 503);
        }

        throw new InvalidParameterError('Não foi possível ler o conteúdo desta imagem.');
      }

      return {
        text: text.trim(),
        language: language === 'auto' ? 'pt+en' : language
      };
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  }
}

export const OcrService = new OcrServiceImpl();
