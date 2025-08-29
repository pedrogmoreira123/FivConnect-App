import type { User, Session } from '@shared/schema';

declare global {
  namespace Express {
    interface Request {
      user?: Omit<User, 'password'>;
      session?: Session;
    }
  }
}

export {};