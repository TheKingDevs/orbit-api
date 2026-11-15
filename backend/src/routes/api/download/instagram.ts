import { DownloaderService } from '@services/downloader.service';
import { ValidatorUtil } from '@utils/validator.util';
import { authMiddleware } from '@middlewares/authMiddleware';
import { InvalidParameterError } from '@errors/index';
import { resolvePublicBaseUrl } from '@utils/publicBaseUrl.util';

const downloaderService = new DownloaderService();

export async function downloadInstagramRoute(req: Request, url: URL): Promise<Response> {
  authMiddleware(req);

  const mediaUrl = url.searchParams.get('url') || url.searchParams.get('URL');
  const typeParam = url.searchParams.get('type');

  if (!typeParam || !['image', 'video'].includes(typeParam)) {
    throw new InvalidParameterError("O parâmetro 'type' é obrigatório para o Instagram e deve ser: 'image' ou 'video'. Exemplo: ?type=video");
  }

  const dto = ValidatorUtil.validateDownloadPayload({
    url: mediaUrl,
    platform: 'instagram',
    type: typeParam
  });

  const result = await downloaderService.processDownload(dto, {
    baseUrl: resolvePublicBaseUrl(req, url)
  });

  return Response.json(result, { status: 200 });
}
