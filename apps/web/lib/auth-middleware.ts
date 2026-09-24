import { NextRequest } from 'next/server';
import { ObjectId } from 'mongodb';
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

/** The roles that run the platform and therefore must never be customers. */
export function isAdminRole(role?: string | null): boolean {
  return role === 'admin' || role === 'super_admin';
}

export function requireAdmin(req: NextRequest): AuthPayload {
  const payload = requireAuth(req);
  if (!isAdminRole(payload.role)) {
    throw new AuthError('Forbidden', 403);
  }
  return payload;
}

/** Shown to an admin who tries to shop. Surfaced by the UI verbatim. */
export const ADMIN_CANNOT_SHOP =
  'Admin accounts cannot buy numbers or make offers. Please sign in with a customer account.';

/**
 * Authenticated, and confirmed NOT to be an admin.
 *
 * The role is re-read from the database rather than trusted from the token.
 * Tokens live for 7 days, so someone promoted to admin today would otherwise
 * keep a token that still says "buyer" and could go on buying all week.
 *
 * Guards every route that spends money or claims ownership of a number.
 */
export async function requireCustomer(req: NextRequest): Promise<AuthPayload> {
  const payload = requireAuth(req);

  // Cheap rejection when the token itself already says admin.
  if (isAdminRole(payload.role)) {
    throw new AuthError(ADMIN_CANNOT_SHOP, 403);
  }

  const { getUsersCollection } = await import('./collections');
  const users = await getUsersCollection();
  const user = await users.findOne(
    { _id: new ObjectId(payload.userId) },
    { projection: { role: 1 } }
  );

  if (!user) {
    throw new AuthError('Your account could not be found. Please sign in again.', 401);
  }
  if (isAdminRole(user.role)) {
    throw new AuthError(ADMIN_CANNOT_SHOP, 403);
  }

  return payload;
}

export class AuthError extends HttpError {
  constructor(message: string, status: number) {
    super(message, status);
    this.name = 'AuthError';
  }
}
