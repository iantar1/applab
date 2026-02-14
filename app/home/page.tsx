'use client';

import { useState, useEffect } from 'react';
import { History, Shield, Calendar, Settings, LogOut, User, Clock, CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';
import { formatCurrency } from '@/lib/utils';

type NavItem = 'history' | 'insurance' | 'appointments' | 'settings';

interface UserData {
  id: string;
  fullName: string;
  phone: string;
  email?: string;
  cin?: string;
}

interface Service {
  id: string | number;
  name: string;
  description: string;
  price: number;
  duration: number;
  category: string;
}

interface AppointmentItem {
  id: string;
  appointmentDate: string;
  appointmentTime: string;
  totalPrice: number;
  status: string;
  service: { name: string; category: string };
  guestName?: string | null;
}

const navItems: { id: NavItem; label: string; icon: React.ReactNode }[] = [
  { id: 'history', label: 'History', icon: <History className="h-5 w-5" /> },
  { id: 'insurance', label: 'Insurance', icon: <Shield className="h-5 w-5" /> },
  { id: 'appointments', label: 'Appointments', icon: <Calendar className="h-5 w-5" /> },
  { id: 'settings', label: 'Settings', icon: <Settings className="h-5 w-5" /> },
];

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<NavItem>('appointments');
  const [user, setUser] = useState<UserData | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [appointments, setAppointments] = useState<AppointmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [servicesLoading, setServicesLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch('/api/auth/me');
        const data = await res.json();
        if (data.user) {
          setUser(data.user);
        } else {
          router.push('/login');
        }
      } catch (error) {
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [router]);

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const res = await fetch('/api/services');
        const data = await res.json();
        if (data.services) {
          setServices(data.services);
        }
      } catch (error) {
        console.error('Error fetching services:', error);
      } finally {
        setServicesLoading(false);
      }
    };

    fetchServices();
  }, []);

  useEffect(() => {
    if (activeTab !== 'history') return;
    let cancelled = false;
    setHistoryLoading(true);
    const fetchAppointments = async () => {
      try {
        const res = await fetch('/api/appointments');
        if (!res.ok) {
          if (res.status === 401) {
            router.push('/login');
            return;
          }
          return;
        }
        const data = await res.json();
        if (!cancelled && data.appointments) {
          setAppointments(data.appointments);
        }
      } catch (error) {
        console.error('Error fetching appointments:', error);
      } finally {
        if (!cancelled) setHistoryLoading(false);
      }
    };
    fetchAppointments();
    return () => { cancelled = true; };
  }, [activeTab, router]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  const handleBookService = (serviceId: number | string) => {
    router.push(`/services/${serviceId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'appointments':
        return (
          <div className="w-full">
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-gray-800">Book an Appointment</h2>
              <p className="text-gray-500 mt-2">Select a service to schedule your appointment</p>
            </div>
            
            {servicesLoading ? (
              <div className="text-center py-12">
                <p className="text-gray-500">Loading services...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {services.map((service) => (
                  <Card key={service.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-lg">{service.name}</CardTitle>
                        <Badge variant="secondary">{service.category}</Badge>
                      </div>
                      <CardDescription>{service.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <span className="font-bold">{service.price} MAD</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          <span>{service.duration} min</span>
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter>
                      <Button 
                        className="w-full" 
                        onClick={() => handleBookService(service.id)}
                      >
                        Book Now
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}
          </div>
        );
      case 'history':
        return (
          <div className="w-full">
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-gray-800">Appointment History</h2>
              <p className="text-gray-500 mt-2">All your booked appointments</p>
            </div>
            {historyLoading ? (
              <div className="text-center py-12">
                <p className="text-gray-500">Loading your appointments...</p>
              </div>
            ) : appointments.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg shadow">
                <CalendarDays className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 font-medium">No appointments yet</p>
                <p className="text-gray-500 text-sm mt-1">Book a service from the Appointments tab to see them here.</p>
                <Button
                  className="mt-4"
                  onClick={() => setActiveTab('appointments')}
                >
                  Book an Appointment
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {appointments.map((apt) => {
                  const date = new Date(apt.appointmentDate);
                  const dateStr = date.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
                  const timeStr = apt.appointmentTime?.replace(/^(\d{1,2}):(\d{2})$/, (_, h, m) => {
                    const hour = parseInt(h, 10);
                    return `${hour > 12 ? hour - 12 : hour}:${m} ${hour >= 12 ? 'PM' : 'AM'}`;
                  }) || apt.appointmentTime;
                  return (
                    <Card key={apt.id} className="overflow-hidden">
                      <CardHeader className="pb-2">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <CardTitle className="text-lg">{apt.service.name}</CardTitle>
                            <CardDescription>{apt.service.category}</CardDescription>
                          </div>
                          <Badge variant={apt.status === 'completed' ? 'default' : apt.status === 'paid' ? 'secondary' : 'outline'}>
                            {apt.status}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-1 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-gray-500" />
                          <span>{dateStr}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-gray-500" />
                          <span>{timeStr}</span>
                        </div>
                        <p className="font-semibold text-primary pt-2">{formatCurrency(apt.totalPrice)}</p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        );
      case 'settings':
        return (
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-primary/10 rounded-full mb-4">
              <User className="h-10 w-10 text-primary" />
            </div>
            <h2 className="text-3xl font-bold text-gray-700 mb-6">Settings</h2>
            <div className="bg-white rounded-lg shadow p-6 max-w-md mx-auto text-left">
              <h3 className="text-lg font-semibold mb-4 text-gray-800">User Information</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-sm text-gray-500">Full Name</label>
                  <p className="text-gray-800 font-medium">{user?.fullName || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">Phone</label>
                  <p className="text-gray-800 font-medium">{user?.phone || 'N/A'}</p>
                </div>
                {user?.cin && (
                  <div>
                    <label className="text-sm text-gray-500">CIN</label>
                    <p className="text-gray-800 font-medium">{user.cin}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      default:
        return (
          <div className="text-center">
            <h2 className="text-4xl font-bold text-gray-400 capitalize">
              {activeTab}
            </h2>
            <p className="mt-2 text-gray-500">
              This is the {activeTab} page
            </p>
          </div>
        );
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Left Sidebar */}
      <aside className="w-64 bg-primary text-white flex flex-col">
        <div className="p-6 border-b border-white/20">
          <h1 className="text-2xl font-bold">AppLab</h1>
          {user && (
            <p className="text-sm text-white/70 mt-1">Welcome, {user.fullName}</p>
          )}
        </div>
        
        <nav className="flex-1 p-4">
          <ul className="space-y-2">
            {navItems.map((item) => (
              <li key={item.id}>
                <button
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    activeTab === item.id
                      ? 'bg-white/20 text-white'
                      : 'text-white/70 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <div className="p-4 border-t border-white/20">
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-white/70 hover:text-white hover:bg-white/10"
            onClick={handleLogout}
          >
            <LogOut className="h-5 w-5" />
            <span>Logout</span>
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 bg-gray-50 overflow-auto">
        <div className="p-8">
          {renderContent()}
        </div>
      </main>
    </div>
  );
}
