import { afterEach, describe, expect, test } from 'bun:test';
import { shazamRoute } from '@routes/api/ai/shazam';
import { devWorldBRService } from '@services/devworldbr.service';
import { ShazamUploadService } from '@services/shazam-upload.service';
import { db } from '@utils/db.util';

const apiKey = db.getAllUsers().find(user => user.role === 'public')?.apiKey || 'public-token';
const originalUrlRecognize = devWorldBRService.shazam;
const originalFileRecognize = ShazamUploadService.recognize;

afterEach(() => {
  devWorldBRService.shazam = originalUrlRecognize;
  ShazamUploadService.recognize = originalFileRecognize;
});

describe('Endpoint /api/ai/shazam', () => {
  test('reconhece áudio pela URL com serviço externo isolado', async () => {
    const audioUrl = 'https://media.example.com/audio.mp3';
    let receivedUrl = '';
    devWorldBRService.shazam = async (url: string) => {
      receivedUrl = url;
      return { title: 'Faixa de teste' };
    };

    const req = new Request(`http://localhost/api/ai/shazam?audioUrl=${encodeURIComponent(audioUrl)}`, {
      headers: { 'x-apikey': apiKey }
    });
    const response = await shazamRoute(req, new URL(req.url));

    expect(response.status).toBe(200);
    expect(receivedUrl).toBe(audioUrl);
    expect(await response.json()).toEqual({ title: 'Faixa de teste' });
  });

  test('reconhece arquivo multipart com serviço externo isolado', async () => {
    let receivedBytes: number[] = [];
    ShazamUploadService.recognize = async (data: Uint8Array) => {
      receivedBytes = Array.from(data);
      return { title: 'Faixa enviada' };
    };

    const form = new FormData();
    form.set('file', new File([new Uint8Array([1, 2, 3, 4])], 'audio.mp3', { type: 'audio/mpeg' }));
    const req = new Request('http://localhost/api/ai/shazam', {
      method: 'POST',
      headers: { 'x-apikey': apiKey },
      body: form
    });
    const response = await shazamRoute(req, new URL(req.url));

    expect(response.status).toBe(200);
    expect(receivedBytes).toEqual([1, 2, 3, 4]);
    expect(await response.json()).toEqual({ title: 'Faixa enviada' });
  });
});
