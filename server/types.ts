import type { User, Session, Company } from '@shared/schema';

export interface AuthenticatedUser extends Omit<User, 'password'> {
  companyId: string;
  company?: Company;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      session?: Session;
    }
  }
}

export {};
export {};
export {};
export {};
export {};
export {};
export {};
export {};
export {};