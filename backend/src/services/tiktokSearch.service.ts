import { AppError, WarningError } from '@errors/index';
import { devWorldBRService } from '@services/devworldbr.service';

export interface TikTokVideoResult {
  id: string;
  title: string;
  author: string;
  duration: number;
  webpageUrl: string;
  downloadUrl: string;
  thumbnail: string;
}

export class TikTokSearchService {
  static async searchVideos(query: string): Promise<TikTokVideoResult[]> {
    try {
      const text = query.trim().slice(0, 500);
      if (!text) throw new WarningError('Informe o termo de busca.');
      const response: any = await devWorldBRService.ytSearch(text);
      const entries = Array.isArray(response?.data) ? response.data : Array.isArray(response?.results) ? response.results : [];
      const results = entries.slice(0, 5).map((entry: any) => {
        const webpageUrl = entry?.link || entry?.url || '';
        let downloadUrl = '';
        if (webpageUrl) {
          try {
            downloadUrl = devWorldBRService.youtubeMediaSource(webpageUrl, 'video');
          } catch {}
        }
        return {
          id: String(entry?.videoId || entry?.id || ''),
          title: String(entry?.titulo || entry?.title || 'Sem título'),
          author: String(entry?.autor?.nome || entry?.canal || entry?.author || 'Desconhecido'),
          duration: Number(entry?.segundos || entry?.duration || 0),
          webpageUrl,
          downloadUrl,
          thumbnail: String(entry?.imagen || entry?.thumbnail || '')
        };
      });
      if (results.length === 0) throw new WarningError('Nenhum vídeo foi encontrado para o termo pesquisado.');
      return results;
    } catch (error: any) {
      if (error instanceof WarningError) throw error;
      throw new AppError('Erro ao processar a busca de vídeos.', 502);
    }
  }
}
