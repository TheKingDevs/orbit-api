import { DownloaderService } from '@services/downloader.service';
import { authMiddleware } from '@middlewares/authMiddleware';
import { resolvePublicBaseUrl } from '@utils/publicBaseUrl.util';

const downloaderService = new DownloaderService();

export async function downloadPlayVideoRoute(req: Request, url: URL): Promise<Response> {
  authMiddleware(req);

  const name = url.searchParams.get('name');

  if (!name?.trim()) {
    throw new Error('Informe o nome do vídeo.');
  }

  const result = await downloaderService.processDownload(
    { name: name.trim().slice(0, 500), platform: 'youtube', type: 'video' },
    { baseUrl: resolvePublicBaseUrl(req, url) }
  );

  return Response.json(result, { status: 200 });
}
