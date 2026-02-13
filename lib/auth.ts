import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'change-me';
const EXPIRY = '7d';

export function signJwt(payload: Record<string, any>) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: EXPIRY });
}

export function verifyJwt<T = any>(token: string): T | null {
  try {
    return jwt.verify(token, JWT_SECRET) as T;
  } catch (e) {
    return null;
  }
}
