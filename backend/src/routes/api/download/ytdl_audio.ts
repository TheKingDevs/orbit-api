import { DownloaderService } from '@services/downloader.service';
import { ValidatorUtil } from '@utils/validator.util';
import { authMiddleware } from '@middlewares/authMiddleware';

const downloaderService = new DownloaderService();

export async function downloadYtdlAudioRoute(req: Request, url: URL): Promise<Response> {
  authMiddleware(req);

  const mediaUrl = url.searchParams.get('url');

  const dto = ValidatorUtil.validateDownloadPayload({
    url: mediaUrl,
    type: 'audio'
  });

  const result = await downloaderService.resolveMediaUrl(dto);

  return Response.json({
    success: true,
    message: 'URL de áudio resolvida com sucesso.',
    mediaType: result.mediaType,
    downloadUrl: result.directUrl,
    metadata: result.metadata
  }, { status: 200 });
}
