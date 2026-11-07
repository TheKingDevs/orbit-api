import { AppError, WarningError } from "@errors/index";
import { $ } from "bun";

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
      const searchCommand = `yt-dlp "ytsearch5:${query}" --dump-json --no-playlist --skip-download`;
      const proc = await $`${{ raw: searchCommand }}`.text();
      
      const lines = proc.trim().split("\n").filter(Boolean);
      const results: TikTokVideoResult[] = [];

      for (const line of lines) {
        try {
          const data = JSON.parse(line);
          results.push({
            id: data.id || "",
            title: data.title || data.description || "Sem título",
            author: data.uploader || data.channel || "Desconhecido",
            duration: data.duration || 0,
            webpageUrl: data.webpage_url || data.original_url || "",
            downloadUrl: data.url || data.formats?.[0]?.url || "",
            thumbnail: data.thumbnail || ""
          });
        } catch (e) {
          // Ignora linhas que não sejam JSON válidos
        }
      }

      if (results.length === 0) {
        throw new WarningError("Nenhum vídeo do TikTok foi encontrado para o termo pesquisado.");
      }

      return results;
    } catch (error: any) {
      if (error instanceof WarningError) throw error;
      throw new AppError(`Erro ao processar busca no TikTok: ${error.message}`, 500);
    }
  }
}
