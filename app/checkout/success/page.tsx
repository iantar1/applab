'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, Calendar, Clock, FileText } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface AppointmentData {
  id: string;
  appointmentDate: string;
  appointmentTime: string;
  totalPrice: number;
  status: string;
  service: { name: string; category: string };
  guestName: string | null;
  guestEmail: string | null;
  guestPhone: string | null;
  notes: string | null;
}

export default function SuccessPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const appointmentId = searchParams.get('appointment_id');
  const sessionId = searchParams.get('session_id');
  const [appointment, setAppointment] = useState<AppointmentData | null>(null);
  const [sessionData, setSessionData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (appointmentId) {
      const fetchAppointment = async () => {
        try {
          const response = await fetch(`/api/appointments/${appointmentId}`);
          if (response.ok) {
            const data = await response.json();
            setAppointment(data.appointment);
          }
        } catch (error) {
          console.error('Error fetching appointment:', error);
        } finally {
          setLoading(false);
        }
      };
      fetchAppointment();
    } else if (sessionId) {
      const fetchSession = async () => {
        try {
          const response = await fetch(`/api/checkout?session_id=${sessionId}`);
          if (response.ok) {
            const data = await response.json();
            setSessionData(data.session);
          }
        } catch (error) {
          console.error('Error fetching session:', error);
        } finally {
          setLoading(false);
        }
      };
      fetchSession();
    } else {
      setLoading(false);
    }
  }, [appointmentId, sessionId]);

  // Redirect to home after showing success (when we have appointment_id)
  useEffect(() => {
    if (!appointmentId || !appointment) return;
    const t = setTimeout(() => {
      router.push('/home');
    }, 8000);
    return () => clearTimeout(t);
  }, [appointmentId, appointment, router]);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (timeStr: string) => {
    if (!timeStr) return '';
    const [h, m] = timeStr.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const hour = h % 12 || 12;
    return `${hour}:${m.toString().padStart(2, '0')} ${period}`;
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto text-center py-12 text-muted-foreground">
            Loading...
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <Card className="border-2 border-green-500">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <div className="rounded-full bg-green-100 p-3">
                  <Check className="w-8 h-8 text-green-600" />
                </div>
              </div>
              <CardTitle className="text-3xl text-green-600">
                {appointment ? 'Appointment Booked Successfully!' : 'Payment Successful!'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {appointment ? (
                <>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-green-800 font-medium">
                      You have successfully booked <strong>{appointment.service.name}</strong>.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg">Appointment details</h3>
                    <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-primary" />
                        <div>
                          <p className="text-sm text-muted-foreground">Service (type)</p>
                          <p className="font-semibold">{appointment.service.name}</p>
                          {appointment.service.category && (
                            <p className="text-sm text-muted-foreground">{appointment.service.category}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Calendar className="h-5 w-5 text-primary" />
                        <div>
                          <p className="text-sm text-muted-foreground">Date</p>
                          <p className="font-medium">{formatDate(appointment.appointmentDate)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Clock className="h-5 w-5 text-primary" />
                        <div>
                          <p className="text-sm text-muted-foreground">Time</p>
                          <p className="font-medium">{formatTime(appointment.appointmentTime)}</p>
                        </div>
                      </div>
                      <div className="pt-2 border-t">
                        <p className="text-sm text-muted-foreground">Amount</p>
                        <p className="font-semibold text-primary">{formatCurrency(appointment.totalPrice)}</p>
                      </div>
                      {(appointment.guestName || appointment.guestEmail) && (
                        <div className="pt-2 border-t">
                          <p className="text-sm text-muted-foreground">Contact</p>
                          <p className="font-medium">{appointment.guestName}</p>
                          <p className="text-sm">{appointment.guestEmail}</p>
                          {appointment.guestPhone && (
                            <p className="text-sm">{appointment.guestPhone}</p>
                          )}
                        </div>
                      )}
                      {appointment.notes && (
                        <div className="pt-2 border-t">
                          <p className="text-sm text-muted-foreground">Notes</p>
                          <p className="text-sm">{appointment.notes}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <p className="text-sm text-muted-foreground text-center">
                    You will be redirected to your home page in a few seconds.
                  </p>
                </>
              ) : (
                <>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-green-800">
                      Your appointment has been confirmed. A confirmation email will be sent to you shortly with all the details.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg">What Happens Next?</h3>
                    <ol className="space-y-3">
                      <li className="flex gap-3">
                        <span className="font-semibold text-primary min-w-6">1.</span>
                        <span className="text-muted-foreground">You'll receive a confirmation email with your appointment details and lab address</span>
                      </li>
                      <li className="flex gap-3">
                        <span className="font-semibold text-primary min-w-6">2.</span>
                        <span className="text-muted-foreground">Arrive 10 minutes early on your appointment date</span>
                      </li>
                      <li className="flex gap-3">
                        <span className="font-semibold text-primary min-w-6">3.</span>
                        <span className="text-muted-foreground">Our trained technician will collect your sample</span>
                      </li>
                      <li className="flex gap-3">
                        <span className="font-semibold text-primary min-w-6">4.</span>
                        <span className="text-muted-foreground">Results will be available in your patient portal</span>
                      </li>
                    </ol>
                  </div>

                  {sessionData && (
                    <div className="bg-muted p-4 rounded-lg">
                      <p className="text-sm text-muted-foreground mb-2">Confirmation Email:</p>
                      <p className="font-medium">{sessionData.customer_email}</p>
                    </div>
                  )}
                </>
              )}

              <div className="flex gap-4 pt-4">
                <Link href="/home" className="flex-1">
                  <Button className="w-full bg-primary hover:bg-primary/90">
                    Go to My Home
                  </Button>
                </Link>
                <Link href="/" className="flex-1">
                  <Button variant="outline" className="w-full">
                    Back to Site
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
