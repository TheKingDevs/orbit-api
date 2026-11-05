import { GlobalFonts } from '@napi-rs/canvas';
import { existsSync } from 'fs';
import { resolve } from 'path';
import { Logger } from '@utils/logger';

type FontWeight = 'normal' | 'bold';

const TEXT_FAMILY = 'Orbit Sans';
const EMOJI_FAMILY = 'Orbit Emoji';

class FontUtilImpl {
  private configured = false;
  private stack = 'sans-serif';
  private emojiRegistered = false;

  getFont(size: number, weight: FontWeight = 'normal'): string {
    this.configure();
    return `${weight === 'bold' ? 'bold ' : ''}${size}px ${this.stack}`;
  }

  getStack(): string {
    this.configure();
    return this.stack;
  }

  getEmojiFamily(): string {
    this.configure();
    return this.emojiRegistered ? EMOJI_FAMILY : 'sans-serif';
  }

  configure(): void {
    if (this.configured) return;
    this.configured = true;

    this.registerTextFonts();
    this.registerEmojiFont();
  }

  private registerTextFonts(): void {
    const assetDir = this.findAssetDir();
    const pairs: Array<[string, string]> = [];

    if (assetDir) {
      pairs.push([
        resolve(assetDir, 'Roboto-Regular.ttf'),
        resolve(assetDir, 'Roboto-Bold.ttf')
      ]);
    }

    pairs.push(
      ['/system/fonts/Roboto-Regular.ttf', '/system/fonts/Roboto-Bold.ttf'],
      ['/system/fonts/DroidSans.ttf', '/system/fonts/DroidSans-Bold.ttf'],
      ['/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'],
      ['/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf', '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf'],
      ['/usr/share/fonts/TTF/DejaVuSans.ttf', '/usr/share/fonts/TTF/DejaVuSans-Bold.ttf']
    );

    for (const [regularPath, boldPath] of pairs) {
      if (!existsSync(regularPath)) continue;

      try {
        GlobalFonts.registerFromPath(regularPath, TEXT_FAMILY);

        if (existsSync(boldPath)) {
          GlobalFonts.registerFromPath(boldPath, TEXT_FAMILY);
        }

        this.stack = 'Orbit Sans';
        return;
      } catch (error) {
        Logger.warning(`Falha ao registrar fonte ${regularPath}.`, 'FontUtil');
      }
    }

    for (const regularPath of pairs.map(([regularPath]) => regularPath)) {
      if (!existsSync(regularPath)) continue;

      try {
        GlobalFonts.registerFromPath(regularPath, TEXT_FAMILY);
        this.stack = 'Orbit Sans';
        return;
      } catch (error) {
        Logger.warning(`Falha ao registrar fonte ${regularPath}.`, 'FontUtil');
      }
    }
  }

  private registerEmojiFont(): void {
    const assetDir = this.findAssetDir();
    const candidates: string[] = [];

    if (assetDir) {
      candidates.push(resolve(assetDir, 'NotoColorEmoji.ttf'));
    }

    candidates.push(
      '/system/fonts/NotoColorEmoji.ttf',
      '/usr/share/fonts/truetype/noto/NotoColorEmoji.ttf',
      '/usr/share/fonts/noto/NotoColorEmoji.ttf'
    );

    for (const emojiPath of candidates) {
      if (!existsSync(emojiPath)) continue;

      try {
        GlobalFonts.registerFromPath(emojiPath, EMOJI_FAMILY);
        this.emojiRegistered = true;
        this.stack = `${this.stack}, ${EMOJI_FAMILY}`;
        break;
      } catch (error) {
        Logger.warning(`Falha ao registrar fonte de emoji ${emojiPath}.`, 'FontUtil');
      }
    }

    if (!this.stack.includes('sans-serif')) {
      this.stack = `${this.stack}, sans-serif`;
    }
  }

  private findAssetDir(): string | undefined {
    const candidates = [
      resolve(process.cwd(), 'assets/fonts'),
      resolve(import.meta.dir, '../assets/fonts'),
      resolve(import.meta.dir, '../../assets/fonts')
    ];

    return candidates.find(path => existsSync(path));
  }
}

export const FontUtil = new FontUtilImpl();
