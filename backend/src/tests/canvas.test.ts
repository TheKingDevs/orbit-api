import { describe, expect, test } from 'bun:test';
import { CanvasService } from '@services/canvas.service';

describe('CanvasService (@napi-rs/canvas)', () => {
  test('Deve renderizar Título e Subtítulo padrão com sucesso', async () => {
    const buffer = await CanvasService.generateWelcomeCard({
      username: 'Ornit',
      avatarUrl: undefined,
      bgUrl: undefined
    });
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);
  });
});
