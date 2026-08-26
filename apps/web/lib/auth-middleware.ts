import { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';
import { HttpError } from './http-error';

const JWT_SECRET = process.env.JWT_SECRET || 'numberdepot_jwt_secret_2024';

export interface AuthPayload {
  userId: string;
  email: string;
  role: string;
}

export function authenticateRequest(req: NextRequest): AuthPayload | null {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;

  const token = authHeader.slice(7);
  try {
    return jwt.verify(token, JWT_SECRET) as AuthPayload;
  } catch {
    return null;
  }
}

export function requireAuth(req: NextRequest): AuthPayload {
  const payload = authenticateRequest(req);
  if (!payload) {
    throw new AuthError('Unauthorized', 401);
  }
  return payload;
}

export function requireAdmin(req: NextRequest): AuthPayload {
  const payload = requireAuth(req);
  if (payload.role !== 'admin') {
    throw new AuthError('Forbidden', 403);
  }
  return payload;
}

export class AuthError extends HttpError {
  constructor(message: string, status: number) {
    super(message, status);
    this.name = 'AuthError';
  }
}
