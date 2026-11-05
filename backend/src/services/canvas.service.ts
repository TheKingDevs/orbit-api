import { createCanvas, loadImage } from '@napi-rs/canvas';
import { ICanvasService } from '@interface/ICanvas';
import { FfmpegOptions, FfmpegService, ImageSource } from '@services/ffmpeg.service';
import { CanvasDTO } from '@types/canvas.type';
import { StickerEffect } from '@types/sticker.type';
import { FontUtil } from '@utils/font.util';
import { Logger } from '@utils/logger';

type FontWeight = 'normal' | 'bold';

export class CanvasService implements ICanvasService {

  static async generateWelcomeCard(dto: CanvasDTO): Promise<Buffer> {
    const width = 800;
    const height = 300;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    if (dto.bgUrl) {
      try {
        const bgImg = await loadImage(dto.bgUrl);
        ctx.drawImage(bgImg, 0, 0, width, height);
        ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
        ctx.fillRect(0, 0, width, height);
      } catch (e) {
        Logger.warning('Falha ao carregar bgUrl. Usando padrão.', 'CanvasService');
        this.renderDefaultBackground(ctx, width, height, '#0f172a', '#1e1b4b', '#311042');
      }
    } else {
      this.renderDefaultBackground(ctx, width, height, '#0f172a', '#1e1b4b', '#311042');
    }

    ctx.strokeStyle = '#818cf8';
    ctx.lineWidth = 3;
    ctx.strokeRect(15, 15, width - 30, height - 30);

    await this.drawAvatar(ctx, dto, '#c084fc');

    this.drawTextBlock(ctx, dto, {
      accentColor: '#818cf8',
      titleFallback: 'BEM-VINDO AO SERVIDOR!',
      subtitleFallback: 'Esperamos que você se divirta por aqui 🎉',
      subtitleColor: '#94a3b8'
    });

    return canvas.toBuffer('image/png');
  }

  static async generateGoodbyeCard(dto: CanvasDTO): Promise<Buffer> {
    const width = 800;
    const height = 300;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    if (dto.bgUrl) {
      try {
        const bgImg = await loadImage(dto.bgUrl);
        ctx.drawImage(bgImg, 0, 0, width, height);
        ctx.fillStyle = 'rgba(24, 24, 27, 0.75)';
        ctx.fillRect(0, 0, width, height);
      } catch (e) {
        Logger.warning('Falha ao carregar bgUrl no Goodbye.', 'CanvasService');
        this.renderDefaultBackground(ctx, width, height, '#18181b', '#27272a', '#3f3f46');
      }
    } else {
      this.renderDefaultBackground(ctx, width, height, '#18181b', '#27272a', '#3f3f46');
    }

    ctx.strokeStyle = '#f87171';
    ctx.lineWidth = 3;
    ctx.strokeRect(15, 15, width - 30, height - 30);

    await this.drawAvatar(ctx, dto, '#fb923c');

    this.drawTextBlock(ctx, dto, {
      accentColor: '#f87171',
      titleFallback: 'ADEUS...',
      subtitleFallback: 'Sentiremos sua falta pelo servidor 😢',
      subtitleColor: '#a1a1aa'
    });

    return canvas.toBuffer('image/png');
  }

  static async applyEffects(
    source: ImageSource,
    effects: StickerEffect[] = [],
    options: FfmpegOptions = {}
  ): Promise<Buffer> {
    return FfmpegService.process(source, effects, options);
  }

  async generateWelcomeCard(dto: CanvasDTO): Promise<Buffer> {
    return CanvasService.generateWelcomeCard(dto);
  }

  async generateGoodbyeCard(dto: CanvasDTO): Promise<Buffer> {
    return CanvasService.generateGoodbyeCard(dto);
  }

  async applyEffects(
    source: ImageSource,
    effects: StickerEffect[] = [],
    options: FfmpegOptions = {}
  ): Promise<Buffer> {
    return CanvasService.applyEffects(source, effects, options);
  }

  private static async drawAvatar(ctx: any, dto: CanvasDTO, ringColor: string): Promise<void> {
    const avatarUrl = dto.avatarUrl || 'https://api.dicebear.com/7.x/bottts/png?seed=' + encodeURIComponent(dto.username);

    try {
      const avatarImage = await loadImage(avatarUrl);
      ctx.save();
      ctx.beginPath();
      ctx.arc(140, 150, 70, 0, Math.PI * 2, true);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(avatarImage, 70, 80, 140, 140);
      ctx.restore();

      ctx.beginPath();
      ctx.arc(140, 150, 72, 0, Math.PI * 2, true);
      ctx.strokeStyle = ringColor;
      ctx.lineWidth = 4;
      ctx.stroke();
    } catch (e) {
      Logger.warning('Falha ao carregar avatar.', 'CanvasService');
    }
  }

  private static drawTextBlock(
    ctx: any,
    dto: CanvasDTO,
    options: {
      accentColor: string;
      titleFallback: string;
      subtitleFallback: string;
      subtitleColor: string;
    }
  ): void {
    const startX = 250;
    const maxWidth = 800 - startX - 35;

    const title = (this.pickText(dto.title, dto.titulo) || options.titleFallback).toUpperCase();
    const subtitle = this.pickText(dto.subtitle, dto.subtitulo) || options.subtitleFallback;

    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    ctx.fillStyle = options.accentColor;
    const fittedTitle = this.fitText(ctx, title, maxWidth, 24, 'bold', 16);
    ctx.fillText(fittedTitle, startX, 104);

    ctx.fillStyle = '#ffffff';
    const fittedUsername = this.fitText(ctx, dto.username, maxWidth, 44, 'bold', 22);
    ctx.fillText(fittedUsername, startX, 150);

    ctx.fillStyle = options.subtitleColor;
    const fittedSubtitle = this.fitText(ctx, subtitle, maxWidth, 20, 'normal', 13);
    ctx.fillText(fittedSubtitle, startX, 194);
  }

  private static pickText(primary?: string, alias?: string): string | undefined {
    const value = primary && primary.trim().length > 0 ? primary : alias;
    return value && value.trim().length > 0 ? value.trim() : undefined;
  }

  private static fitText(
    ctx: any,
    text: string,
    maxWidth: number,
    size: number,
    weight: FontWeight,
    minSize: number
  ): string {
    let fontSize = size;
    ctx.font = this.getFont(fontSize, weight);

    while (fontSize > minSize && ctx.measureText(text).width > maxWidth) {
      fontSize -= 1;
      ctx.font = this.getFont(fontSize, weight);
    }

    if (ctx.measureText(text).width <= maxWidth) {
      return text;
    }

    const chars = Array.from(text);

    while (chars.length > 1 && ctx.measureText(`${chars.join('')}…`).width > maxWidth) {
      chars.pop();
    }

    return `${chars.join('').trimEnd()}…`;
  }

  private static getFont(size: number, weight: FontWeight = 'normal'): string {
    return FontUtil.getFont(size, weight);
  }

  private static renderDefaultBackground(ctx: any, width: number, height: number, c1: string, c2: string, c3: string) {
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, c1);
    gradient.addColorStop(0.5, c2);
    gradient.addColorStop(1, c3);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  }
}
