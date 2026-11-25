import { describe, expect, test, beforeEach, afterEach } from 'bun:test';
import { youtubeSearchDirect } from '@services/youtube.service';

const originalFetch = globalThis.fetch;

const SAMPLE_HTML = `
<html><body><script>
var ytInitialData = {
  "contents": {
    "twoColumnSearchResultsRenderer": {
      "primaryContents": {
        "sectionListRenderer": {
          "contents": [
            {
              "itemSectionRenderer": {
                "contents": [
                  {
                    "videoRenderer": {
                      "videoId": "abc12345678",
                      "title": { "runs": [ { "text": "Test Video" } ] },
                      "descriptionSnippet": { "runs": [ { "text": "A test description" } ] },
                      "lengthText": { "simpleText": "3:21" },
                      "viewCountText": { "simpleText": "1.234.567 visualizações" },
                      "publishedTimeText": { "simpleText": "há 2 dias" },
                      "ownerText": { "runs": [ { "text": "Test Channel", "navigationEndpoint": { "commandMetadata": { "webCommandMetadata": { "url": "/@testchannel" } } } } ] },
                      "thumbnail": { "thumbnails": [ { "url": "https://i.ytimg.com/vi/abc12345678/hqdefault.jpg", "width": 480, "height": 360 } ] }
                    }
                  },
                  {
                    "videoRenderer": {
                      "videoId": "def98765432",
                      "title": { "runs": [ { "text": "Second Video" } ] },
                      "lengthText": { "simpleText": "10:05" },
                      "viewCountText": { "simpleText": "2 mil visualizações" },
                      "publishedTimeText": { "simpleText": "há 1 ano" },
                      "ownerText": { "runs": [ { "text": "Other" } ] },
                      "thumbnail": { "thumbnails": [ { "url": "//i.ytimg.com/vi/def98765432/hqdefault.jpg" } ] }
                    }
                  }
                ]
              }
            }
          ]
        }
      }
    }
  }
};
</script></body></html>
`;

describe('youtubeSearchDirect', () => {
  beforeEach(() => {
    globalThis.fetch = (async () => new Response(SAMPLE_HTML, { status: 200, headers: { 'content-type': 'text/html' } })) as any;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  test('retorna resultados normalizados com campos necessários para play/ytdlp', async () => {
    const res = await youtubeSearchDirect('test query');
    expect(res.status).toBe(200);
    expect(res.query).toBe('test query');
    expect(res.total).toBe(2);
    expect(res.resultados.length).toBe(2);
    expect(res.data).toBe(res.resultados);
    expect(res.results).toBe(res.resultados);

    const first = res.resultados[0];
    expect(first.id).toBe('abc12345678');
    expect(first.tipo).toBe('video');
    expect(first.url).toBe('https://www.youtube.com/watch?v=abc12345678');
    expect(first.link).toBe(first.url);
    expect(first.titulo).toBe('Test Video');
    expect(first.title).toBe('Test Video');
    expect(first.canal).toBe('Test Channel');
    expect(first.author).toBe('Test Channel');
    expect(first.autor.nome).toBe('Test Channel');
    expect(first.duracao).toBe('3:21');
    expect(first.segundos).toBe(201);
    expect(first.views).toBe(1234567);
    expect(first.publicado).toBe('há 2 dias');
    expect(first.thumbnail).toContain('abc12345678');
    expect(first.imagen).toBe(first.thumbnail);
    expect(Array.isArray(first.thumbnails)).toBe(true);
  });

  test('normaliza thumbnail protocol-relative e view count abreviado', async () => {
    const res = await youtubeSearchDirect('test');
    const second = res.resultados[1];
    expect(second.thumbnail.startsWith('https:')).toBe(true);
    expect(second.views).toBe(2000);
    expect(second.segundos).toBe(605);
  });

  test('query vazia retorna resposta vazia sem fetch externo real', async () => {
    globalThis.fetch = (async () => { throw new Error('should not fetch'); }) as any;
    const res = await youtubeSearchDirect('   ');
    expect(res.total).toBe(0);
    expect(res.resultados).toEqual([]);
  });
});
