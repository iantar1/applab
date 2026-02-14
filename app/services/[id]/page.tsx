'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { BookingForm } from '@/components/booking-form';

interface Service {
  id: string | number;
  name: string;
  description: string;
  fullDescription: string;
  price: number;
  duration: number;
  category: string;
  preparation: string;
  results: string;
}

export default function ServiceDetailPage() {
  const params = useParams();
  const serviceId = params.id as string;
  
  const [service, setService] = useState<Service | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchService = async () => {
      try {
        const response = await fetch(`/api/services/${serviceId}`);
        if (!response.ok) throw new Error('Failed to fetch service');
        const data = await response.json();
        setService(data.service);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchService();
  }, [serviceId]);

  if (loading) {
    return (
      <main className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-10 w-32 mb-8" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <Skeleton className="h-64 mb-4" />
              <Skeleton className="h-48" />
            </div>
            <Skeleton className="h-96" />
          </div>
        </div>
      </main>
    );
  }

  if (error || !service) {
    return (
      <main className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <Link href="/">
            <Button variant="outline" className="mb-8">← Back to Services</Button>
          </Link>
          <div className="text-center py-12">
            <p className="text-destructive text-lg">{error || 'Service not found'}</p>
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Service Details */}
          <div className="lg:col-span-2 space-y-6">
            <div>
              <div className="text-sm font-medium text-secondary mb-2">{service.category}</div>
              <h1 className="text-4xl font-bold mb-4">{service.name}</h1>
              <p className="text-lg text-muted-foreground">{service.description}</p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>About this Test</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">{service.fullDescription}</p>
                
                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                  <div>
                    <h4 className="font-semibold mb-2">Duration</h4>
                    <p className="text-muted-foreground">{service.duration} minutes</p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Results</h4>
                    <p className="text-muted-foreground">In {service.results}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Preparation Instructions</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{service.preparation}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>What to Expect</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <h4 className="font-semibold mb-1">Before the Test</h4>
                  <p className="text-sm text-muted-foreground">Follow the preparation instructions above. Arrive 10 minutes early to complete any paperwork.</p>
                </div>
                <div>
                  <h4 className="font-semibold mb-1">During the Test</h4>
                  <p className="text-sm text-muted-foreground">A trained phlebotomist will collect the sample. The process takes just a few minutes.</p>
                </div>
                <div>
                  <h4 className="font-semibold mb-1">After the Test</h4>
                  <p className="text-sm text-muted-foreground">You can resume normal activities immediately. Results will be available online within the specified timeframe.</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Booking Form */}
          <div className="lg:col-span-1">
            <BookingForm 
              serviceId={service.id}
              serviceName={service.name}
              price={service.price}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
