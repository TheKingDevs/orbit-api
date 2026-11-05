import { CanvasService } from '@services/canvas.service';
import { processImageRoute } from './handler';

export async function canvasEffectsRoute(req: Request, url: URL): Promise<Response> {
  return processImageRoute(req, url, {
    defaultFormat: 'png',
    processor: (source, dto) => CanvasService.applyEffects(source, dto.effects, dto)
  });
}
