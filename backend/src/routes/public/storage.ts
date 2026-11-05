import { NotFoundError } from '@errors/index';
import { storageService } from '@services/storage.service';

function parseRange(range: string, size: number): { start: number; end: number } | undefined {
  const match = /^bytes=(\d*)-(\d*)$/.exec(range.trim());

  if (!match) return undefined;

  let start = match[1] ? Number(match[1]) : undefined;
  let end = match[2] ? Number(match[2]) : undefined;

  if (start === undefined && end === undefined) return undefined;

  if (start === undefined) {
    const suffixLength = end as number;
    start = Math.max(0, size - suffixLength);
    end = size - 1;
  } else {
    end = end === undefined ? size - 1 : Math.min(end, size - 1);
  }

  if (start < 0 || start > end || start >= size) return undefined;

  return { start, end };
}

export async function storageRoute(req: Request, url: URL): Promise<Response> {
  let filename: string;

  try {
    filename = decodeURIComponent(url.pathname.replace(/^\/storage\//, ''));
  } catch {
    throw new NotFoundError('Arquivo não encontrado.');
  }

  const filePath = storageService.resolveFile(filename);

  if (!filePath) {
    throw new NotFoundError('Arquivo não encontrado.');
  }

  const file = Bun.file(filePath);

  if (!(await file.exists())) {
    throw new NotFoundError('Arquivo não encontrado ou expirado.');
  }

  const size = file.size;
  const contentType = storageService.getContentType(filename);
  const headers: Record<string, string> = {
    'Content-Type': contentType,
    'Accept-Ranges': 'bytes',
    'Cache-Control': 'public, max-age=1800',
    'Content-Disposition': `inline; filename="${filename}"`
  };

  const rangeHeader = req.headers.get('range');

  if (rangeHeader) {
    const range = parseRange(rangeHeader, size);

    if (!range) {
      return new Response(null, {
        status: 416,
        headers: {
          ...headers,
          'Content-Range': `bytes */${size}`
        }
      });
    }

    const { start, end } = range;
    const body = req.method === 'HEAD' ? null : file.slice(start, end + 1);

    return new Response(body, {
      status: 206,
      headers: {
        ...headers,
        'Content-Length': String(end - start + 1),
        'Content-Range': `bytes ${start}-${end}/${size}`
      }
    });
  }

  return new Response(req.method === 'HEAD' ? null : file, {
    headers: {
      ...headers,
      'Content-Length': String(size)
    }
  });
}
