import { DangerError, InvalidParameterError } from '@errors/index';

const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;
const PROCESS_TIMEOUT_MS = 45_000;
const MAX_OUTPUT_BYTES = 1024 * 1024;
const MAX_CONCURRENT_JOBS = 2;
let activeJobs = 0;

async function readLimited(stream: ReadableStream<Uint8Array>, limit: number): Promise<Uint8Array> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) throw new Error('output-limit');
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const output = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return output;
}

class ShazamUploadServiceImpl {
  async recognize(data: Uint8Array): Promise<Record<string, unknown>> {
    if (data.byteLength === 0) throw new InvalidParameterError('O arquivo de áudio está vazio.');
    if (data.byteLength > MAX_UPLOAD_BYTES) {
      throw new DangerError('Arquivo muito grande. O limite é de 50 MB.', 413);
    }
    if (activeJobs >= MAX_CONCURRENT_JOBS) {
      throw new DangerError('O reconhecimento de áudio está ocupado. Tente novamente em instantes.', 429);
    }

    const configuredPython = process.env.SHAZAM_PYTHON?.trim();
    const python = configuredPython
      ? (Bun.which(configuredPython) ?? configuredPython)
      : Bun.which('python3');
    if (!python) throw new DangerError('Python 3 não está disponível para identificar o áudio.', 503);

    activeJobs += 1;
    let child: Bun.PipedSubprocess | undefined;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    let timedOut = false;
    try {
      child = Bun.spawn(
        [python, '-I', 'scripts/shazam_recognize.py'],
        {
          stdin: 'pipe',
          stdout: 'pipe',
          stderr: 'pipe',
          env: { PYTHONDONTWRITEBYTECODE: '1' }
        }
      );

      timeout = setTimeout(() => {
        timedOut = true;
        child?.kill();
      }, PROCESS_TIMEOUT_MS);
      timeout.unref?.();

      const stdin = child.stdin;
      const writeInput = (async () => {
        await stdin.write(data);
        await stdin.end();
      })();
      const outputPromise = readLimited(child.stdout, MAX_OUTPUT_BYTES);
      const errorPromise = readLimited(child.stderr, 16 * 1024);
      const [output, _stderr, exitCode] = await Promise.all([
        outputPromise,
        errorPromise,
        child.exited,
        writeInput
      ]).then(([stdout, stderr, code]) => [stdout, stderr, code] as const);
      clearTimeout(timeout);

      if (timedOut) throw new DangerError('O reconhecimento excedeu o tempo máximo de processamento.', 504);
      if (exitCode !== 0) throw new DangerError('O serviço de reconhecimento não conseguiu processar este áudio.', 422);

      try {
        const parsed: unknown = JSON.parse(new TextDecoder().decode(output));
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('invalid-result');
        return parsed as Record<string, unknown>;
      } catch {
        throw new DangerError('O serviço de reconhecimento retornou uma resposta inválida.', 502);
      }
    } catch (error) {
      if (child && !child.killed) child.kill();
      if (timedOut) throw new DangerError('O reconhecimento excedeu o tempo máximo de processamento.', 504);
      if (error instanceof DangerError || error instanceof InvalidParameterError) throw error;
      if (error instanceof Error && error.message === 'output-limit') {
        throw new DangerError('A resposta do reconhecimento excedeu o limite permitido.', 502);
      }
      throw new DangerError('Não foi possível iniciar o reconhecimento de áudio.', 503);
    } finally {
      if (timeout) clearTimeout(timeout);
      activeJobs -= 1;
    }
  }
}

export const ShazamUploadService = new ShazamUploadServiceImpl();
