import { CanvasService } from '@services/canvas.service';
import { ValidatorUtil } from '@utils/validator.util';
import { authMiddleware } from '@middlewares/authMiddleware';

export async function canvasGoodbyeRoute(req: Request, url: URL): Promise<Response> {
  authMiddleware(req);

  const queryObj = Object.fromEntries(url.searchParams.entries());
  const dto = ValidatorUtil.validateCanvasPayload(queryObj);

  const imageBuffer = await CanvasService.generateGoodbyeCard(dto);

  return new Response(imageBuffer as unknown as BodyInit, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=86400'
    }
  });
}
