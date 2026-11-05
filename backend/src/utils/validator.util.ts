import { DownloadSchema, DownloadRequestDTO } from '@types/download.type';
import { CanvasSchema, CanvasDTO } from '@types/canvas.type';
import { TtpSchema, TtpDTO } from '@types/ttp.type';
import { TranscribeSchema, TranscribeDTO } from '@types/transcribe.type';
import { StickerSchema, StickerDTO } from '@types/sticker.type';
import { CreateUserSchema, CreateUserDTO } from '@types/user.type';
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
