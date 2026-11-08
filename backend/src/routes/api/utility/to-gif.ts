import { authMiddleware } from '@middlewares/authMiddleware';
import { DangerError } from '@errors/index';
import { tmpdir } from 'os';
import { join } from 'path';
import { mkdirSync, rmSync } from 'fs';

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

  const baseTmp = process.env.TMPDIR || tmpdir() || '/tmp';
  const dir = join(baseTmp, `to-gif-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  mkdirSync(dir, { recursive: true });

  try {
    await Bun.write(`${dir}/input.webp`, input);
    const proc = Bun.spawn([ffmpeg, '-y', '-i', `${dir}/input.webp`, `${dir}/out.gif`], { stdout: 'ignore', stderr: 'pipe' });
    await proc.exited;
    const out = Bun.file(`${dir}/out.gif`);
    const buf = await out.arrayBuffer();
    return new Response(buf, { headers: { 'Content-Type': 'image/gif', 'Content-Length': String(buf.byteLength) } });
  } finally {
    try {
      rmSync(dir, { recursive: true, force: true });
    } catch {}
  }
}
