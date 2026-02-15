import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  sendReminderWhatsApp,
  sendReminderOneDayBeforeWhatsApp,
  sendReminderEmail,
} from "@/lib/notification-service";

/**
 * GET: Check for appointments and send:
 * - "1 day before" reminder (appointment is tomorrow)
 * - "1 hour before" reminder (appointment is in ~1 hour)
 * Call this endpoint every 5 minutes from a cron job or external scheduler
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const schedulerSecret = process.env.SCHEDULER_SECRET;
    if (schedulerSecret && authHeader !== `Bearer ${schedulerSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    const today = now.toISOString().split("T")[0];
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split("T")[0];
    const in1Hour = new Date(now.getTime() + 60 * 60 * 1000);
    const in55Min = new Date(now.getTime() + 55 * 60 * 1000);

    const upcomingAppointments = await prisma.appointment.findMany({
      where: {
        status: { in: ["pending", "confirmed", "paid"] },
        appointmentDate: { gte: today },
      },
      include: { service: true, user: true },
    });

    const results: Array<{
      success: boolean;
      type: string;
      appointmentId: string;
      reminderKind?: "1day" | "1hour";
      phone?: string;
      email?: string;
      result?: unknown;
      error?: string;
    }> = [];

    for (const appointment of upcomingAppointments) {
      const appointmentDate =
        typeof appointment.appointmentDate === "string"
          ? appointment.appointmentDate
          : appointment.appointmentDate.toISOString().split("T")[0];
      const appointmentDateTime = new Date(
        `${appointmentDate}T${appointment.appointmentTime}:00`
      );
      const phone = appointment.guestPhone || appointment.user?.phone;
      const email = appointment.guestEmail || appointment.user?.email;
      const name =
        appointment.guestName ||
        appointment.user?.fullName ||
        "Customer";
      const serviceName =
        appointment.service?.name || "Your Service";

      const payload = {
        bookingId: parseInt(String(appointment.id), 10),
        email: email || "",
        phone: phone || "",
        name,
        serviceName,
        appointmentDate,
        appointmentTime: appointment.appointmentTime,
        type: "reminder" as const,
      };

      // 1) One day before: appointment is tomorrow (send once)
      if (
        appointmentDate === tomorrowStr &&
        !appointment.reminder1DaySentAt &&
        phone
      ) {
        try {
          await sendReminderOneDayBeforeWhatsApp(payload);
          await prisma.appointment.update({
            where: { id: appointment.id },
            data: { reminder1DaySentAt: now },
          });
          results.push({
            success: true,
            type: "whatsapp",
            reminderKind: "1day",
            appointmentId: appointment.id,
            phone,
          });
        } catch (error) {
          results.push({
            success: false,
            type: "whatsapp",
            reminderKind: "1day",
            appointmentId: appointment.id,
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }

      // 2) One hour before: appointment is in ~55–60 minutes (send once)
      if (
        appointmentDateTime >= in55Min &&
        appointmentDateTime <= in1Hour &&
        !appointment.reminder1HourSentAt &&
        phone
      ) {
        try {
          await sendReminderWhatsApp(payload);
          await prisma.appointment.update({
            where: { id: appointment.id },
            data: { reminder1HourSentAt: now },
          });
          results.push({
            success: true,
            type: "whatsapp",
            reminderKind: "1hour",
            appointmentId: appointment.id,
            phone,
          });
        } catch (error) {
          results.push({
            success: false,
            type: "whatsapp",
            reminderKind: "1hour",
            appointmentId: appointment.id,
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }

      // Optional: email reminders for 1-hour window
      if (
        appointmentDateTime >= in55Min &&
        appointmentDateTime <= in1Hour &&
        email
      ) {
        try {
          await sendReminderEmail(payload);
          results.push({
            success: true,
            type: "email",
            appointmentId: appointment.id,
            email,
          });
        } catch (error) {
          results.push({
            success: false,
            type: "email",
            appointmentId: appointment.id,
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Checked ${upcomingAppointments.length} appointments. Sent ${results.length} reminders.`,
      reminders: results,
      checkedAt: now.toISOString(),
    });
  } catch (error) {
    console.error("Error in appointment reminder scheduler:", error);
    return NextResponse.json(
      {
        error: "Failed to process appointment reminders",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * POST: Manually trigger a reminder for a specific appointment
 * Body: { appointmentId: number }
 */
export async function POST(request: NextRequest) {
  try {
    const { appointmentId } = await request.json();

    if (!appointmentId) {
      return NextResponse.json(
        { error: "appointmentId is required" },
        { status: 400 }
      );
    }

    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: { service: true, user: true },
    });

    if (!appointment) {
      return NextResponse.json(
        { error: "Appointment not found" },
        { status: 404 }
      );
    }

    const phone = appointment.guestPhone || appointment.user?.phone;
    const email = appointment.guestEmail || appointment.user?.email;
    const name = appointment.guestName || appointment.user?.fullName || "Customer";

    const appointmentDateStr = typeof appointment.appointmentDate === 'string' 
      ? appointment.appointmentDate 
      : appointment.appointmentDate.toISOString().split('T')[0];

    const payload = {
      bookingId: parseInt(String(appointment.id), 10),
      email: email || "",
      phone: phone || "",
      name,
      serviceName: appointment.service?.name || "Your Service",
      appointmentDate: appointmentDateStr,
      appointmentTime: appointment.appointmentTime,
      type: "reminder" as const,
    };

    const results = {
      whatsapp: null,
      email: null,
      errors: [] as string[],
    };

    if (phone) {
      try {
        results.whatsapp = await sendReminderWhatsApp(payload);
      } catch (error) {
        results.errors.push(
          `WhatsApp: ${error instanceof Error ? error.message : "Failed to send"}`
        );
      }
    }

    if (email) {
      try {
        results.email = await sendReminderEmail(payload);
      } catch (error) {
        results.errors.push(
          `Email: ${error instanceof Error ? error.message : "Failed to send"}`
        );
      }
    }

    return NextResponse.json({
      success: results.errors.length === 0,
      results,
      appointmentId,
    });
  } catch (error) {
    console.error("Error sending manual reminder:", error);
    return NextResponse.json(
      {
        error: "Failed to send reminder",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
