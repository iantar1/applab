import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyJwt } from '@/lib/auth';
import bcrypt from 'bcryptjs';

function getAuthUserId(request: Request): string | null {
  const cookie = request.headers.get('cookie') || '';
  const match = cookie.split(';').map(c => c.trim()).find(c => c.startsWith('token='));
  const token = match ? match.split('=')[1] : null;
  if (!token) return null;
  const payload = verifyJwt<{ userId: string }>(token);
  return payload?.userId ?? null;
}

const userSelect = { id: true, fullName: true, email: true, phone: true, cin: true, isAdmin: true };

export async function GET(request: Request) {
  try {
    const userId = getAuthUserId(request);
    if (!userId) return NextResponse.json({ user: null });

    const user = await prisma.user.findUnique({ where: { id: userId }, select: userSelect });
    return NextResponse.json({ user });
  } catch (error) {
    console.error('Me error:', error);
    return NextResponse.json({ user: null }, { status: 500 });
  }
}

/**
 * PATCH: Update current user profile.
 * Body: { fullName?, email?, phone?, cin?, password? } — all optional; only provided fields are updated.
 */
export async function PATCH(request: Request) {
  try {
    const userId = getAuthUserId(request);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { fullName, email, phone, cin, password } = body;

    const updates: { fullName?: string; email?: string; phone?: string; cin?: string; password?: string } = {};

    if (typeof fullName === 'string') {
      const trimmed = fullName.trim();
      if (!trimmed) return NextResponse.json({ error: 'Full name cannot be empty' }, { status: 400 });
      updates.fullName = trimmed;
    }
    if (typeof email === 'string') {
      const trimmed = email.trim();
      if (!trimmed) return NextResponse.json({ error: 'Email cannot be empty' }, { status: 400 });
      const existing = await prisma.user.findFirst({ where: { email: trimmed, id: { not: userId } } });
      if (existing) return NextResponse.json({ error: 'Email already in use' }, { status: 409 });
      updates.email = trimmed;
    }
    if (typeof phone === 'string') {
      const trimmed = phone.trim();
      if (!trimmed) return NextResponse.json({ error: 'Phone cannot be empty' }, { status: 400 });
      const existing = await prisma.user.findFirst({ where: { phone: trimmed, id: { not: userId } } });
      if (existing) return NextResponse.json({ error: 'Phone already in use' }, { status: 409 });
      updates.phone = trimmed;
    }
    if (typeof cin === 'string') {
      const trimmed = cin.trim();
      if (!trimmed) return NextResponse.json({ error: 'CIN cannot be empty' }, { status: 400 });
      const existing = await prisma.user.findFirst({ where: { cin: trimmed, id: { not: userId } } });
      if (existing) return NextResponse.json({ error: 'CIN already in use' }, { status: 409 });
      updates.cin = trimmed;
    }
    if (typeof password === 'string') {
      if (password.length < 6) return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
      const salt = await bcrypt.genSalt(10);
      updates.password = await bcrypt.hash(password, salt);
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: updates,
      select: userSelect,
    });
    return NextResponse.json({ user });
  } catch (error) {
    console.error('Me PATCH error:', error);
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}
