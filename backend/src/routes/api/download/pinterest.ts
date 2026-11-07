import { DownloaderService } from '@services/downloader.service';
import { devWorldBRService } from '@services/devworldbr.service';
import { ValidatorUtil } from '@utils/validator.util';
import { authMiddleware } from '@middlewares/authMiddleware';
import { InvalidParameterError } from '@errors/index';
import { jsonResponse } from '@utils/request.util';

const downloaderService = new DownloaderService();

export async function downloadPinterestRoute(req: Request, url: URL): Promise<Response> {
  authMiddleware(req);

  const search = url.searchParams.get('query') ||
    url.searchParams.get('q') ||
    url.searchParams.get('search') ||
    url.searchParams.get('termo');

  if (search && search.trim()) {
    const result = await devWorldBRService.pinterest(search.trim());
    return jsonResponse(result);
  }

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
