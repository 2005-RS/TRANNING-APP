import { AuthenticatedUser } from '../../modules/auth/types/authenticated-user';

export {};

declare global {
  namespace Express {
    interface Request {
      requestId: string;
      user?: AuthenticatedUser;
    }
  }
}
