import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyJwt } from '@/lib/auth';

function getAuthUser(request: Request) {
  const cookie = request.headers.get('cookie') || '';
  const match = cookie.split(';').map(c => c.trim()).find(c => c.startsWith('token='));
  const token = match ? match.split('=')[1] : null;
  if (!token) return null;
  const payload = verifyJwt<{ userId: string }>(token);
  if (!payload?.userId) return null;
  return payload.userId;
}

export async function GET() {
  try {
    const dbServices = await prisma.service.findMany({
      orderBy: { name: 'asc' },
    });
    const services = dbServices.map((s, index) => ({
      id: s.id,
      numericId: index + 1,
      name: s.name,
      description: s.description,
      price: s.price,
      category: s.category,
      duration: s.duration ?? 30,
    }));
    return NextResponse.json({ services });
  } catch (error) {
    console.error('Error fetching services:', error);
    return NextResponse.json(
      { error: 'Failed to fetch services' },
      { status: 500 }
    );
  }
}

/**
 * POST: Create a new service (admin only).
 * Body: { name: string, description?: string, price: number, category: string, duration?: number }
 */
export async function POST(request: Request) {
  try {
    const userId = getAuthUser(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { isAdmin: true },
    });
    if (!user?.isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { name, description, price, category, duration } = body;
    if (!name || typeof price !== 'number' || !category) {
      return NextResponse.json(
        { error: 'name, price, and category are required' },
        { status: 400 }
      );
    }

    const service = await prisma.service.create({
      data: {
        name: String(name).trim(),
        description: description != null ? String(description) : null,
        price: Number(price),
        category: String(category).trim(),
        duration: typeof duration === 'number' ? Math.max(1, Math.round(duration)) : 30,
      },
    });

    return NextResponse.json({
      service: {
        id: service.id,
        name: service.name,
        description: service.description,
        price: service.price,
        category: service.category,
        duration: service.duration ?? 30,
      },
    });
  } catch (error) {
    console.error('Error creating service:', error);
    return NextResponse.json(
      { error: 'Failed to create service' },
      { status: 500 }
    );
  }
}
