'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { formatCurrency } from '@/lib/utils';

interface BookingFormProps {
  serviceId: string | number;
  serviceName: string;
  price: number;
}

// Available dates (alternating: one day on, one day off starting from Feb 15, 2026)
const getAvailableDates = (): Date[] => {
  const available: Date[] = [];
  // Feb 15, 17, 19, 21, 23, 25, 27 (alternating pattern)
  const febDays = [15, 17, 19, 21, 23, 25, 27];
  febDays.forEach(day => {
    available.push(new Date(2026, 1, day));
  });
  // March dates too
  const marchDays = [1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25, 27, 29, 31];
  marchDays.forEach(day => {
    available.push(new Date(2026, 2, day));
  });
  return available;
};

const availableDatesArray = getAvailableDates();

// Check if a date is available
const isDateAvailable = (date: Date): boolean => {
  return availableDatesArray.some(
    availableDate => 
      availableDate.getFullYear() === date.getFullYear() &&
      availableDate.getMonth() === date.getMonth() &&
      availableDate.getDate() === date.getDate()
  );
};

// Available time slots (alternating: one on, one off)
const allTimeSlots = [
  { value: '09:00', label: '9:00 AM', available: true },
  { value: '09:30', label: '9:30 AM', available: false },
  { value: '10:00', label: '10:00 AM', available: true },
  { value: '10:30', label: '10:30 AM', available: false },
  { value: '11:00', label: '11:00 AM', available: true },
  { value: '11:30', label: '11:30 AM', available: false },
  { value: '14:00', label: '2:00 PM', available: true },
  { value: '14:30', label: '2:30 PM', available: false },
  { value: '15:00', label: '3:00 PM', available: true },
  { value: '15:30', label: '3:30 PM', available: false },
  { value: '16:00', label: '4:00 PM', available: true },
  { value: '16:30', label: '4:30 PM', available: false },
];

