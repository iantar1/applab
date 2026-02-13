import { NextResponse } from 'next/server';

// Mock email service - replace with actual service like SendGrid, Resend, etc.
async function sendEmail(email: string, subject: string, html: string) {
  // This is a mock implementation
  // In production, integrate with actual email service
  console.log(`Sending email to ${email}: ${subject}`);
  
  // Simulate email sending
  return {
    success: true,
    messageId: `msg_${Date.now()}`,
    email
  };
}

export async function POST(request: Request) {
  try {
    const { email, subject, html, bookingId, type } = await request.json();

    if (!email || !subject || !html) {
      return NextResponse.json(
        { error: 'Email, subject, and HTML are required' },
        { status: 400 }
      );
    }

    const result = await sendEmail(email, subject, html);

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
      email: result.email,
      type,
      bookingId
    });
  } catch (error) {
    console.error('Error sending email:', error);
    return NextResponse.json(
      { error: 'Failed to send email' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'confirmation') {
      const bookingId = searchParams.get('bookingId');
      const email = searchParams.get('email');
      const name = searchParams.get('name');
      const serviceName = searchParams.get('serviceName');
      const appointmentDate = searchParams.get('appointmentDate');
      const appointmentTime = searchParams.get('appointmentTime');

      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #7c3aed 0%, #2563eb 100%); color: white; padding: 20px; border-radius: 8px; }
              .content { background: #f9fafb; padding: 20px; margin-top: 20px; border-radius: 8px; }
              .details { margin: 15px 0; }
              .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
              .button { display: inline-block; background: #7c3aed; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Appointment Confirmed! ✓</h1>
              </div>
              <div class="content">
                <p>Hi ${name},</p>
                <p>Thank you for booking with us! Your appointment has been confirmed.</p>
                
                <div class="details">
                  <h3>Appointment Details</h3>
                  <div class="detail-row">
                    <span>Service:</span>
                    <strong>${serviceName}</strong>
                  </div>
                  <div class="detail-row">
                    <span>Date:</span>
                    <strong>${appointmentDate}</strong>
                  </div>
                  <div class="detail-row">
                    <span>Time:</span>
                    <strong>${appointmentTime}</strong>
                  </div>
                  <div class="detail-row">
                    <span>Booking ID:</span>
                    <strong>#${bookingId}</strong>
                  </div>
                </div>

                <h3>Important Information</h3>
                <ul>
                  <li>Please arrive 10 minutes early</li>
                  <li>Bring a valid ID and insurance card</li>
                  <li>Follow the preparation instructions sent separately</li>
                  <li>Contact us if you need to reschedule</li>
                </ul>

                <p><a href="${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/checkout/${bookingId}" class="button">View Booking</a></p>

                <p>If you have any questions, please contact our support team.</p>
                <p>Best regards,<br>Lab Booking Team</p>
              </div>
            </div>
          </body>
        </html>
      `;

      const result = await sendEmail(email, `Appointment Confirmed - ${serviceName}`, html);

      return NextResponse.json({
        success: true,
        messageId: result.messageId,
        email: result.email,
        type: 'confirmation',
        bookingId
      });
    }

    if (action === 'reminder') {
      const email = searchParams.get('email');
      const name = searchParams.get('name');
      const serviceName = searchParams.get('serviceName');
      const appointmentDate = searchParams.get('appointmentDate');
      const appointmentTime = searchParams.get('appointmentTime');

      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .reminder { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; border-radius: 4px; }
            </style>
          </head>
          <body>
            <div class="container">
              <h2>Appointment Reminder</h2>
              <div class="reminder">
                <p>Hi ${name},</p>
                <p>This is a friendly reminder about your upcoming appointment:</p>
                <p><strong>${serviceName}</strong></p>
                <p><strong>Date:</strong> ${appointmentDate}</p>
                <p><strong>Time:</strong> ${appointmentTime}</p>
                <p>Please arrive 10 minutes early. If you need to reschedule, please let us know as soon as possible.</p>
              </div>
            </div>
          </body>
        </html>
      `;

      const result = await sendEmail(email, `Reminder: Your appointment is coming up`, html);

      return NextResponse.json({
        success: true,
        messageId: result.messageId,
        email: result.email,
        type: 'reminder'
      });
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error sending email:', error);
    return NextResponse.json(
      { error: 'Failed to send email' },
      { status: 500 }
    );
  }
}
