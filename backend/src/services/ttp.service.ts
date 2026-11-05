import { createCanvas, SKRSContext2D } from '@napi-rs/canvas';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { DangerError } from '@errors/index';
import { ITtpService } from '@interface/ITtp';
import { TtpDTO } from '@types/ttp.type';
import { FontUtil } from '@utils/font.util';
import { getTempDir } from '@utils/temp.util';

const WIDTH = 512;
const HEIGHT = 512;
const PADDING = 40;
const MAX_LINES = 8;

interface TextLayout {
  fontSize: number;
  lineHeight: number;
  lines: string[];
  lineWidths: number[];
  maxWidth: number;
}

class TtpServiceImpl implements ITtpService {
  private segmenter = new Intl.Segmenter('pt', { granularity: 'grapheme' });

  async generateTtp(dto: TtpDTO): Promise<Buffer> {
    const canvas = createCanvas(WIDTH, HEIGHT);
    const ctx = canvas.getContext('2d');
    const text = this.normalizeText(dto.text);
    const layout = this.layoutText(ctx, text, WIDTH - PADDING * 2, HEIGHT - PADDING * 2, dto.fontSize);

    this.fillBackground(ctx, dto.backgroundColor);
    this.drawStaticText(ctx, layout, dto);

    return canvas.toBuffer('image/png');
  }

