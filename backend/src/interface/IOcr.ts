import type { TranscribeLanguage } from '@types/transcribe.type';

export interface OcrResult {
  text: string;
  language: string;
}

export interface IOcrService {
  recognize(data: Uint8Array, language: TranscribeLanguage): Promise<OcrResult>;
}
