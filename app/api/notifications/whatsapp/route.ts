import { NextResponse } from 'next/server';
import { sendWhatsAppMessage } from '@/lib/twilio';

export async function POST(request: Request) {
  try {
    const { bookingId, phone, message, type } = await request.json();

    if (!phone || !message) {
      return NextResponse.json(
        { error: 'Phone number and message are required' },
        { status: 400 }
      );
    }

    // Send WhatsApp message
    const result = await sendWhatsAppMessage(phone, message);

    return NextResponse.json({
      success: true,
      messageSid: result.sid,
      type,
      bookingId
    });
  } catch (error) {
    console.error('Error sending WhatsApp message:', error);
    return NextResponse.json(
      { 
        error: 'Failed to send WhatsApp message',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'send-reminder') {
      const bookingId = searchParams.get('bookingId');
      const phone = searchParams.get('phone');

      if (!bookingId || !phone) {
        return NextResponse.json(
          { error: 'Booking ID and phone number are required' },
          { status: 400 }
        );
      }

      const appointmentDate = searchParams.get('appointmentDate');
      const appointmentTime = searchParams.get('appointmentTime');
      const serviceName = searchParams.get('serviceName');

      const message = `Hi! This is a reminder for your lab appointment.\nService: ${serviceName}\nDate: ${appointmentDate}\nTime: ${appointmentTime}\n\nPlease arrive 10 minutes early. Contact us if you need to reschedule.`;

      const result = await sendWhatsAppMessage(phone, message);

      return NextResponse.json({
        success: true,
        messageSid: result.sid,
        type: 'reminder',
        bookingId
      });
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error sending notification:', error);
    return NextResponse.json(
      { error: 'Failed to send notification' },
      { status: 500 }
    );
  }
}
