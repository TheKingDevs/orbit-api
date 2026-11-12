import { AppError } from './AppError';

export class AccountSuspendedError extends AppError {
  constructor(message: string, permanent: boolean = false) {
    super(message, 403, permanent ? 'PermanentSuspension' : 'AccountSuspended');
  }
}
