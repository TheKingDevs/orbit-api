import { authMiddleware } from '@middlewares/authMiddleware';
import { TtpService } from '@services/ttp.service';
import { ValidatorUtil } from '@utils/validator.util';

export async function stickerAbratRoute(req: Request, url: URL): Promise<Response> {
  authMiddleware(req);
  const queryObj = Object.fromEntries(url.searchParams.entries());
  const dto = ValidatorUtil.validateTtpPayload({ backgroundColor: '#ffffff', textColor: '#000000', position: 'left', effect: 'zoomin', ...queryObj });
  const gifBuffer = await TtpService.generateAttp(dto);
  return new Response(gifBuffer as unknown as BodyInit, {
    headers: { 'Content-Type': 'image/gif', 'Content-Length': String(gifBuffer.length), 'Cache-Control': 'public, max-age=86400' }
  });
}
