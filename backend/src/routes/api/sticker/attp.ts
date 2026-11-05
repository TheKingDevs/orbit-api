import { authMiddleware } from '@middlewares/authMiddleware';
import { TtpService } from '@services/ttp.service';
import { ValidatorUtil } from '@utils/validator.util';

export async function stickerAttpRoute(req: Request, url: URL): Promise<Response> {
  authMiddleware(req);

  const queryObj = Object.fromEntries(url.searchParams.entries());
  const dto = ValidatorUtil.validateTtpPayload(queryObj);
  const gifBuffer = await TtpService.generateAttp(dto);

  return new Response(gifBuffer, {
    headers: {
      'Content-Type': 'image/gif',
      'Content-Length': String(gifBuffer.length),
      'Cache-Control': 'public, max-age=86400'
    }
  });
}
