import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyJwt } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const cookie = request.headers.get('cookie') || '';
    const match = cookie.split(';').map(c => c.trim()).find(c => c.startsWith('token='));
    const token = match ? match.split('=')[1] : null;

    if (!token) return NextResponse.json({ user: null });

    const payload = verifyJwt<{ userId: string }>(token);
    if (!payload?.userId) return NextResponse.json({ user: null });

    const user = await prisma.user.findUnique({ where: { id: payload.userId }, select: { id: true, fullName: true, phone: true, cin: true } });
    return NextResponse.json({ user });
  } catch (error) {
    console.error('Me error:', error);
    return NextResponse.json({ user: null }, { status: 500 });
  }
}
