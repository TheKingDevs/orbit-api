export abstract class AppError extends Error {
  public readonly statusCode: number;
  public readonly errorType: string;

  constructor(message: string, statusCode: number = 400, errorType: string = 'AppError') {
    super(message);
    this.statusCode = statusCode;
    this.errorType = errorType;
    this.name = this.constructor.name;
  }
}
