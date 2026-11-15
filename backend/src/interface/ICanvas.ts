import { FfmpegOptions, ImageSource } from '@services/ffmpeg.service';
import { CanvasDTO } from '@apptypes/canvas.type';
import { StickerEffect } from '@apptypes/sticker.type';

export interface ICanvasService {
  generateWelcomeCard(dto: CanvasDTO): Promise<Buffer>;
  generateGoodbyeCard(dto: CanvasDTO): Promise<Buffer>;
  applyEffects(source: ImageSource, effects?: StickerEffect[], options?: FfmpegOptions): Promise<Buffer>;
}
