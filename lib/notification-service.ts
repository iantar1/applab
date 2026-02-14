/**
 * Notification Service
 * Handles sending emails, SMS, and WhatsApp messages for bookings
 */

export interface NotificationPayload {
  bookingId: number;
  email: string;
  phone: string;
  name: string;
  serviceName: string;
  appointmentDate: string;
  appointmentTime: string;
  type: 'confirmation' | 'reminder' | 'cancellation';
}

/**
 * Send confirmation notification via email
 */
export async function sendConfirmationEmail(payload: NotificationPayload) {
  try {
    const params = new URLSearchParams({
      action: 'confirmation',
      bookingId: payload.bookingId.toString(),
      email: payload.email,
      name: payload.name,
      serviceName: payload.serviceName,
      appointmentDate: payload.appointmentDate,
      appointmentTime: payload.appointmentTime,
    });

    const response = await fetch(`/api/notifications/email?${params}`, {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error('Failed to send email');
    }

    return await response.json();
  } catch (error) {
    console.error('Error sending confirmation email:', error);
    throw error;
  }
}

/**
 * Send confirmation notification via WhatsApp
 */
export async function sendConfirmationWhatsApp(payload: NotificationPayload) {
  try {
    const message = `Hi ${payload.name}! 👋

Your appointment has been confirmed! 

📋 Service: ${payload.serviceName}
📅 Date: ${payload.appointmentDate}
🕐 Time: ${payload.appointmentTime}
🆔 Booking ID: #${payload.bookingId}

Please arrive 10 minutes early. You'll receive appointment reminders before your test.

Thank you for choosing us!`;

    // Use WhatsApp Bridge directly (running on port 3001)
    const BRIDGE_URL = process.env.WHATSAPP_BRIDGE_URL || 'http://localhost:3001';
    
    const response = await fetch(`${BRIDGE_URL}/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: payload.phone,
        body: message,
        sender: 'AppointLab',
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to send WhatsApp message');
    }

    return await response.json();
  } catch (error) {
    console.error('Error sending WhatsApp message:', error);
    throw error;
  }
}

/**
 * Send appointment reminder via WhatsApp
 */
export async function sendReminderWhatsApp(payload: NotificationPayload) {
  try {
    const message = `⏰ Reminder: Your appointment is coming up!

📋 Service: ${payload.serviceName}
📅 Date: ${payload.appointmentDate}
🕐 Time: ${payload.appointmentTime}
🆔 Booking ID: #${payload.bookingId}

Please arrive 10 minutes early. Contact us if you need to reschedule.

See you soon! 👋`;

    // Use WhatsApp Bridge directly (running on port 3001)
    const BRIDGE_URL = process.env.WHATSAPP_BRIDGE_URL || 'http://localhost:3001';
    
    const response = await fetch(`${BRIDGE_URL}/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: payload.phone,
        body: message,
        sender: 'AppointLab',
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to send reminder');
    }

    return await response.json();
  } catch (error) {
    console.error('Error sending reminder:', error);
    throw error;
  }
}

/**
 * Send appointment reminder via email
 */
export async function sendReminderEmail(payload: NotificationPayload) {
  try {
    const params = new URLSearchParams({
      action: 'reminder',
      email: payload.email,
      name: payload.name,
      serviceName: payload.serviceName,
      appointmentDate: payload.appointmentDate,
      appointmentTime: payload.appointmentTime,
    });

    const response = await fetch(`/api/notifications/email?${params}`, {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error('Failed to send reminder email');
    }

    return await response.json();
  } catch (error) {
    console.error('Error sending reminder email:', error);
    throw error;
  }
}

/**
 * Send all notifications (email + WhatsApp) for a booking
 */
export async function sendAllNotifications(payload: NotificationPayload) {
  const results = {
    email: null as any,
    whatsapp: null as any,
    errors: [] as string[]
  };

  try {
    // Send email
    try {
      results.email = await sendConfirmationEmail(payload);
    } catch (error) {
      results.errors.push(`Email: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Send WhatsApp
    try {
      results.whatsapp = await sendConfirmationWhatsApp(payload);
    } catch (error) {
      results.errors.push(`WhatsApp: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  } catch (error) {
    console.error('Error sending notifications:', error);
  }

  return results;
}
