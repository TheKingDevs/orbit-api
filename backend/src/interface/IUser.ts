import { User } from '@models/User';

export interface IUserService {
  findByApiKey(apiKey: string): User | undefined;
  findByToken(token: string): User | undefined;
  addUser(user: User): Promise<User>;
  deleteUserById(id: string): Promise<boolean>;
  validateAndIncrementApiKey(apiKey: string, req: Request, consumeToken?: boolean): User;
  validateAndIncrementToken(token: string, req: Request, consumeToken?: boolean): User;
}
