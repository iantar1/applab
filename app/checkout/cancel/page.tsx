'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { X } from 'lucide-react';

export default function CancelPage() {
  const searchParams = useSearchParams();
  const bookingId = searchParams.get('booking_id');

  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <Card className="border-2 border-orange-500">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <div className="rounded-full bg-orange-100 p-3">
                  <X className="w-8 h-8 text-orange-600" />
                </div>
              </div>
              <CardTitle className="text-3xl text-orange-600">Payment Cancelled</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <p className="text-orange-800">
                  Your payment was cancelled. Your booking information has been saved and you can complete it anytime.
                </p>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold text-lg">What Would You Like to Do?</h3>
                <div className="grid grid-cols-1 gap-3">
                  {bookingId && (
                    <Link href={`/checkout/${bookingId}`}>
                      <Button className="w-full bg-primary hover:bg-primary/90">
                        Return to Payment
                      </Button>
                    </Link>
                  )}
                  <Link href="/">
                    <Button variant="outline" className="w-full">
                      Continue Shopping
                    </Button>
                  </Link>
                </div>
              </div>

              <div className="bg-muted p-4 rounded-lg">
                <p className="text-sm text-muted-foreground mb-2">Need Help?</p>
                <p className="text-sm">
                  If you're experiencing issues with payment, please contact our support team or try a different payment method.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
