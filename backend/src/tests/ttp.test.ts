import { describe, expect, test } from 'bun:test';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { InvalidParameterError } from '@errors/index';
import { TtpService } from '@services/ttp.service';
import { TtpDTO } from '@apptypes/ttp.type';
import { ValidatorUtil } from '@utils/validator.util';

const BASE_DTO: TtpDTO = {
  text: 'Orbit 🎉🚀',
  textColor: '#fbbf24',
  backgroundColor: '#0f172a',
  position: 'center',
  fontSize: 64,
  effect: 'pulse',
  duration: 1,
  fps: 5
};

async function readPixels(png: Buffer): Promise<{ width: number; height: number; data: Uint8ClampedArray }> {
  const image = await loadImage(png);
  const canvas = createCanvas(image.width, image.height);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(image, 0, 0);
  return {
    width: image.width,
    height: image.height,
    data: ctx.getImageData(0, 0, image.width, image.height).data
  };
}

function isBackground(pixel: Uint8ClampedArray, offset: number, background: [number, number, number]): boolean {
  return Math.abs(pixel[offset] - background[0]) <= 8 &&
    Math.abs(pixel[offset + 1] - background[1]) <= 8 &&
    Math.abs(pixel[offset + 2] - background[2]) <= 8;
}

async function textBounds(png: Buffer): Promise<{ minX: number; maxX: number }> {
  const { width, height, data } = await readPixels(png);
  const background: [number, number, number] = [15, 23, 42];
  let minX = width;
  let maxX = 0;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 4;

      if (!isBackground(data, offset, background)) {
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
      }
    }
  }

  return { minX, maxX };
}

describe('TTP/ATTP com Canvas nativo', () => {
  test('Gera TTP PNG 512x512 com fundo, texto colorido e emoji', async () => {
    const png = await TtpService.generateTtp(BASE_DTO);
    const { width, height, data } = await readPixels(png);

    expect(png.subarray(1, 4).toString()).toBe('PNG');
    expect(png.length).toBeGreaterThan(5_000);
    expect(width).toBe(512);
    expect(height).toBe(512);

    const corner = 0;
    expect(data[corner]).toBe(15);
    expect(data[corner + 1]).toBe(23);
    expect(data[corner + 2]).toBe(42);

    let coloredPixels = 0;

    for (let offset = 0; offset < data.length; offset += 4) {
      if (data[offset] > 200 && data[offset + 1] > 140 && data[offset + 2] < 120) {
        coloredPixels += 1;
      }
    }

    expect(coloredPixels).toBeGreaterThan(100);
  }, 30_000);

  test('Respeita alinhamento left, center e right', async () => {
    const left = await textBounds(await TtpService.generateTtp({ ...BASE_DTO, position: 'left' }));
    const center = await textBounds(await TtpService.generateTtp({ ...BASE_DTO, position: 'center' }));
    const right = await textBounds(await TtpService.generateTtp({ ...BASE_DTO, position: 'right' }));

    expect(left.minX).toBeLessThan(center.minX);
    expect(right.maxX).toBeGreaterThan(center.maxX);
  }, 30_000);

  test('Aceita aliases em português e valida cores', () => {
    const dto = ValidatorUtil.validateTtpPayload({
      texto: 'Olá',
      corTexto: '#ffffff',
      corFundo: '#000000',
      posicao: 'left'
    });

    expect(dto.text).toBe('Olá');
    expect(dto.textColor).toBe('#ffffff');
    expect(dto.backgroundColor).toBe('#000000');
    expect(dto.position).toBe('left');

    expect(() => ValidatorUtil.validateTtpPayload({
      text: 'Olá',
      textColor: 'cor-invalida'
    })).toThrow(InvalidParameterError);
  });

  test('Gera ATTP GIF animado quando ffmpeg está disponível', async () => {
    if (!Bun.which('ffmpeg')) {
      console.warn('ffmpeg indisponível; teste de ATTP ignorado.');
      return;
    }

    const gif = await TtpService.generateAttp({
      ...BASE_DTO,
      effect: 'wave',
      duration: 1,
      fps: 6
    });

    expect(['GIF87a', 'GIF89a']).toContain(gif.subarray(0, 6).toString());
    expect(gif.readUInt16LE(6)).toBe(512);
    expect(gif.readUInt16LE(8)).toBe(512);
    expect(gif.length).toBeGreaterThan(5_000);
  }, 60_000);
});
