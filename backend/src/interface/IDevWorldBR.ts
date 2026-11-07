import { SdkResponse } from '@types/devworldbr.type';

export interface IDevWorldBRService {
  shazam(audioUrl: string | undefined | null): Promise<SdkResponse>;
  gpt(query: string | undefined | null): Promise<SdkResponse>;
  groq(query: string | undefined | null): Promise<SdkResponse>;
  gemini(query: string | undefined | null): Promise<SdkResponse>;
  ytSearch(query: string | undefined | null): Promise<SdkResponse>;
  ytSearchV2(query: string | undefined | null): Promise<SdkResponse>;
  tiktokImages(url: string | undefined | null): Promise<SdkResponse>;
  kwai(url: string | undefined | null): Promise<SdkResponse>;
  pinterest(queryOrUrl: string | undefined | null): Promise<SdkResponse>;
  facebook(url: string | undefined | null): Promise<SdkResponse>;
  soundcloud(url: string | undefined | null): Promise<SdkResponse>;
}
