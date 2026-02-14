import { prisma } from '@/lib/prisma';
import { verifyJwt } from '@/lib/auth';

export function getAuthUserId(request: Request): string | null {
  const cookie = request.headers.get('cookie') || '';
  const match = cookie.split(';').map(c => c.trim()).find(c => c.startsWith('token='));
  const token = match ? match.split('=')[1] : null;
  if (!token) return null;
  const payload = verifyJwt<{ userId: string }>(token);
  return payload?.userId ?? null;
}

export async function requireAdmin(request: Request): Promise<
  | { ok: true; userId: string }
  | { ok: false; status: 401 | 403; error: string }
> {
  const userId = getAuthUserId(request);
  if (!userId) return { ok: false, status: 401, error: 'Unauthorized' };
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isAdmin: true },
  });
  if (!user?.isAdmin) return { ok: false, status: 403, error: 'Forbidden' };
  return { ok: true, userId };
}
