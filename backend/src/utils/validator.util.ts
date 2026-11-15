import { DownloadSchema, DownloadRequestDTO } from '@apptypes/download.type';
import { CanvasSchema, CanvasDTO } from '@apptypes/canvas.type';
import { TtpSchema, TtpDTO } from '@apptypes/ttp.type';
import { TranscribeSchema, TranscribeDTO } from '@apptypes/transcribe.type';
import { StickerSchema, StickerDTO } from '@apptypes/sticker.type';
import { CreateUserSchema, CreateUserDTO } from '@apptypes/user.type';
import {
  AudioSummarizeOptionsSchema,
  AudioSummarizeOptionsDTO,
  OcrSchema,
  OcrDTO,
  SummarizeSchema,
  SummarizeDTO
} from '@apptypes/ai.type';
import { InvalidParameterError } from '@errors/index';

export class ValidatorUtil {
  static validateDownloadPayload(body: any): DownloadRequestDTO {
    const result = DownloadSchema.safeParse(body);
    if (!result.success) {
      const formattedErrors = result.error.issues.map(err => ({
        field: err.path.join('.'),
        message: err.message
      }));
      throw new InvalidParameterError('Parâmetros de download inválidos.', formattedErrors);
    }
    return result.data;
  }

  static validateCanvasPayload(query: any): CanvasDTO {
    const result = CanvasSchema.safeParse(query);
    if (!result.success) {
      const formattedErrors = result.error.issues.map(err => ({
        field: err.path.join('.'),
        message: err.message
      }));
      throw new InvalidParameterError('Parâmetros do Canvas inválidos.', formattedErrors);
    }
    return result.data;
  }

  static validateTtpPayload(query: any): TtpDTO {
    const result = TtpSchema.safeParse(query);
    if (!result.success) {
      const formattedErrors = result.error.issues.map(err => ({
        field: err.path.join('.'),
        message: err.message
      }));
      throw new InvalidParameterError('Parâmetros do TTP/ATTP inválidos.', formattedErrors);
    }
    return result.data;
  }

  static validateTranscribePayload(payload: any): TranscribeDTO {
    const result = TranscribeSchema.safeParse(payload);
    if (!result.success) {
      const formattedErrors = result.error.issues.map(err => ({
        field: err.path.join('.'),
        message: err.message
      }));
      throw new InvalidParameterError('Parâmetros de transcrição inválidos.', formattedErrors);
    }
    return result.data;
  }

  static validateOcrPayload(payload: any): OcrDTO {
    const result = OcrSchema.safeParse(payload);
    if (!result.success) {
      const formattedErrors = result.error.issues.map(err => ({
        field: err.path.join('.'),
        message: err.message
      }));
      throw new InvalidParameterError('Parâmetros de OCR inválidos.', formattedErrors);
    }
    return result.data;
  }

  static validateSummarizePayload(payload: any): SummarizeDTO {
    const result = SummarizeSchema.safeParse(payload);
    if (!result.success) {
      const formattedErrors = result.error.issues.map(err => ({
        field: err.path.join('.'),
        message: err.message
      }));
      throw new InvalidParameterError('Parâmetros de resumo inválidos.', formattedErrors);
    }
    return result.data;
  }

  static validateAudioSummarizeOptions(payload: any): AudioSummarizeOptionsDTO {
    const result = AudioSummarizeOptionsSchema.safeParse(payload);
    if (!result.success) {
      const formattedErrors = result.error.issues.map(err => ({
        field: err.path.join('.'),
        message: err.message
      }));
      throw new InvalidParameterError('Opções de resumo inválidas.', formattedErrors);
    }
    return result.data;
  }

  static validateStickerPayload(payload: any): StickerDTO {
    const result = StickerSchema.safeParse(payload);
    if (!result.success) {
      const formattedErrors = result.error.issues.map(err => ({
        field: err.path.join('.'),
        message: err.message
      }));
      throw new InvalidParameterError('Parâmetros do sticker inválidos.', formattedErrors);
    }
    return result.data;
  }

  static validateUserCreation(body: any): CreateUserDTO {
    const result = CreateUserSchema.safeParse(body);
    if (!result.success) {
      const formattedErrors = result.error.issues.map(err => ({
        field: err.path.join('.'),
        message: err.message
      }));
      throw new InvalidParameterError('Dados do usuário inválidos.', formattedErrors);
    }
    return result.data;
  }
}
