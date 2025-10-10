/**
 * Tipos para Socket.io
 */

import { Socket } from 'socket.io';

export interface AuthenticatedSocket extends Socket {
  userId: string;
  companyId: string;
}

declare module 'socket.io' {
  interface Socket {
    userId: string;
    companyId: string;
  }
}

