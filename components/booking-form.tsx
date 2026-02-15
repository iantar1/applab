'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { formatCurrency, validatePhoneWithCountryCode } from '@/lib/utils';

interface BookingFormProps {
  serviceId: string | number;
  serviceName: string;
  price: number;
}

type TakenSlot = { date: string; time: string };

// All bookable time slots (availability is computed from appointments per selected date)
const TIME_SLOTS = [
  { value: '09:00', label: '9:00 AM' },
  { value: '09:30', label: '9:30 AM' },
  { value: '10:00', label: '10:00 AM' },
  { value: '10:30', label: '10:30 AM' },
  { value: '11:00', label: '11:00 AM' },
  { value: '11:30', label: '11:30 AM' },
  { value: '14:00', label: '2:00 PM' },
  { value: '14:30', label: '2:30 PM' },
  { value: '15:00', label: '3:00 PM' },
  { value: '15:30', label: '3:30 PM' },
  { value: '16:00', label: '4:00 PM' },
  { value: '16:30', label: '4:30 PM' },
];

export function BookingForm({ serviceId, serviceName, price }: BookingFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [userLoaded, setUserLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phoneWarning, setPhoneWarning] = useState<string | null>(null);
  const [showUnavailableAlert, setShowUnavailableAlert] = useState(false);
  const [showUnavailableTimeAlert, setShowUnavailableTimeAlert] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [takenSlots, setTakenSlots] = useState<TakenSlot[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    cin: '',
    appointmentDate: '',
    appointmentTime: '',
    notes: ''
  });
  const [isAdmin, setIsAdmin] = useState(false);

  const isSlotTaken = (dateStr: string, timeStr: string) =>
    takenSlots.some(s => s.date === dateStr && s.time === timeStr);

  useEffect(() => {
    const fetchSlots = async () => {
      try {
        const res = await fetch(`/api/appointments/slots?serviceId=${encodeURIComponent(String(serviceId))}`);
        if (res.ok) {
          const data = await res.json();
          setTakenSlots(data.takenSlots ?? []);
        }
      } catch {
        setTakenSlots([]);
      }
    };
    fetchSlots();
  }, [serviceId]);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch('/api/auth/me');
        const data = await res.json();
        if (data.user) {
          const admin = data.user.isAdmin === true;
          setIsAdmin(admin);
          if (!admin) {
            setFormData(prev => ({
              ...prev,
              name: data.user.fullName ?? '',
              email: data.user.email ?? '',
              phone: data.user.phone ?? '',
              cin: data.user.cin ?? '',
            }));
          }
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
    setSelectedDate(date);
    const dateStr = date.toISOString().split('T')[0];
    setFormData(prev => {
      const next = { ...prev, appointmentDate: dateStr };
      if (prev.appointmentTime && isSlotTaken(dateStr, prev.appointmentTime)) {
        next.appointmentTime = '';
      }
      return next;
    });
    setShowUnavailableAlert(false);
  };

  const handleTimeSelect = (slotValue: string, available: boolean) => {
    if (available) {
      setFormData(prev => ({ ...prev, appointmentTime: slotValue }));
      setShowUnavailableTimeAlert(false);
    } else {
      setShowUnavailableTimeAlert(true);
      setTimeout(() => setShowUnavailableTimeAlert(false), 3000);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setPhoneWarning(null);
    const phoneValidation = validatePhoneWithCountryCode(formData.phone);
    if (phoneValidation) {
      setPhoneWarning(phoneValidation);
      return;
    }
    setLoading(true);
    try {
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          cin: formData.cin || undefined,
          appointmentDate: formData.appointmentDate,
          appointmentTime: formData.appointmentTime,
          notes: formData.notes,
          serviceId,
          serviceName,
          price,
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

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const modifiers = {
    available: (date: Date) => date >= today,
  };

  const modifiersClassNames = {
    available:
      'text-green-600 font-bold hover:!bg-green-500 hover:!text-white focus:!bg-green-500 focus:!text-white',
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

          {isAdmin && (
            <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">
              Booking for another person. Enter their details below. You cannot book for yourself.
            </p>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="booking-name">Full name</Label>
              <input
                id="booking-name"
                name="name"
                type="text"
                value={formData.name}
                onChange={handleChange}
                placeholder={isAdmin ? "Guest's full name" : 'Your full name'}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="booking-email">Email</Label>
              <input
                id="booking-email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder={isAdmin ? "Guest's email" : 'your@email.com'}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="booking-phone">Phone number</Label>
              <input
                id="booking-phone"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => {
                  handleChange(e);
                  setPhoneWarning(null);
                }}
                placeholder={isAdmin ? "Guest's phone" : '212600000000'}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                required
              />
              {phoneWarning && (
                <p className="text-sm text-amber-600 dark:text-amber-500" role="alert">
                  {phoneWarning}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="booking-cin">CIN</Label>
              <input
                id="booking-cin"
                name="cin"
                type="text"
                value={formData.cin}
                onChange={handleChange}
                placeholder={isAdmin ? "Guest's CIN" : 'National ID'}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                required={isAdmin}
              />
            </div>
          </div>

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
              <span className="ml-1">Already booked</span>
            </div>
            {!formData.appointmentDate && (
              <p className="text-sm text-muted-foreground">Select a date above to see available times.</p>
            )}
            <div className="grid grid-cols-3 gap-2">
              {TIME_SLOTS.map((slot) => {
                const dateStr = formData.appointmentDate;
                const available = !dateStr || !isSlotTaken(dateStr, slot.value);
                return (
                  <button
                    key={slot.value}
                    type="button"
                    onClick={() => handleTimeSelect(slot.value, available)}
                    disabled={!formData.appointmentDate}
                    className={`
                      relative p-2 text-sm border rounded-md transition-all disabled:opacity-60
                      ${formData.appointmentTime === slot.value
                        ? 'bg-primary text-white border-primary'
                        : available
                          ? 'text-green-600 font-bold hover:bg-green-50 border-green-200'
                          : 'text-red-500 font-bold hover:bg-red-50 border-red-200 cursor-not-allowed'
                      }
                    `}
                  >
                    {slot.label}
                    {!available && formData.appointmentTime !== slot.value && (
                      <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-[2px] bg-red-500 rotate-45"></span>
                    )}
                  </button>
                );
              })}
            </div>
            {formData.appointmentTime && (
              <p className="text-sm text-green-600 font-medium">
                Selected: {TIME_SLOTS.find(s => s.value === formData.appointmentTime)?.label}
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
            disabled={
              loading ||
              !userLoaded ||
              !formData.name ||
              !formData.email ||
              !formData.phone ||
              (isAdmin && !formData.cin) ||
              !formData.appointmentDate ||
              !formData.appointmentTime
            }
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
