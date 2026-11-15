import { authMiddleware } from '@middlewares/authMiddleware';
import { DangerError } from '@errors/index';
import { mkdtempSync, rmSync } from 'fs';
import { join } from 'path';
import { getTempDir } from '@utils/temp.util';

const MAX_INPUT_BYTES = 20 * 1024 * 1024;
const MAX_OUTPUT_BYTES = 20 * 1024 * 1024;
const FFMPEG_TIMEOUT_MS = 2_500;

export async function toGifRoute(req: Request, url: URL): Promise<Response> {
  authMiddleware(req);
  const ffmpeg = Bun.which('ffmpeg');
  if (!ffmpeg) throw new DangerError('ffmpeg não encontrado.');
  let input: Uint8Array | undefined;
  const ct = (req.headers.get('content-type') || '').toLowerCase();
  if (req.method === 'POST') {
    if (ct.startsWith('image/') || ct.startsWith('application/octet-stream')) {
      input = new Uint8Array(await req.arrayBuffer());
    } else if (ct.startsWith('multipart/form-data')) {
      const form = await req.formData();
      const file = ['file', 'image'].map(f => form.get(f)).find(v => v instanceof Blob) as Blob | undefined;
      if (file) input = new Uint8Array(await file.arrayBuffer());
    }
  }
  if (!input) throw new DangerError('Envie um arquivo de imagem.', 400);
  if (input.byteLength === 0) throw new DangerError('O arquivo de imagem está vazio.', 400);
  if (input.byteLength > MAX_INPUT_BYTES) throw new DangerError('A imagem excede o limite de 20 MB.', 413);

  const dir = mkdtempSync(join(getTempDir(), 'orbit-to-gif-'));

  try {
    await Bun.write(`${dir}/input.webp`, input);
    const proc = Bun.spawn(
      [ffmpeg, '-y', '-nostdin', '-hide_banner', '-loglevel', 'error', '-i', `${dir}/input.webp`, `${dir}/out.gif`],
      { stdout: 'ignore', stderr: 'pipe' }
    );
    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      proc.kill();
    }, FFMPEG_TIMEOUT_MS);
    timeout.unref?.();
    const [, exitCode] = await Promise.all([
      new Response(proc.stderr).text(),
      proc.exited
    ]);
    clearTimeout(timeout);

    if (timedOut) throw new DangerError('A conversão excedeu o limite de 2,5 segundos.', 504);
    if (exitCode !== 0) throw new DangerError('Não foi possível converter a imagem para GIF.', 400);

    const out = Bun.file(`${dir}/out.gif`);
    if (!(await out.exists())) throw new DangerError('A conversão não gerou um arquivo GIF.', 500);
    if (out.size > MAX_OUTPUT_BYTES) throw new DangerError('O GIF gerado excede o limite de 20 MB.', 413);
    const buf = await out.arrayBuffer();
    return new Response(buf, { headers: { 'Content-Type': 'image/gif', 'Content-Length': String(buf.byteLength) } });
  } finally {
    try {
      rmSync(dir, { recursive: true, force: true });
    } catch {}
  }
}
