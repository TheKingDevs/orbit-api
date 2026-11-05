import { AppError } from './AppError';

export class InvalidParameterError extends AppError {
  public readonly details: any;

  constructor(message: string, details: any = null) {
    super(message, 422, 'InvalidParameterError');
    this.details = details;
  }
}
