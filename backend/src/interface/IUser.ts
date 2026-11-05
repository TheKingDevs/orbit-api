import { User } from '@models/User';

export interface IUserService {
  findByToken(token: string): User | undefined;
  addUser(user: User): Promise<User>;
  deleteUserById(id: string): Promise<boolean>;
  validateAndIncrementToken(token: string, req: Request, consumeToken?: boolean): User;
}
