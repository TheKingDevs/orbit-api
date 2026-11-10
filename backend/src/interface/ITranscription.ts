import { TranscribeLanguage, TranscriptionResult } from '@types/transcribe.type';

export interface TranscriptionInput {
  data: Uint8Array | ArrayBuffer;
  filename?: string;
  mimeType?: string;
}

export interface AudioUploadPayload {
  languageInput: Record<string, unknown>;
  input: TranscriptionInput;
}

export interface TranscriptionEngineResult {
  text: string;
  language: string;
}

export interface ITranscriptionEngine {
  transcribe(
    samples: Float32Array,
    sampleRate: number,
    language: TranscribeLanguage
  ): Promise<TranscriptionEngineResult>;
}

export interface ITranscriptionService {
  transcribe(input: TranscriptionInput, language: TranscribeLanguage): Promise<TranscriptionResult>;
}
