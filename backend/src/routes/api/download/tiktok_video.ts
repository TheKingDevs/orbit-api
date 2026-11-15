import { DownloaderService } from '@services/downloader.service';
import { ValidatorUtil } from '@utils/validator.util';
import { authMiddleware } from '@middlewares/authMiddleware';
import { resolvePublicBaseUrl } from '@utils/publicBaseUrl.util';

const downloaderService = new DownloaderService();

export async function downloadTikTokVideoRoute(req: Request, url: URL): Promise<Response> {
  authMiddleware(req);

  const mediaUrl = url.searchParams.get('url');

  const dto = ValidatorUtil.validateDownloadPayload({
    url: mediaUrl,
    platform: 'tiktok',
    type: 'video'
  });

  const result = await downloaderService.processDownload(dto, {
    baseUrl: resolvePublicBaseUrl(req, url)
  });

  return Response.json(result, { status: 200 });
}
