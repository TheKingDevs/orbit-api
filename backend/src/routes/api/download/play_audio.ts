import { DownloaderService } from '@services/downloader.service';
import { authMiddleware } from '@middlewares/authMiddleware';

const downloaderService = new DownloaderService();

export async function downloadPlayAudioRoute(req: Request, url: URL): Promise<Response> {
  authMiddleware(req);

  const name = url.searchParams.get('name');

  if (!name?.trim()) {
    throw new Error('Informe o nome da música.');
  }

  const result = await downloaderService.processDownload(
    { name: name.trim().slice(0, 500), platform: 'youtube', type: 'audio' },
    { baseUrl: process.env.PUBLIC_BASE_URL || url.origin }
  );

  return Response.json(result, { status: 200 });
}
