import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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
      duration: 30,
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
