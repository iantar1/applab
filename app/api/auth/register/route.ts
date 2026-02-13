import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

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

    const user = await prisma.user.create({
      data: {
        fullName,
        email,
        phone,
        cin,
        password: hashed,
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

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    console.error('Registration error:', error);
    const err = error as any;
    if (process.env.NODE_ENV !== 'production') {
      return NextResponse.json({ error: 'Failed to register user', message: err?.message, stack: err?.stack }, { status: 500 });
    }
    return NextResponse.json({ error: 'Failed to register user' }, { status: 500 });
  }
}
