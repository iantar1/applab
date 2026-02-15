import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyJwt } from '@/lib/auth';
import { sendConfirmationWhatsApp } from '@/lib/notification-service';

/**
 * GET: List appointments for the current user (by userId or guest email/phone).
 * Requires auth cookie.
 */
export async function GET(request: Request) {
  try {
    const cookie = request.headers.get('cookie') || '';
    const match = cookie.split(';').map(c => c.trim()).find(c => c.startsWith('token='));
    const token = match ? match.split('=')[1] : null;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const payload = verifyJwt<{ userId: string }>(token);
    if (!payload?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, email: true, phone: true, isAdmin: true },
    });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const isAdmin = user.isAdmin === true;

    const appointments = await prisma.appointment.findMany({
      where: isAdmin
        ? undefined
        : {
            OR: [
              { userId: user.id },
              ...(user.email ? [{ guestEmail: user.email }] : []),
              ...(user.phone ? [{ guestPhone: user.phone }] : []),
            ],
          },
      orderBy: { appointmentDate: 'desc' },
      include: {
        service: true,
        ...(isAdmin ? { user: { select: { id: true, fullName: true, email: true, phone: true } } } : {}),
      },
    });
    return NextResponse.json({ appointments });
  } catch (error) {
    console.error('Error fetching user appointments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch appointments' },
      { status: 500 }
    );
  }
}

/**
 * Request body fields aligned with checkout; we map to Appointment model attributes.
 * Appointment model: userId?, serviceId, appointmentDate, appointmentTime, status,
 * totalPrice, insuranceId?, stripeSessionId?, pdfPath?, notes?, guestName?, guestEmail?, guestPhone?
 */
export async function POST(request: Request) {
  try {
    const cookie = request.headers.get('cookie') || '';
    const match = cookie.split(';').map(c => c.trim()).find(c => c.startsWith('token='));
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
      select: { id: true, isAdmin: true, email: true, phone: true, fullName: true },
    });
    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await request.json();

    const serviceId = body.serviceId != null ? String(body.serviceId).trim() : null;
    const serviceName = body.serviceName != null ? String(body.serviceName).trim() : null;
    const appointmentDateRaw = body.appointmentDate;
    const appointmentTimeRaw = body.appointmentTime;
    const priceRaw = body.price;
    const name = body.name != null ? String(body.name).trim() : null;
    const email = body.email != null ? String(body.email).trim() : null;
    const phone = body.phone != null ? String(body.phone).trim() : null;
    const cin = body.cin != null ? String(body.cin).trim() : null;
    const notes = body.notes != null ? String(body.notes).trim() : null;

    if (!appointmentDateRaw || !appointmentTimeRaw || priceRaw == null) {
      return NextResponse.json(
        { error: 'Missing required fields: appointmentDate, appointmentTime, price' },
        { status: 400 }
      );
    }

    let service = null;
    if (serviceId) {
      service = await prisma.service.findUnique({ where: { id: serviceId } });
    }
    if (!service && serviceName) {
      service = await prisma.service.findFirst({
        where: {
          OR: [
            { name: serviceName },
            { name: { contains: serviceName } },
          ],
        },
      });
    }

    if (!service) {
      return NextResponse.json(
        { error: serviceId ? 'Service not found.' : `Service not found: ${serviceName || 'provide serviceId or serviceName'}` },
        { status: 404 }
      );
    }

    const appointmentDate = new Date(appointmentDateRaw);
    if (isNaN(appointmentDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid appointment date' },
        { status: 400 }
      );
    }

    const appointmentTime = appointmentTimeRaw != null ? String(appointmentTimeRaw).trim() : '09:00';
    const totalPrice = Number(priceRaw);
    if (Number.isNaN(totalPrice) || totalPrice < 0) {
      return NextResponse.json(
        { error: 'Invalid price' },
        { status: 400 }
      );
    }

    const isAdmin = currentUser.isAdmin === true;
    if (isAdmin) {
      if (!name || !email || !phone) {
        return NextResponse.json(
          { error: 'When booking for someone else, full name, email, and phone are required.' },
          { status: 400 }
        );
      }
      const adminEmail = (currentUser.email ?? '').toLowerCase().trim();
      const adminPhone = (currentUser.phone ?? '').trim();
      const guestEmailLower = email.toLowerCase().trim();
      const guestPhoneNorm = phone.trim();
      if (adminEmail && guestEmailLower === adminEmail) {
        return NextResponse.json(
          { error: 'You cannot create an appointment for yourself. Use the guest\'s email.' },
          { status: 400 }
        );
      }
      if (adminPhone && guestPhoneNorm === adminPhone) {
        return NextResponse.json(
          { error: 'You cannot create an appointment for yourself. Use the guest\'s phone.' },
          { status: 400 }
        );
      }
    }

    const appointment = await prisma.appointment.create({
      data: {
        userId: currentUser.id,
        serviceId: service.id,
        appointmentDate,
        appointmentTime,
        totalPrice,
        status: 'pending',
        guestName: name || null,
        guestEmail: email || null,
        guestPhone: phone || null,
        guestCin: cin || null,
        notes: notes || null,
      },
      include: {
        service: true,
      },
    });

    // Send WhatsApp confirmation message (first message: at time of booking)
    const contactPhone = phone || currentUser.phone;
    const contactName = name || currentUser.fullName || currentUser.email?.split('@')[0] || 'Guest';
    const dayDate = appointment.appointmentDate.toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    if (contactPhone) {
      try {
        await sendConfirmationWhatsApp({
          bookingId: parseInt(appointment.id),
          email: '',
          phone: contactPhone,
          name: contactName,
          serviceName: service.name,
          appointmentDate: appointment.appointmentDate.toISOString().split('T')[0],
          dayDate,
          appointmentTime: appointment.appointmentTime,
          type: 'confirmation',
        });
        console.log('WhatsApp confirmation sent to:', contactPhone);
      } catch (error) {
        console.error('Error sending WhatsApp confirmation:', error);
        // Don't fail the appointment creation if WhatsApp fails
      }
    }

    return NextResponse.json({ appointment }, { status: 201 });
  } catch (error: unknown) {
    console.error('Error creating appointment:', error);
    const message = error instanceof Error ? error.message : 'Failed to create appointment';
    const prismaCode = error && typeof error === 'object' && 'code' in error ? (error as { code?: string }).code : undefined;
    return NextResponse.json(
      { error: message, code: prismaCode },
      { status: 500 }
    );
  }
}
