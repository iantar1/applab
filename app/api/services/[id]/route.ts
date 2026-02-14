import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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
        duration: 30,
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
