 'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/utils';

interface Booking {
  id: number;
  name: string;
  email: string;
  phone: string;
  cin?: string;
  serviceId?: string | number;
  serviceName: string;
  price: number;
  appointmentDate: string;
  appointmentTime: string;
  notes?: string;
}

export default function CheckoutPage() {
  const params = useParams();
  const router = useRouter();
  const bookingId = parseInt(params.bookingId as string);

  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const fetchBooking = async () => {
      try {
        const response = await fetch(`/api/bookings?id=${bookingId}`);
        if (!response.ok) throw new Error('Failed to fetch booking');
        const data = await response.json();
        setBooking(data.booking);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchBooking();
  }, [bookingId]);

  const handleCheckout = async () => {
    if (!booking) return;

    setProcessing(true);
    setError(null);

    try {
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: booking.name,
          email: booking.email,
          phone: booking.phone,
          cin: booking.cin,
          serviceId: booking.serviceId,
          serviceName: booking.serviceName,
          price: booking.price,
          appointmentDate: booking.appointmentDate,
          appointmentTime: booking.appointmentTime,
          notes: booking.notes,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to create appointment');
      }

      const { appointment } = await res.json();
      window.location.href = `/checkout/success?appointment_id=${appointment.id}`;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-10 w-32 mb-8" />
          <div className="max-w-2xl mx-auto">
            <Skeleton className="h-96" />
          </div>
        </div>
      </main>
    );
  }

  if (error || !booking) {
    return (
      <main className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <Link href="/">
            <Button variant="outline" className="mb-8">← Back to Services</Button>
          </Link>
          <div className="max-w-2xl mx-auto text-center py-12">
            <p className="text-destructive text-lg">{error || 'Booking not found'}</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <Link href="/">
          <Button variant="outline" className="mb-8">← Back to Services</Button>
        </Link>

        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Payment & Confirmation</h1>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Booking Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Service</p>
                  <p className="font-semibold">{booking.serviceName}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Amount</p>
                  <p className="font-semibold text-lg text-primary">{formatCurrency(booking.price)}</p>
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Name</p>
                    <p className="font-medium">{booking.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">{booking.email}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Date</p>
                    <p className="font-medium">{new Date(booking.appointmentDate).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Time</p>
                    <p className="font-medium">{booking.appointmentTime}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Payment Method</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {error && (
                <div className="p-3 bg-destructive/10 text-destructive rounded-md text-sm">
                  {error}
                </div>
              )}

              <p className="text-sm text-muted-foreground">
                Secure payment via Stripe. Your payment information is encrypted and secure.
              </p>

              <Button
                onClick={handleCheckout}
                disabled={processing}
                className="w-full bg-primary hover:bg-primary/90"
                size="lg"
              >
                {processing ? 'Processing...' : 'Proceed to Payment'}
              </Button>

              <p className="text-xs text-muted-foreground text-center">
                After successful payment, you'll receive a confirmation email with your appointment details.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
