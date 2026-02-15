import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyJwt } from '@/lib/auth';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: {
        service: true,
      },
    });

    if (!appointment) {
      return NextResponse.json(
        { error: 'Appointment not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ appointment });
  } catch (error) {
    console.error('Error fetching appointment:', error);
    return NextResponse.json(
      { error: 'Failed to fetch appointment' },
      { status: 500 }
    );
  }
}

/**
 * PATCH: Admin only. Actions: cancel, complete, reschedule.
 * Body: { action: 'cancel' | 'complete' | 'reschedule', appointmentDate?: string (YYYY-MM-DD), appointmentTime?: string (HH:mm) }
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookie = request.headers.get('cookie') || '';
    const match = cookie.split(';').map((c) => c.trim()).find((c) => c.startsWith('token='));
    const token = match ? match.split('=')[1] : null;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const payload = verifyJwt<{ userId: string }>(token);
    if (!payload?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const currentUser = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, isAdmin: true },
    });
    if (!currentUser?.isAdmin) {
      return NextResponse.json({ error: 'Forbidden. Admin only.' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const action = typeof body.action === 'string' ? body.action.trim().toLowerCase() : null;

    if (!['cancel', 'complete', 'reschedule'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Use cancel, complete, or reschedule.' },
        { status: 400 }
      );
    }

    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: { service: true },
    });
    if (!appointment) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
    }

    if (action === 'cancel') {
      await prisma.appointment.update({
        where: { id },
        data: { status: 'cancelled' },
      });
      return NextResponse.json({ success: true, message: 'Appointment cancelled.' });
    }

    if (action === 'complete') {
      await prisma.appointment.update({
        where: { id },
        data: { status: 'completed' },
      });
      return NextResponse.json({ success: true, message: 'Appointment marked as done.' });
    }

    // reschedule
    const rawDate = body.appointmentDate;
    const rawTime = body.appointmentTime;
    if (rawDate == null || rawTime == null) {
      return NextResponse.json(
        { error: 'Reschedule requires appointmentDate (YYYY-MM-DD) and appointmentTime (HH:mm).' },
        { status: 400 }
      );
    }
    const dateStr = String(rawDate).trim();
    const timeStr = String(rawTime).trim();
    const dateMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    const timeMatch = timeStr.match(/^(\d{1,2}):(\d{2})$/);
    if (!dateMatch || !timeMatch) {
      return NextResponse.json(
        { error: 'Invalid date or time format. Use YYYY-MM-DD and HH:mm.' },
        { status: 400 }
      );
    }
    const appointmentDate = new Date(
      parseInt(dateMatch[1], 10),
      parseInt(dateMatch[2], 10) - 1,
      parseInt(dateMatch[3], 10),
      0,
      0,
      0,
      0
    );
    if (Number.isNaN(appointmentDate.getTime())) {
      return NextResponse.json({ error: 'Invalid date.' }, { status: 400 });
    }
    const normalizedTime = `${timeMatch[1].padStart(2, '0')}:${timeMatch[2]}`;

    await prisma.appointment.update({
      where: { id },
      data: {
        appointmentDate,
        appointmentTime: normalizedTime,
      },
    });
    return NextResponse.json({ success: true, message: 'Appointment rescheduled.' });
  } catch (error) {
    console.error('Error updating appointment:', error);
    return NextResponse.json(
      { error: 'Failed to update appointment' },
      { status: 500 }
    );
  }
}
