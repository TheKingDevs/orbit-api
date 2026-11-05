import { User } from '@models/User';

export interface IUserService {
  findByToken(token: string): User | undefined;
  addUser(user: User): User;
  deleteUserById(id: string): boolean;
  validateAndIncrementToken(token: string, req: Request, consumeToken?: boolean): User;
}
