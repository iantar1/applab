import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendReminderWhatsApp, sendReminderEmail } from "@/lib/notification-service";

/**
 * GET: Check for appointments happening in the next 30 minutes and send reminders
 * Call this endpoint every 5 minutes from a cron job or external scheduler
 * 
 * Example: curl -X GET "http://localhost:3000/api/scheduler/appointment-reminders"
 */
export async function GET(request: NextRequest) {
  try {
    // Verify this is called from a trusted source (optional - can add API key check)
    const authHeader = request.headers.get("authorization");
    const schedulerSecret = process.env.SCHEDULER_SECRET;
    
    if (schedulerSecret && authHeader !== `Bearer ${schedulerSecret}`) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get current time
    const now = new Date();
    const in30Minutes = new Date(now.getTime() + 30 * 60 * 1000); // 30 minutes from now
    const in25Minutes = new Date(now.getTime() + 25 * 60 * 1000); // 25 minutes from now (buffer)

    // Find appointments that are:
    // 1. Between now and 30 minutes from now
    // 2. Have status "confirmed"
    // 3. Haven't been reminded yet (no reminder sent)
    const upcomingAppointments = await prisma.appointment.findMany({
      where: {
        status: "confirmed",
        appointmentDate: {
          gte: now.toISOString().split("T")[0], // Today or later
        },
      },
      include: {
        service: true,
        user: true,
      },
    });

    const remindersToSend = [];

    for (const appointment of upcomingAppointments) {
      // Combine date and time to get exact appointment time
      const appointmentDateTime = new Date(
        `${appointment.appointmentDate}T${appointment.appointmentTime}:00`
      );

      // Check if appointment is within the 30-minute reminder window
      if (appointmentDateTime >= now && appointmentDateTime <= in30Minutes) {
        // Check if we've already sent a reminder (optional - store in DB if needed)
        // For now, we'll send it if it's in the window
        
        const phone = appointment.guestPhone || appointment.user?.phone;
        const email = appointment.guestEmail || appointment.user?.email;
        const name = appointment.guestName || appointment.user?.fullName || "Customer";

        if (phone) {
          remindersToSend.push({
            type: "whatsapp",
            appointment,
            phone,
            email,
            name,
          });
        }
        
        if (email) {
          remindersToSend.push({
            type: "email",
            appointment,
            phone,
            email,
            name,
          });
        }
      }
    }

    // Send all reminders
    const results = [];
    for (const reminder of remindersToSend) {
      try {
        const appointmentDateStr = typeof reminder.appointment.appointmentDate === 'string' 
          ? reminder.appointment.appointmentDate 
          : reminder.appointment.appointmentDate.toISOString().split('T')[0];

        const payload = {
          bookingId: parseInt(String(reminder.appointment.id), 10),
          email: reminder.email || "",
          phone: reminder.phone || "",
          name: reminder.name,
          serviceName: reminder.appointment.service?.name || "Your Service",
          appointmentDate: appointmentDateStr,
          appointmentTime: reminder.appointment.appointmentTime,
          type: "reminder" as const,
        };

        if (reminder.type === "whatsapp" && reminder.phone) {
          const result = await sendReminderWhatsApp(payload);
          results.push({
            success: true,
            type: "whatsapp",
            appointmentId: reminder.appointment.id,
            phone: reminder.phone,
            result,
          });
        } else if (reminder.type === "email" && reminder.email) {
          const result = await sendReminderEmail(payload);
          results.push({
            success: true,
            type: "email",
            appointmentId: reminder.appointment.id,
            email: reminder.email,
            result,
          });
        }
      } catch (error) {
        results.push({
          success: false,
          type: reminder.type,
          appointmentId: reminder.appointment.id,
          error: error instanceof Error ? error.message : "Unknown error",
        });
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
