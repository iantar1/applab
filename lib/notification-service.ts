/**
 * Notification Service
 * Handles sending emails, SMS, and WhatsApp messages for bookings.
 * Uses AI to generate confirmation and reminder messages when available; falls back to fixed text.
 */

import { generateNotificationMessage } from "@/lib/ai-notification-messages";
import { getBlockedNumbers, isBlocked } from "@/lib/blocked-numbers";

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
 * Send WhatsApp via bridge (shared helper). Skips if phone/ID is blocked.
 */
async function sendWhatsApp(phone: string, body: string) {
  const blockedList = await getBlockedNumbers();
  if (isBlocked(phone, blockedList)) {
    return { skipped: true, reason: "blocked" };
  }
  const BRIDGE_URL = process.env.WHATSAPP_BRIDGE_URL || 'http://localhost:3001';
  const response = await fetch(`${BRIDGE_URL}/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      to: phone,
      body,
      sender: 'AppointLab',
    }),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to send WhatsApp message');
  }
  return response.json();
}

/**
 * Send confirmation notification via WhatsApp (at time of booking).
 * Uses AI to generate a friendly confirm/remind message when possible; otherwise fixed text.
 */
export async function sendConfirmationWhatsApp(payload: NotificationPayload & { dayDate?: string }) {
  try {
    const dayDate = payload.dayDate || payload.appointmentDate;
    const aiMessage = await generateNotificationMessage("confirmation", {
      name: payload.name,
      serviceName: payload.serviceName,
      appointmentDate: payload.appointmentDate,
      appointmentTime: payload.appointmentTime,
      dayDate,
    });
    const message =
      aiMessage ||
      `Hi ${payload.name}, you just booked an appointment for ${payload.serviceName}. See you on ${dayDate} at ${payload.appointmentTime}`;
    return sendWhatsApp(payload.phone, message);
  } catch (error) {
    console.error("Error sending WhatsApp confirmation:", error);
    throw error;
  }
}

/**
 * Send "one day before" reminder via WhatsApp.
 * Uses AI when available; otherwise fixed text.
 */
export async function sendReminderOneDayBeforeWhatsApp(payload: NotificationPayload) {
  try {
    const aiMessage = await generateNotificationMessage("reminder_1day", {
      name: payload.name,
      serviceName: payload.serviceName,
      appointmentDate: payload.appointmentDate,
      appointmentTime: payload.appointmentTime,
    });
    const message =
      aiMessage ||
      `Hi ${payload.name}, we kindly remind you that you have an appointment tomorrow at ${payload.appointmentTime}. Don't forget!`;
    return sendWhatsApp(payload.phone, message);
  } catch (error) {
    console.error("Error sending day-before reminder:", error);
    throw error;
  }
}

/**
 * Send "1 hour before" reminder via WhatsApp.
 * Uses AI when available; otherwise fixed text.
 */
export async function sendReminderWhatsApp(payload: NotificationPayload) {
  try {
    const aiMessage = await generateNotificationMessage("reminder_1hour", {
      name: payload.name,
      serviceName: payload.serviceName,
      appointmentDate: payload.appointmentDate,
      appointmentTime: payload.appointmentTime,
    });
    const message =
      aiMessage ||
      `Hi ${payload.name}, you have an appointment for ${payload.serviceName} at ${payload.appointmentTime}. See you soon!`;
    return sendWhatsApp(payload.phone, message);
  } catch (error) {
    console.error("Error sending reminder:", error);
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
 * Notify client via WhatsApp when admin cancels an appointment.
 */
export async function sendAppointmentCancelledWhatsApp(payload: {
  phone: string;
  name: string;
  serviceName: string;
  appointmentDate: string;
  appointmentTime: string;
}) {
  const dayDate =
    payload.appointmentDate &&
    !Number.isNaN(new Date(payload.appointmentDate).getTime())
      ? new Date(payload.appointmentDate).toLocaleDateString("en-GB", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        })
      : payload.appointmentDate;
  const message = `Hi ${payload.name}, your appointment for ${payload.serviceName} on ${dayDate} at ${payload.appointmentTime} has been cancelled. If you have any questions, please contact us.`;
  return sendWhatsApp(payload.phone, message);
}

/**
 * Notify client via WhatsApp when admin reschedules an appointment.
 */
export async function sendAppointmentRescheduledWhatsApp(payload: {
  phone: string;
  name: string;
  serviceName: string;
  newDate: string;
  newTime: string;
}) {
  const dayDate =
    payload.newDate && !Number.isNaN(new Date(payload.newDate).getTime())
      ? new Date(payload.newDate).toLocaleDateString("en-GB", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        })
      : payload.newDate;
  const message = `Hi ${payload.name}, your appointment for ${payload.serviceName} has been rescheduled to ${dayDate} at ${payload.newTime}. Please save the new date and time.`;
  return sendWhatsApp(payload.phone, message);
}

/**
 * Notify client via WhatsApp when admin marks an appointment as completed.
 */
export async function sendAppointmentCompletedWhatsApp(payload: {
  phone: string;
  name: string;
  serviceName: string;
  appointmentDate: string;
  appointmentTime: string;
}) {
  const dayDate =
    payload.appointmentDate &&
    !Number.isNaN(new Date(payload.appointmentDate).getTime())
      ? new Date(payload.appointmentDate).toLocaleDateString("en-GB", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        })
      : payload.appointmentDate;
  const message = `Hi ${payload.name}, your appointment for ${payload.serviceName} on ${dayDate} at ${payload.appointmentTime} has been marked as completed. Thank you for visiting us!`;
  return sendWhatsApp(payload.phone, message);
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
