'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/utils';

/** Appointment from GET /api/appointments (admin sees all) */
interface AppointmentRow {
  id: string;
  appointmentDate: string;
  appointmentTime: string;
  status: string;
  totalPrice: number;
  guestName: string | null;
  guestEmail: string | null;
  guestPhone: string | null;
  service?: { name: string };
  user?: { fullName: string; email: string; phone: string } | null;
}

export function AdminBookingsTable() {
  const [appointments, setAppointments] = useState<AppointmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAppointments = async () => {
      try {
        const response = await fetch('/api/appointments', { credentials: 'include' });
        if (!response.ok) throw new Error('Failed to fetch appointments');
        const data = await response.json();
        setAppointments(data.appointments ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchAppointments();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Bookings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Bookings</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-destructive">{error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Bookings ({appointments.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b">
              <tr className="text-left text-sm">
                <th className="pb-3 font-semibold">Name</th>
                <th className="pb-3 font-semibold">Service</th>
                <th className="pb-3 font-semibold">Date & Time</th>
                <th className="pb-3 font-semibold">Status</th>
                <th className="pb-3 font-semibold">Amount</th>
                <th className="pb-3 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {appointments.map((apt) => (
                <tr key={apt.id} className="text-sm hover:bg-muted/50">
                  <td className="py-3">
                    <div>
                      <p className="font-medium">{apt.guestName ?? apt.user?.fullName ?? '—'}</p>
                      <p className="text-xs text-muted-foreground">{apt.guestEmail ?? apt.user?.email ?? '—'}</p>
                    </div>
                  </td>
                  <td className="py-3">{apt.service?.name ?? '—'}</td>
                  <td className="py-3">
                    <div>
                      <p>{new Date(apt.appointmentDate).toLocaleDateString()}</p>
                      <p className="text-xs text-muted-foreground">{apt.appointmentTime}</p>
                    </div>
                  </td>
                  <td className="py-3">
                    <Badge className={getStatusColor(apt.status)}>
                      {apt.status}
                    </Badge>
                  </td>
                  <td className="py-3 font-semibold">{formatCurrency(apt.totalPrice)}</td>
                  <td className="py-3">
                    <Button variant="outline" size="sm">
                      View
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {appointments.length === 0 && (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No bookings yet</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