export function BookingForm({ serviceId, serviceName, price }: BookingFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [userLoaded, setUserLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showUnavailableAlert, setShowUnavailableAlert] = useState(false);
  const [showUnavailableTimeAlert, setShowUnavailableTimeAlert] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    appointmentDate: '',
    appointmentTime: '',
    notes: ''
  });

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch('/api/auth/me');
        const data = await res.json();
        if (data.user) {
          setFormData(prev => ({
            ...prev,
            name: data.user.fullName ?? '',
            email: data.user.email ?? '',
            phone: data.user.phone ?? '',
          }));
        } else {
          router.push('/login');
          return;
        }
      } catch {
        router.push('/login');
        return;
      } finally {
        setUserLoaded(true);
      }
    };
    fetchUser();
  }, [router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (date < today) return;
    
    if (isDateAvailable(date)) {
      setSelectedDate(date);
      setFormData(prev => ({ 
        ...prev, 
        appointmentDate: date.toISOString().split('T')[0] 
      }));
      setShowUnavailableAlert(false);
    } else {
      setShowUnavailableAlert(true);
      setTimeout(() => setShowUnavailableAlert(false), 3000);
    }
  };

  const handleTimeSelect = (slot: { value: string; label: string; available: boolean }) => {
    if (slot.available) {
      setFormData(prev => ({ ...prev, appointmentTime: slot.value }));
      setShowUnavailableTimeAlert(false);
    } else {
      setShowUnavailableTimeAlert(true);
      setTimeout(() => setShowUnavailableTimeAlert(false), 3000);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          serviceId,
          serviceName,
          price
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create booking');
      }

      const booking = await response.json();
      router.push(`/checkout/${booking.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Custom modifiers for calendar styling
  const modifiers = {
    available: availableDatesArray,
    unavailable: (date: Date) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return date >= today && !isDateAvailable(date);
    }
  };

  const modifiersClassNames = {
    available:
      'text-green-600 font-bold hover:!bg-green-500 hover:!text-white focus:!bg-green-500 focus:!text-white',
    unavailable:
      'text-red-500 font-bold relative before:content-[""] before:absolute before:top-1/2 before:left-1/2 before:-translate-x-1/2 before:-translate-y-1/2 before:w-5 before:h-[2px] before:bg-red-500 before:rotate-45'
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Book Your Appointment</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-destructive/10 text-destructive rounded-md text-sm">
              {error}
            </div>
          )}

          {showUnavailableTimeAlert && (
            <Alert variant="destructive" className="animate-pulse">
              <AlertDescription>
                This time slot is unavailable. Please choose another time (green times are available).
              </AlertDescription>
            </Alert>
          )}

          {!userLoaded && (
            <div className="text-sm text-muted-foreground py-2">Loading your account...</div>
          )}

          <div className="space-y-2 relative">
            <Label>Appointment Date</Label>
            {showUnavailableAlert && (
              <div className="absolute left-0 right-0 bottom-full z-10 mb-2 flex justify-center pointer-events-none">
                <div className="bg-red-500 text-white text-sm font-medium px-4 py-2 rounded-md shadow-lg animate-pulse max-w-md text-center">
                  This date is unavailable. Please choose another date (green dates are available).
                </div>
              </div>
            )}
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
              <span className="text-green-600 font-bold">15</span>
              <span>Available</span>
              <span className="text-red-500 font-bold relative ml-2">
                16
                <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-[2px] bg-red-500 rotate-45"></span>
              </span>
              <span className="ml-1">Unavailable</span>
            </div>
            <div className="border rounded-md p-3">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={handleDateSelect}
                modifiers={modifiers}
                modifiersClassNames={modifiersClassNames}
                disabled={(date) => {
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  return date < today;
                }}
                className="rounded-md"
                classNames={{
                  selected:
                    '!bg-green-600 !text-white hover:!bg-green-600 focus:!bg-green-600',
                  // Today: same as other dates – no border, no accent; keep text visible on hover
                  today:
                    '!bg-transparent hover:!bg-transparent hover:!text-inherit focus:!bg-transparent focus:!text-inherit',
                }}
              />
            </div>
            {selectedDate && (
              <p className="text-sm text-green-600 font-medium">
                Selected: {selectedDate.toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Preferred Time</Label>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
              <span className="text-green-600 font-bold">9:00</span>
              <span>Available</span>
              <span className="text-red-500 font-bold relative ml-2">
                9:30
                <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-[2px] bg-red-500 rotate-45"></span>
              </span>
              <span className="ml-1">Unavailable</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {allTimeSlots.map((slot) => (
                <button
                  key={slot.value}
                  type="button"
                  onClick={() => handleTimeSelect(slot)}
                  className={`
                    relative p-2 text-sm border rounded-md transition-all
                    ${formData.appointmentTime === slot.value 
                      ? 'bg-primary text-white border-primary' 
                      : slot.available 
                        ? 'text-green-600 font-bold hover:bg-green-50 border-green-200' 
                        : 'text-red-500 font-bold hover:bg-red-50 border-red-200'
                    }
                  `}
                >
                  {slot.label}
                  {!slot.available && formData.appointmentTime !== slot.value && (
                    <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-[2px] bg-red-500 rotate-45"></span>
                  )}
                </button>
              ))}
            </div>
            {formData.appointmentTime && (
              <p className="text-sm text-green-600 font-medium">
                Selected: {allTimeSlots.find(s => s.value === formData.appointmentTime)?.label}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Additional Notes (Optional)</Label>
            <textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              placeholder="Any special requirements or medical conditions..."
              className="w-full px-3 py-2 border border-input rounded-md text-sm"
              rows={3}
            />
          </div>

          <div className="bg-muted p-4 rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-muted-foreground">Service:</span>
              <span className="font-medium">{serviceName}</span>
            </div>
            <div className="flex justify-between items-center border-t pt-2">
              <span className="font-semibold">Total Amount:</span>
              <span className="text-2xl font-bold text-primary">{formatCurrency(price)}</span>
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading || !userLoaded || !formData.name || !formData.email || !formData.phone || !formData.appointmentDate || !formData.appointmentTime}
            className="w-full bg-primary hover:bg-primary/90"
            size="lg"
          >
            {loading ? 'Processing...' : 'Continue to Payment'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
