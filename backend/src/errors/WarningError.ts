import { AppError } from './AppError';

export class WarningError extends AppError {
  constructor(message: string, statusCode: number = 400) {
    super(message, statusCode, 'WarningError');
  }
}
