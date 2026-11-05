import { CanvasService } from '@services/canvas.service';
import { ValidatorUtil } from '@utils/validator.util';
import { authMiddleware } from '@middlewares/authMiddleware';

export async function canvasWelcomeRoute(req: Request, url: URL): Promise<Response> {
  authMiddleware(req);

  const queryObj = Object.fromEntries(url.searchParams.entries());
  const dto = ValidatorUtil.validateCanvasPayload(queryObj);

  const imageBuffer = await CanvasService.generateWelcomeCard(dto);

  return new Response(imageBuffer, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=86400'
    }
  });
}
