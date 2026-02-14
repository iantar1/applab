import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/appointments/slots?serviceId=xxx
 * Returns taken (date, time) slots for a service so the booking calendar
 * can mark them unavailable. No auth required; only date+time are returned.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const serviceId = searchParams.get('serviceId');

    if (!serviceId || !serviceId.trim()) {
      return NextResponse.json(
        { error: 'Missing serviceId' },
        { status: 400 }
      );
    }

    const appointments = await prisma.appointment.findMany({
      where: {
        serviceId: serviceId.trim(),
        status: { in: ['pending', 'paid'] },
        appointmentDate: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
      },
      select: {
        appointmentDate: true,
        appointmentTime: true,
      },
    });

    const takenSlots = appointments.map((a) => ({
      date: a.appointmentDate.toISOString().split('T')[0],
      time: a.appointmentTime.trim(),
    }));

    return NextResponse.json({ takenSlots });
  } catch (error) {
    console.error('Error fetching appointment slots:', error);
    return NextResponse.json(
      { error: 'Failed to fetch slots' },
      { status: 500 }
    );
  }
}
