export interface SdkResponse {
  status?: number | boolean;
  [key: string]: unknown;
}

export interface SdkUrlDTO {
  url: string;
}

export interface SdkQueryDTO {
  query: string;
}

export interface ShazamDTO {
  audioUrl: string;
}
