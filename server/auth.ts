import jwt from 'jsonwebtoken';
import crypto from 'crypto-js';
import { randomUUID } from 'crypto';
import { storage } from './storage';
import type { User } from '@shared/schema';

// Environment variables
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'your-super-secret-encryption-key-change-in-production';

export interface AuthPayload {
  userId: string;
  email: string;
  role: string;
  companyId: string;
  sessionId: string;
  isOwner?: boolean;
}

export interface LoginResult {
  user: Omit<User, 'password'>;
  token: string;
  expiresAt: Date;
}

/**
 * Generate a secure JWT token for the user
 */
export function generateToken(user: User, userCompany: any, sessionId: string): string {
  const payload: AuthPayload = {
    userId: user.id,
    email: user.email,
    role: userCompany.role,
    companyId: userCompany.companyId,
    sessionId,
    isOwner: userCompany.isOwner || false
  };

  return jwt.sign(payload, JWT_SECRET, { 
    expiresIn: '24h',
    issuer: 'fiv-app',
    subject: user.id
  });
}

/**
 * Verify and decode a JWT token
 */
export function verifyToken(token: string): AuthPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthPayload;
    return decoded;
  } catch (error) {
    return null;
  }
}

/**
 * Encrypt sensitive data (like API keys)
 */
export function encryptData(data: string): string {
  return crypto.AES.encrypt(data, ENCRYPTION_KEY).toString();
}

/**
 * Decrypt sensitive data
 */
export function decryptData(encryptedData: string): string {
  const bytes = crypto.AES.decrypt(encryptedData, ENCRYPTION_KEY);
  return bytes.toString(crypto.enc.Utf8);
}

/**
 * Authenticate user and create session (Multi-tenant)
 */
export async function authenticateUser(
  email: string, 
  password: string, 
  companyId?: string,
  ipAddress?: string, 
  userAgent?: string
): Promise<LoginResult | null> {
  const result = await storage.authenticateUserMultiTenant(email, password, companyId);
  if (!result) return null;

  const { user, userCompany, company } = result;

  // Create session
  const sessionId = randomUUID();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now
  const token = generateToken(user, userCompany, sessionId);

  await storage.createSession({
    userId: user.id,
    token,
    ipAddress,
    userAgent,
    expiresAt
  });

  // Remove password from response
  const { password: _, ...userWithoutPassword } = user;

  return {
    user: {
      ...userWithoutPassword,
      company
    },
    token,
    expiresAt
  };
}

/**
 * Logout user by removing session
 */
export async function logoutUser(token: string): Promise<boolean> {
  return await storage.deleteSession(token);
}

/**
 * Validate session and get user
 */
export async function validateSession(token: string): Promise<{ user: Omit<User, 'password'>; session: any } | null> {
  // First verify the JWT
  const payload = verifyToken(token);
  if (!payload) return null;

  // Check if session exists in database
  const session = await storage.getSession(token);
  if (!session) return null;

  // Get user
  const user = await storage.getUser(payload.userId);
  if (!user) return null;

  // Remove password from response
  const { password: _, ...userWithoutPassword } = user;

  return {
    user: userWithoutPassword,
    session
  };
}

/**
 * Middleware function to protect routes
 */
export async function requireAuth(req: any, res: any, next: any) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authorization token required' });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    const validation = await validateSession(token);
    
    if (!validation) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // Add user and session to request object
    req.user = validation.user;
    req.session = validation.session;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Authentication failed' });
  }
}

/**
 * Middleware to check user role
 */
export function requireRole(roles: string[]) {
  return (req: any, res: any, next: any) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
}

/**
 * Generate a secure password
 */
export function generateSecurePassword(length: number = 12): string {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return password;
}