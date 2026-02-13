import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY environment variable is not set");
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-12-31.acpi",
});

export async function createCheckoutSession({
  appointmentId,
  amount,
  customerEmail,
  customerPhone,
}: {
  appointmentId: string;
  amount: number;
  customerEmail?: string;
  customerPhone: string;
}) {
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "mad",
          product_data: {
            name: "Lab Service Appointment",
            description: `Appointment ID: ${appointmentId}`,
          },
          unit_amount: Math.round(amount * 100), // Convert to cents
        },
        quantity: 1,
      },
    ],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/checkout?appointmentId=${appointmentId}`,
    customer_email: customerEmail,
    metadata: {
      appointmentId,
      customerPhone,
    },
  });

  return session;
}
