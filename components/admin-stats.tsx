'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

interface Stats {
  totalBookings: number;
  completedBookings: number;
  pendingBookings: number;
  totalRevenue: number;
}

export function AdminStats() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/appointments', { credentials: 'include' });
        if (response.ok) {
          const data = await response.json();
          const appointments = data.appointments ?? [];

          const totalBookings = appointments.length;
          const completedBookings = appointments.filter((a: { status: string }) => a.status === 'completed').length;
          const pendingBookings = appointments.filter((a: { status: string }) => a.status === 'pending').length;
          const totalRevenue = appointments.reduce((sum: number, a: { totalPrice?: number }) => sum + (Number(a.totalPrice) || 0), 0);

          setStats({
            totalBookings,
            completedBookings,
            pendingBookings,
            totalRevenue
          });
        }
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const statCards = [
    {
      title: 'Total Bookings',
      value: stats?.totalBookings || 0,
      color: 'bg-blue-100 text-blue-600'
    },
    {
      title: 'Completed',
      value: stats?.completedBookings || 0,
      color: 'bg-green-100 text-green-600'
    },
    {
      title: 'Pending',
      value: stats?.pendingBookings || 0,
      color: 'bg-yellow-100 text-yellow-600'
    },
    {
      title: 'Total Revenue',
      value: formatCurrency(stats?.totalRevenue || 0),
      color: 'bg-purple-100 text-purple-600'
    }
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {statCards.map((card, index) => (
        <Card key={index}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {card.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`inline-block px-3 py-2 rounded-lg ${card.color}`}>
              <p className="text-2xl font-bold">{card.value}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
