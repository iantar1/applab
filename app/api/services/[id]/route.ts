import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyJwt } from '@/lib/auth';

function getAuthUser(request: Request) {
  const cookie = request.headers.get('cookie') || '';
  const match = cookie.split(';').map(c => c.trim()).find(c => c.startsWith('token='));
  const token = match ? match.split('=')[1] : null;
  if (!token) return null;
  const payload = verifyJwt<{ userId: string }>(token);
  return payload?.userId ?? null;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const idNum = parseInt(id, 10);
    const isNumericId = !Number.isNaN(idNum) && String(idNum) === id;

    let service;
    if (isNumericId) {
      const all = await prisma.service.findMany({ orderBy: { name: 'asc' } });
      service = all[idNum - 1] ?? null;
    } else {
      service = await prisma.service.findUnique({ where: { id } });
    }

    if (!service) {
      return NextResponse.json(
        { error: 'Service not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      service: {
        id: service.id,
        name: service.name,
        description: service.description,
        fullDescription: service.description ?? '',
        price: service.price,
        duration: service.duration ?? 30,
        category: service.category,
        preparation: 'No special preparation required.',
        results: '1-2 business days',
      },
    });
  } catch (error) {
    console.error('Error fetching service:', error);
    return NextResponse.json(
      { error: 'Failed to fetch service' },
      { status: 500 }
    );
  }
}

/**
 * PATCH: Update a service (admin only).
 * Body: { name?: string, description?: string, price?: number, category?: string, duration?: number }
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const service = await prisma.service.findUnique({ where: { id } });
    if (!service) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 });
    }

    const body = await request.json();
    const { name, description, price, category, duration } = body;

    const data: { name?: string; description?: string | null; price?: number; category?: string; duration?: number } = {};
    if (name !== undefined) data.name = String(name).trim();
    if (description !== undefined) data.description = description == null || description === '' ? null : String(description);
    const priceNum = typeof price === 'number' ? price : Number(price);
    if (!Number.isNaN(priceNum)) data.price = priceNum;
    if (category !== undefined) data.category = String(category).trim();
    const durationNum = typeof duration === 'number' ? duration : Number(duration);
    if (!Number.isNaN(durationNum) && durationNum >= 1) data.duration = Math.round(durationNum);

    let updated;
    try {
      updated = await prisma.service.update({
        where: { id },
        data,
      });
    } catch (updateError: unknown) {
      const msg = updateError instanceof Error ? updateError.message : String(updateError);
      if (msg.includes('duration') || msg.includes('Unknown column')) {
        const { duration: _d, ...dataWithoutDuration } = data;
        updated = await prisma.service.update({
          where: { id },
          data: dataWithoutDuration,
        });
      } else {
        throw updateError;
      }
    }

    return NextResponse.json({
      service: {
        id: updated.id,
        name: updated.name,
        description: updated.description,
        price: updated.price,
        category: updated.category,
        duration: updated.duration ?? 30,
      },
    });
  } catch (error) {
    console.error('Error updating service:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to update service', details: message },
      { status: 500 }
    );
  }
}

/**
 * DELETE: Delete a service (admin only).
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const service = await prisma.service.findUnique({ where: { id } });
    if (!service) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 });
    }

    await prisma.service.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting service:', error);
    return NextResponse.json(
      { error: 'Failed to delete service' },
      { status: 500 }
    );
  }
}
