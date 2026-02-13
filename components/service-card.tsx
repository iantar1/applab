'use client';

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';

interface ServiceCardProps {
  id: number;
  name: string;
  description: string;
  price: number;
  duration: number;
  category: string;
}

export function ServiceCard({
  id,
  name,
  description,
  price,
  duration,
  category
}: ServiceCardProps) {
  return (
    <Card className="flex flex-col hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="text-sm font-medium text-secondary mb-2">{category}</div>
            <CardTitle className="text-xl">{name}</CardTitle>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        <CardDescription className="mb-4 flex-1">{description}</CardDescription>
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-2xl font-bold text-primary">{formatCurrency(price)}</div>
            <div className="text-xs text-muted-foreground">{duration} mins</div>
          </div>
        </div>
        <Link href={`/services/${id}`}>
          <Button className="w-full bg-primary hover:bg-primary/90">
            Book Appointment
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
