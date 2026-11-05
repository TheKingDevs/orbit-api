import { FfmpegOptions, ImageSource } from '@services/ffmpeg.service';
import { CanvasDTO } from '@types/canvas.type';
import { StickerEffect } from '@types/sticker.type';

export interface ICanvasService {
  generateWelcomeCard(dto: CanvasDTO): Promise<Buffer>;
  generateGoodbyeCard(dto: CanvasDTO): Promise<Buffer>;
  applyEffects(source: ImageSource, effects?: StickerEffect[], options?: FfmpegOptions): Promise<Buffer>;
}
