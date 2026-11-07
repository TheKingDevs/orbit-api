import { DownloaderService } from '@services/downloader.service';
import { authMiddleware } from '@middlewares/authMiddleware';
import { devWorldBRService } from '@services/devworldbr.service';

const downloaderService = new DownloaderService();

function extractFirstVideoUrl(response: unknown): string | undefined {
  const data: any = response;

  const list = Array.isArray(data?.data) ? data.data : Array.isArray(data?.videos) ? data.videos : undefined;
  if (!list || list.length === 0) return undefined;

  const first = list[0];
  if (typeof first === 'string') return first;
  if (first && typeof first === 'object') {
    return first.link ?? first.url ?? first.linkVideo ?? first.videoUrl;
  }

  return undefined;
}

export async function downloadPlayVideoRoute(req: Request, url: URL): Promise<Response> {
  authMiddleware(req);

  const name = url.searchParams.get('name');

  if (!name?.trim()) {
    throw new Error('Informe o nome do vídeo.');
  }

  const search = await devWorldBRService.ytSearch(name.trim());
  const targetUrl = extractFirstVideoUrl(search);

  if (!targetUrl) {
    throw new Error('Não foi possível encontrar o vídeo no YouTube para o nome informado.');
  }

  const result = await downloaderService.processDownload(
    { url: targetUrl, type: 'video' },
    { baseUrl: process.env.PUBLIC_BASE_URL || url.origin }
  );

  return Response.json(result, { status: 200 });
}
