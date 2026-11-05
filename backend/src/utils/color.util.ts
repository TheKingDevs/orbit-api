import { createCanvas } from '@napi-rs/canvas';
import { InvalidParameterError } from '@errors/index';

const SENTINEL = '#010203';

class ColorUtilImpl {
  private context: any;

  assertValid(value: string, field: string): string {
    const color = value.trim();

    if (!this.isValid(color)) {
      throw new InvalidParameterError(`A cor informada em "${field}" é inválida.`);
    }

    return color;
  }

  isValid(value: string): boolean {
    const color = value.trim();

    if (!color || color.length > 48 || /gradient|url\(|var\(|expression/i.test(color)) {
      return false;
    }

    const ctx = this.getContext();
    ctx.fillStyle = SENTINEL;
    ctx.fillStyle = color;

    const normalized = String(ctx.fillStyle).toLowerCase();
    return normalized !== SENTINEL || color.toLowerCase() === SENTINEL;
  }

  private getContext(): any {
    if (!this.context) {
      this.context = createCanvas(1, 1).getContext('2d');
    }

    return this.context;
  }
}

export const ColorUtil = new ColorUtilImpl();
