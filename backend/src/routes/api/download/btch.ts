import { authMiddleware } from '@middlewares/authMiddleware';
import { btchDownloaderService } from '@services/btchDownloader.service';
import type { BtchDownloadPlatform } from '@services/btchDownloader.service';
import { assertReadMethod, jsonResponse, readRequestParam } from '@utils/request.util';

export function createBtchDownloadRoute(platform: BtchDownloadPlatform) {
  return async (req: Request, url: URL): Promise<Response> => {
    assertReadMethod(req);
    authMiddleware(req);

    const mediaUrl = await readRequestParam(req, url, ['url', 'link', 'URL']);
    const result = await btchDownloaderService.download(platform, mediaUrl);
    return jsonResponse(result);
  };
}
