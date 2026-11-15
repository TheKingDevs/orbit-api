import { authMiddleware } from '@middlewares/authMiddleware';
import { TtpService } from '@services/ttp.service';
import { ValidatorUtil } from '@utils/validator.util';

export async function stickerBratRoute(req: Request, url: URL): Promise<Response> {
  authMiddleware(req);
  const queryObj = Object.fromEntries(url.searchParams.entries());
  const dto = ValidatorUtil.validateTtpPayload({ backgroundColor: '#ffffff', textColor: '#000000', position: 'left', ...queryObj });
  const imageBuffer = await TtpService.generateTtp(dto);
  return new Response(imageBuffer as unknown as BodyInit, {
    headers: { 'Content-Type': 'image/png', 'Content-Length': String(imageBuffer.length), 'Cache-Control': 'public, max-age=86400' }
  });
}
