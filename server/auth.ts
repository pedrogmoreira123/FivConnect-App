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
  username: string;
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
  // Use user.role for superadmin, otherwise use userCompany.role
  const effectiveRole = user.role === 'superadmin' ? 'superadmin' : userCompany.role;
  
  const payload: AuthPayload = {
    userId: user.id,
    username: user.username,
    email: user.email,
    role: effectiveRole,
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
    console.log('🔍 [BACKEND] verifyToken - Verificando JWT com secret:', JWT_SECRET ? 'DEFINIDO' : 'NÃO DEFINIDO');
    const decoded = jwt.verify(token, JWT_SECRET) as AuthPayload;
    console.log('✅ [BACKEND] verifyToken - JWT verificado com sucesso:', {
      userId: decoded.userId,
      username: decoded.username,
      role: decoded.role,
      companyId: decoded.companyId
    });
    return decoded;
  } catch (error) {
    console.log('❌ [BACKEND] verifyToken - Erro na verificação JWT:', error.message);
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
 * Validate WhatsApp webhook signature using HMAC-SHA256
 */
export function validateWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  try {
    // WhatsApp sends signature as 'sha256=<hash>'
    const expectedSignature = `sha256=${crypto.HmacSHA256(payload, secret).toString()}`;
    
    // Use timingSafeEqual equivalent for constant-time comparison
    return expectedSignature.length === signature.length && 
           expectedSignature === signature;
  } catch (error) {
    console.error('Webhook signature validation error:', error);
    return false;
  }
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
      company: company
    } as any,
    token,
    expiresAt
  };
}

/**
 * Authenticate user by username and create session (Multi-tenant)
 */
export async function authenticateUserByUsername(
  username: string, 
  password: string, 
  companyId?: string,
  ipAddress?: string, 
  userAgent?: string
): Promise<LoginResult | null> {
  const result = await storage.authenticateUserMultiTenantByUsername(username, password, companyId);
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
      company: company
    } as any,
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
  console.log('🔍 [BACKEND] validateSession - Iniciando validação do token:', token.substring(0, 20) + '...');
  
  // First verify the JWT
  const payload = verifyToken(token);
  console.log('🔍 [BACKEND] validateSession - JWT payload decodificado:', !!payload);
  if (!payload) {
    console.log('❌ [BACKEND] validateSession - JWT inválido ou expirado');
    return null;
  }

  // Check if session exists in database
  const session = await storage.getSession(token);
  console.log('🔍 [BACKEND] validateSession - Sessão encontrada no banco:', !!session);
  if (!session) {
    console.log('❌ [BACKEND] validateSession - Sessão não encontrada ou expirada');
    return null;
  }

  // Get user
  const user = await storage.getUser(payload.userId);
  console.log('🔍 [BACKEND] validateSession - Usuário encontrado:', !!user);
  if (!user) {
    console.log('❌ [BACKEND] validateSession - Usuário não encontrado');
    return null;
  }

  // Remove password from response
  const { password: _, ...userFromDb } = user;

  // Lógica Corrigida: Mescla os dados do banco com os dados do token,
  // garantindo que as informações da sessão atual (payload) prevaleçam.
  const finalUser = {
    ...userFromDb,
    id: payload.userId,
    companyId: payload.companyId,
    role: payload.role,
  };

  console.log('✅ [BACKEND] validateSession - Validação completa bem-sucedida para usuário:', user.id);
  console.log('🔍 [BACKEND] validateSession - CompanyId preservado do JWT:', payload.companyId);
  console.log('🔍 [BACKEND] validateSession - User final com companyId:', {
    userId: finalUser.id,
    role: finalUser.role,
    companyId: finalUser.companyId
  });
  return {
    user: finalUser,
    session
  };
}

/**
 * Middleware function to protect routes
 */
export async function requireAuth(req: any, res: any, next: any) {
  try {
    const authHeader = req.headers.authorization;
    
    // LOG DE DIAGNÓSTICO 1: Verificar cabeçalho recebido
    console.log('🔍 [BACKEND] requireAuth - Cabeçalho recebido:', authHeader);
    console.log('🔍 [BACKEND] requireAuth - URL:', req.url, 'Method:', req.method);
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ [BACKEND] requireAuth - Cabeçalho ausente ou mal formatado');
      return res.status(401).json({ error: 'Authorization token required' });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    // LOG DE DIAGNÓSTICO 2: Verificar token extraído
    console.log('🔍 [BACKEND] requireAuth - Token extraído:', token.substring(0, 20) + '...');
    
    const validation = await validateSession(token);
    
    // LOG DE DIAGNÓSTICO 3: Verificar resultado da validação
    console.log('🔍 [BACKEND] requireAuth - Validação bem-sucedida:', !!validation);
    
    if (!validation) {
      console.log('❌ [BACKEND] requireAuth - Token inválido ou expirado');
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // CORREÇÃO DEFINITIVA: Extrair companyId diretamente do JWT
    const jwtPayload = verifyToken(token);
    
    // Add user and session to request object
    req.user = {
      ...validation.user,
      companyId: jwtPayload?.companyId || validation.user.companyId || 'N/A'
    };
    req.session = validation.session;
    
    // LOG DE DIAGNÓSTICO 4: Verificar usuário anexado
    console.log('✅ [BACKEND] requireAuth - Usuário autenticado:', {
      userId: req.user.id,
      role: req.user.role,
      companyId: req.user.companyId
    });
    
    console.log('[Auth.ts] FINAL req.user ANTES de next():', req.user);
    
    next();
  } catch (error) {
    console.log('❌ [BACKEND] requireAuth - Erro na autenticação:', error);
    return res.status(401).json({ error: 'Authentication failed' });
  }
}

/**
 * Middleware to check user role
 */
export function requireRole(roles: string[]) {
  return (req: any, res: any, next: any) => {
    console.log('🔍 [BACKEND] requireRole - Verificando permissões:', {
      userRole: req.user?.role,
      requiredRoles: roles,
      hasAccess: roles.includes(req.user?.role)
    });
    
    if (!req.user) {
      console.log('❌ [BACKEND] requireRole - Usuário não autenticado');
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!roles.includes(req.user.role)) {
      console.log('❌ [BACKEND] requireRole - Permissão insuficiente:', {
        userRole: req.user.role,
        requiredRoles: roles
      });
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    console.log('✅ [BACKEND] requireRole - Permissão concedida para role:', req.user.role);
    next();
  };
}

// Enhance requireAuth by attaching decoded JWT payload for downstream access to companyId
// Note: We keep existing behavior but enrich req with auth payload.
export async function attachAuthPayload(req: any, _res: any, next: any) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return next();
    const token = authHeader.substring(7);
    const payload = verifyToken(token);
    if (payload) {
      req.auth = payload;
    }
  } catch (_e) {
    // ignore
  } finally {
    next();
  }
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