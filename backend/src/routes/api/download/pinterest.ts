import { DownloaderService } from '@services/downloader.service';
import { ValidatorUtil } from '@utils/validator.util';
import { authMiddleware } from '@middlewares/authMiddleware';
import { InvalidParameterError } from '@errors/index';

const downloaderService = new DownloaderService();

export async function downloadPinterestRoute(req: Request, url: URL): Promise<Response> {
  authMiddleware(req);

  const mediaUrl = url.searchParams.get('url') || url.searchParams.get('URL');
  const typeParam = url.searchParams.get('type') || 'image';

  if (!['image', 'gif', 'video'].includes(typeParam)) {
    throw new InvalidParameterError("O parâmetro 'type' é obrigatório para o Pinterest e deve ser: 'image', 'gif' ou 'video'. Exemplo: ?type=image");
  }

  const dto = ValidatorUtil.validateDownloadPayload({
    url: mediaUrl,
    platform: 'pinterest',
    type: typeParam
  });

  const result = await downloaderService.processDownload(dto, {
    baseUrl: process.env.PUBLIC_BASE_URL || url.origin
  });

  return Response.json(result, { status: 200 });
}
