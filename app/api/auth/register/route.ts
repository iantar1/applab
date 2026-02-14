import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { signJwt } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { fullName, email, phone, password, cin } = body;

    if (!fullName || !email || !phone || !password || !cin) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check for existing user by email, phone, or CIN
    const existing = await prisma.user.findFirst({
      where: {
        OR: [
          { email },
          { phone },
          { cin },
        ],
      },
    });

    if (existing) {
      return NextResponse.json({ error: 'User with provided email/phone/CIN already exists' }, { status: 409 });
    }

    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(password, salt);

    const isAdmin = String(email).toLowerCase().endsWith('@um6p.ma');

    const user = await prisma.user.create({
      data: {
        fullName,
        email,
        phone,
        cin,
        password: hashed,
        isAdmin,
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        cin: true,
        createdAt: true,
      },
    });

    // Auto-login: set session cookie same as login
    const token = signJwt({ userId: user.id });
    const maxAge = 7 * 24 * 60 * 60; // 7 days in seconds
    const secure = process.env.NODE_ENV === 'production';

    const res = NextResponse.json(
      { user: { id: user.id, fullName: user.fullName, phone: user.phone } },
      { status: 201 }
    );
    res.headers.set(
      'Set-Cookie',
      `token=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure ? '; Secure' : ''}`
    );

    return res;
  } catch (error) {
    console.error('Registration error:', error);
    const err = error as any;
    if (process.env.NODE_ENV !== 'production') {
      return NextResponse.json({ error: 'Failed to register user', message: err?.message, stack: err?.stack }, { status: 500 });
    }
    return NextResponse.json({ error: 'Failed to register user' }, { status: 500 });
  }
}