  async generateAttp(dto: TtpDTO): Promise<Buffer> {
    const ffmpeg = Bun.which('ffmpeg');

    if (!ffmpeg) {
      throw new DangerError('ffmpeg não encontrado. Instale o ffmpeg para gerar ATTP animado.');
    }

    const frameCount = Math.max(2, Math.round(dto.duration * dto.fps));
    const directory = mkdtempSync(join(getTempDir(), 'orbit-attp-'));
    const layout = this.layoutText(
      createCanvas(WIDTH, HEIGHT).getContext('2d'),
      this.normalizeText(dto.text),
      WIDTH - PADDING * 2,
      HEIGHT - PADDING * 2 - 16,
      dto.fontSize
    );

    try {
      for (let frame = 0; frame < frameCount; frame += 1) {
        const canvas = createCanvas(WIDTH, HEIGHT);
        const ctx = canvas.getContext('2d');
        const progress = frame / frameCount;

        this.fillBackground(ctx, dto.backgroundColor);
        this.drawAnimatedGlow(ctx, progress);
        this.drawAnimatedText(ctx, layout, dto, progress);

        writeFileSync(
          join(directory, `frame-${String(frame).padStart(3, '0')}.png`),
          canvas.toBuffer('image/png')
        );
      }

      return await this.encodeGif(directory, ffmpeg, dto.fps);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  }

  private normalizeText(text: string): string {
    return text
      .replace(/\r\n?/g, '\n')
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  private layoutText(
    ctx: SKRSContext2D,
    text: string,
    maxWidth: number,
    maxHeight: number,
    preferredSize?: number
  ): TextLayout {
    const startSize = Math.min(preferredSize ?? 72, 110);
    const minSize = 16;

    for (let fontSize = startSize; fontSize >= minSize; fontSize -= 1) {
      ctx.font = FontUtil.getFont(fontSize, 'bold');
      const lines = this.wrapText(ctx, text, maxWidth);
      const lineHeight = Math.ceil(fontSize * 1.2);

      if (lines.length <= MAX_LINES && lines.length * lineHeight <= maxHeight) {
        return this.buildLayout(ctx, lines, fontSize, lineHeight);
      }
    }

    ctx.font = FontUtil.getFont(minSize, 'bold');
    const lineHeight = Math.ceil(minSize * 1.2);
    const lines = this.wrapText(ctx, text, maxWidth);
    const maxLines = Math.max(1, Math.min(MAX_LINES, Math.floor(maxHeight / lineHeight)));
    const visibleLines = lines.slice(0, maxLines);

    if (visibleLines.length < lines.length) {
      visibleLines[visibleLines.length - 1] = this.ellipsize(
        ctx,
        visibleLines[visibleLines.length - 1],
        maxWidth
      );
    }

    return this.buildLayout(ctx, visibleLines, minSize, lineHeight);
  }

  private buildLayout(ctx: SKRSContext2D, lines: string[], fontSize: number, lineHeight: number): TextLayout {
    const lineWidths = lines.map(line => ctx.measureText(line).width);

    return {
      fontSize,
      lineHeight,
      lines,
      lineWidths,
      maxWidth: Math.max(0, ...lineWidths)
    };
  }

  private wrapText(ctx: SKRSContext2D, text: string, maxWidth: number): string[] {
    const lines: string[] = [];

    for (const paragraph of text.split('\n')) {
      if (!paragraph.trim()) {
        lines.push('');
        continue;
      }

      let current = '';

      for (const word of paragraph.split(' ')) {
        const candidate = current ? `${current} ${word}` : word;

        if (ctx.measureText(candidate).width <= maxWidth) {
          current = candidate;
          continue;
        }

        if (current) {
          lines.push(current);
          current = '';
        }

        if (ctx.measureText(word).width <= maxWidth) {
          current = word;
          continue;
        }

        for (const piece of this.segment(word)) {
          const next = current + piece;

          if (current && ctx.measureText(next).width > maxWidth) {
            lines.push(current);
            current = piece;
          } else {
            current = next;
          }
        }
      }

      if (current) lines.push(current);
    }

    return lines.length > 0 ? lines : [''];
  }

  private ellipsize(ctx: SKRSContext2D, line: string, maxWidth: number): string {
    const chars = this.segment(line);
    let value = line;

    while (chars.length > 1 && ctx.measureText(`${value}…`).width > maxWidth) {
      chars.pop();
      value = chars.join('').trimEnd();
    }

    return `${value}…`;
  }

  private fillBackground(ctx: SKRSContext2D, color: string): void {
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
  }

  private drawStaticText(ctx: SKRSContext2D, layout: TextLayout, dto: TtpDTO): void {
    ctx.save();
    ctx.font = FontUtil.getFont(layout.fontSize, 'bold');
    ctx.fillStyle = dto.textColor;
    ctx.textAlign = dto.position;
    ctx.textBaseline = 'middle';

    const x = this.anchorX(dto.position);
    const startY = HEIGHT / 2 - ((layout.lines.length - 1) * layout.lineHeight) / 2;

    layout.lines.forEach((line, index) => {
      ctx.fillText(line, x, startY + index * layout.lineHeight);
    });

    ctx.restore();
  }

  private drawAnimatedGlow(ctx: SKRSContext2D, progress: number): void {
    const phase = progress * Math.PI * 2;
    const x = WIDTH / 2 + Math.cos(phase) * WIDTH * 0.3;
    const y = HEIGHT / 2 + Math.sin(phase * 1.7) * HEIGHT * 0.22;
    const radius = Math.max(WIDTH, HEIGHT) * 0.7;
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);

    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.12)');
    gradient.addColorStop(0.45, 'rgba(255, 255, 255, 0.045)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
  }

  private drawAnimatedText(ctx: SKRSContext2D, layout: TextLayout, dto: TtpDTO, progress: number): void {
    ctx.save();
    ctx.font = FontUtil.getFont(layout.fontSize, 'bold');
    ctx.textBaseline = 'middle';

    const phase = progress * Math.PI * 2;
    const startY = HEIGHT / 2 - ((layout.lines.length - 1) * layout.lineHeight) / 2;

    if (dto.effect === 'zoomin') {
      const scale = 0.2 + progress * 0.8;
      const blockCenterX = this.blockCenterX(dto.position, layout.maxWidth);
      ctx.translate(blockCenterX, HEIGHT / 2);
      ctx.scale(scale, scale);
      ctx.translate(-blockCenterX, -HEIGHT / 2);
      ctx.globalAlpha = progress;
    }

    if (dto.effect === 'pulse' || dto.effect === 'glow') {
      const scale = 1 + Math.sin(phase) * 0.035;
      const blockCenterX = this.blockCenterX(dto.position, layout.maxWidth);
      ctx.translate(blockCenterX, HEIGHT / 2);
      ctx.scale(scale, scale);
      ctx.translate(-blockCenterX, -HEIGHT / 2);
    }

    if (dto.effect === 'glow') {
      ctx.shadowColor = dto.textColor;
      ctx.shadowBlur = 12 + (Math.sin(phase) + 1) * 14;
    }

    if (dto.effect === 'wave') {
      this.drawWaveText(ctx, layout, dto, phase, startY);
    } else if (dto.effect === 'typing') {
      this.drawTypingText(ctx, layout, dto, progress, startY);
    } else {
      ctx.fillStyle = dto.effect === 'rainbow'
        ? `hsl(${Math.round(progress * 360)}, 90%, 64%)`
        : dto.textColor;
      ctx.textAlign = dto.position;

      const x = this.anchorX(dto.position);

      layout.lines.forEach((line, index) => {
        ctx.fillText(line, x, startY + index * layout.lineHeight);
      });
    }

    ctx.restore();
  }

  private drawWaveText(
    ctx: SKRSContext2D,
    layout: TextLayout,
    dto: TtpDTO,
    phase: number,
    startY: number
  ): void {
    ctx.fillStyle = dto.textColor;
    ctx.textAlign = 'left';

    let characterIndex = 0;

    layout.lines.forEach((line, lineIndex) => {
      const chars = this.segment(line);
      let x = this.lineStartX(layout.lineWidths[lineIndex], dto.position);
      const y = startY + lineIndex * layout.lineHeight;

      chars.forEach(char => {
        const offset = Math.sin(phase + characterIndex * 0.55) * 8;
        ctx.fillText(char, x, y + offset);
        x += ctx.measureText(char).width;
        characterIndex += 1;
      });
    });
  }

  private drawTypingText(
    ctx: SKRSContext2D,
    layout: TextLayout,
    dto: TtpDTO,
    progress: number,
    startY: number
  ): void {
    const totalCharacters = layout.lines.reduce((total, line) => total + this.segment(line).length, 0);
    const typingProgress = Math.min(1, progress / 0.75);
    let remaining = Math.ceil(totalCharacters * typingProgress);

    ctx.fillStyle = dto.textColor;
    ctx.textAlign = 'left';

    layout.lines.forEach((line, lineIndex) => {
      const chars = this.segment(line);
      const visible = Math.max(0, Math.min(chars.length, remaining));
      const visibleText = chars.slice(0, visible).join('');
      const startX = this.lineStartX(layout.lineWidths[lineIndex], dto.position);
      const y = startY + lineIndex * layout.lineHeight;

      ctx.fillText(visibleText, startX, y);

      if (lineIndex === layout.lines.length - 1 && (visible < chars.length || Math.floor(progress * 10) % 2 === 0)) {
        const cursorX = startX + ctx.measureText(visibleText).width + 3;
        const cursorWidth = Math.max(2, layout.fontSize * 0.08);
        ctx.fillRect(cursorX, y - layout.fontSize * 0.55, cursorWidth, layout.fontSize * 1.1);
      }

      remaining -= visible;
    });
  }

  private anchorX(position: 'left' | 'center' | 'right'): number {
    if (position === 'left') return PADDING;
    if (position === 'right') return WIDTH - PADDING;
    return WIDTH / 2;
  }

  private lineStartX(lineWidth: number, position: 'left' | 'center' | 'right'): number {
    if (position === 'left') return PADDING;
    if (position === 'right') return WIDTH - PADDING - lineWidth;
    return (WIDTH - lineWidth) / 2;
  }

  private blockCenterX(position: 'left' | 'center' | 'right', blockWidth: number): number {
    return this.lineStartX(blockWidth, position) + blockWidth / 2;
  }

  private segment(value: string): string[] {
    return Array.from(this.segmenter.segment(value), part => part.segment);
  }

  private async encodeGif(directory: string, ffmpeg: string, fps: number): Promise<Buffer> {
    const output = join(directory, 'output.gif');
    const proc = Bun.spawn(
      [
        ffmpeg,
        '-y',
        '-hide_banner',
        '-loglevel', 'error',
        '-framerate', String(fps),
        '-i', join(directory, 'frame-%03d.png'),
        '-vf', 'split[s0][s1];[s0]palettegen=stats_mode=diff[p];[s1][p]paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle',
        '-loop', '0',
        output
      ],
      {
        stdout: 'ignore',
        stderr: 'pipe'
      }
    );

    const timeout = setTimeout(() => proc.kill(), 60_000);
    timeout.unref?.();

    const stderr = await new Response(proc.stderr).text();
    const exitCode = await proc.exited;
    clearTimeout(timeout);

    if (exitCode !== 0) {
      throw new DangerError(`Falha ao gerar o GIF animado: ${stderr.trim() || 'ffmpeg falhou.'}`);
    }

    return readFileSync(output);
  }
}

export const TtpService = new TtpServiceImpl();
