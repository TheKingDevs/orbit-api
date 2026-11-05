import { AppError } from './AppError';

export class DangerError extends AppError {
  constructor(message: string, statusCode: number = 500) {
    super(message, statusCode, 'DangerError');
  }
}
