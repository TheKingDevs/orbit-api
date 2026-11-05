import { DownloaderService } from '@services/downloader.service';
import { ValidatorUtil } from '@utils/validator.util';
import { authMiddleware } from '@middlewares/authMiddleware';

const downloaderService = new DownloaderService();

export async function downloadPlayAudioRoute(req: Request, url: URL): Promise<Response> {
  authMiddleware(req);

  const mediaUrl = url.searchParams.get('url');
  const platform = url.searchParams.get('platform') || 'youtube';

  const dto = ValidatorUtil.validateDownloadPayload({
    url: mediaUrl,
    platform,
    type: 'audio'
  });

  const result = await downloaderService.processDownload(dto, {
    baseUrl: process.env.PUBLIC_BASE_URL || url.origin
  });

  return Response.json(result, { status: 200 });
}
