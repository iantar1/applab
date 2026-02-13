'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Check } from 'lucide-react';

export default function SuccessPage() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const bookingId = searchParams.get('booking_id');
  const [sessionData, setSessionData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (sessionId) {
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
    }
  }, [sessionId]);

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
              <CardTitle className="text-3xl text-green-600">Payment Successful!</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
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

              <div className="flex gap-4 pt-4">
                <Link href="/" className="flex-1">
                  <Button variant="outline" className="w-full">
                    Back to Home
                  </Button>
                </Link>
                <Link href="/appointments" className="flex-1">
                  <Button className="w-full bg-primary hover:bg-primary/90">
                    View My Appointments
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
