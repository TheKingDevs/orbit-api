import { describe, expect, test } from 'bun:test';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { ForbiddenError, InvalidParameterError } from '@errors/index';
import { canvasEffectsRoute } from '@routes/api/canvas/effects';
import { stickerAttpRoute } from '@routes/api/sticker/attp';
import { canvasEffectsRoute as stickerRoute } from '@routes/api/canvas/effects';
import { stickerTtpRoute } from '@routes/api/sticker/ttp';
import { publicWelcomeRoute } from '@routes/public/welcome';
import { FfmpegService } from '@services/ffmpeg.service';
import { ValidatorUtil } from '@utils/validator.util';

const TOKEN = 'secret-admin-token';
const SOURCE_WIDTH = 64;
const SOURCE_HEIGHT = 32;

function makeImage(width = SOURCE_WIDTH, height = SOURCE_HEIGHT): Buffer {
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ff0000';
  ctx.fillRect(0, 0, width / 2, height);
  ctx.fillStyle = '#0000ff';
  ctx.fillRect(width / 2, 0, width / 2, height);
  return canvas.toBuffer('image/png');
}

function makeCheckerboard(size = 64): Buffer {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      ctx.fillStyle = (x + y) % 2 === 0 ? '#ff0000' : '#0000ff';
      ctx.fillRect(x, y, 1, 1);
    }
  }

  return canvas.toBuffer('image/png');
}

async function readPixels(buffer: Buffer) {
  const image = await loadImage(buffer);
  const canvas = createCanvas(image.width, image.height);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(image, 0, 0);
  return {
    width: image.width,
    height: image.height,
    data: ctx.getImageData(0, 0, image.width, image.height).data
  };
}

function pixel(data: Uint8ClampedArray, width: number, x: number, y: number): number[] {
  const offset = (y * width + x) * 4;
  return [data[offset], data[offset + 1], data[offset + 2], data[offset + 3]];
}

const SOURCE = makeImage();

describe('StickerSchema', () => {
  test('Normaliza efeitos e aliases em português', () => {
    const dto = ValidatorUtil.validateStickerPayload({
      efeitos: 'espelhar, cinza',
      filtros: ['pixelar', 'ampliar'],
      url: 'https://example.com/image.png',
      formato: 'WEBP',
      tamanho: '512',
      direcao: 'vertical',
      pixelSize: '24',
      escala: '1.5'
    });

    expect(dto.effects).toEqual(['mirror', 'gray', 'pixel', 'upscale']);
    expect(dto.url).toBe('https://example.com/image.png');
    expect(dto.format).toBe('webp');
    expect(dto.size).toBe(512);
    expect(dto.mirrorDirection).toBe('vertical');
    expect(dto.pixelSize).toBe(24);
    expect(dto.upscaleFactor).toBe(1.5);
  });

  test('Rejeita efeito e formato desconhecidos', () => {
    expect(() => ValidatorUtil.validateStickerPayload({ effect: 'nope' }))
      .toThrow(InvalidParameterError);
    expect(() => ValidatorUtil.validateStickerPayload({ format: 'gif' }))
      .toThrow(InvalidParameterError);
  });
});

describe('FfmpegService', () => {
  test('invert, gray e blur alteram os pixels', async () => {
    const inverted = await readPixels(await FfmpegService.invert(SOURCE, { format: 'png' }));
    const [ir, ig, ib] = pixel(inverted.data, inverted.width, 5, 5);
    expect(ir).toBeLessThan(50);
    expect(ig).toBeGreaterThan(200);
    expect(ib).toBeGreaterThan(200);

    const gray = await readPixels(await FfmpegService.gray(SOURCE, { format: 'png' }));
    const [gr, gg, gb] = pixel(gray.data, gray.width, 5, 5);
    expect(Math.abs(gr - gg)).toBeLessThan(10);
    expect(Math.abs(gg - gb)).toBeLessThan(10);

    const blurred = await readPixels(await FfmpegService.blur(SOURCE, { format: 'png', blurRadius: 8 }));
    const [br, , bb] = pixel(blurred.data, blurred.width, 28, 16);
    expect(br).toBeGreaterThan(0);
    expect(bb).toBeGreaterThan(0);
  }, 30_000);

  test('mirror horizontal e vertical', async () => {
    const horizontal = await readPixels(await FfmpegService.mirror(SOURCE, {
      format: 'png',
      mirrorDirection: 'horizontal'
    }));
    const [hr, , hb] = pixel(horizontal.data, horizontal.width, 5, 5);
    expect(hb).toBeGreaterThan(200);
    expect(hr).toBeLessThan(50);

    const vertical = await readPixels(await FfmpegService.mirror(SOURCE, {
      format: 'png',
      mirrorDirection: 'vertical'
    }));
    const [vr, , vb] = pixel(vertical.data, vertical.width, 5, 5);
    expect(vr).toBeGreaterThan(200);
    expect(vb).toBeLessThan(50);
  }, 30_000);

  test('circle aplica alpha transparente nos cantos e mantém o centro opaco', async () => {
    const output = await readPixels(await FfmpegService.circle(SOURCE, { format: 'png', size: 64 }));
    expect(output.width).toBe(64);
    expect(output.height).toBe(64);
    expect(pixel(output.data, output.width, 0, 0)[3]).toBe(0);
    expect(pixel(output.data, output.width, 63, 0)[3]).toBe(0);
    expect(pixel(output.data, output.width, 32, 32)[3]).toBe(255);
  }, 30_000);

  test('pixel reduz detalhes e upscale aumenta a resolução', async () => {
    const pixelated = await readPixels(await FfmpegService.pixel(makeCheckerboard(), {
      format: 'png',
      pixelSize: 8
    }));
    expect(pixelated.width).toBe(64);
    expect(pixelated.height).toBe(64);

    const first = pixel(pixelated.data, pixelated.width, 0, 0);
    const second = pixel(pixelated.data, pixelated.width, 1, 0);
    expect(first.slice(0, 3)).toEqual(second.slice(0, 3));

    const upscaled = await readPixels(await FfmpegService.upscale(SOURCE, {
      format: 'png',
      upscaleFactor: 2
    }));
    expect(upscaled.width).toBe(SOURCE_WIDTH * 2);
    expect(upscaled.height).toBe(SOURCE_HEIGHT * 2);
  }, 30_000);

  test('Gera WebP com efeitos combinados', async () => {
    const webp = await FfmpegService.process(SOURCE, ['circle', 'gray'], {
      format: 'webp',
      size: 64
    });
    const output = await readPixels(webp);

    expect(webp.subarray(0, 4).toString()).toBe('RIFF');
    expect(webp.subarray(8, 12).toString()).toBe('WEBP');
    expect(output.width).toBe(64);
    expect(output.height).toBe(64);
    expect(pixel(output.data, output.width, 0, 0)[3]).toBe(0);
  }, 30_000);
});
