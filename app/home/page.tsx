'use client';

import { useState, useEffect } from 'react';
import { History, Shield, Calendar, Settings, LogOut, User, Clock, CalendarDays, Pencil, Plus, Trash2, MessageCircle, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useRouter } from 'next/navigation';
import { formatCurrency } from '@/lib/utils';

const INSURANCE_COMPANIES = [
  'Wafa Assurance',
  "RMA – Royale Marocaine d'Assurances",
  'AXA Assurance Maroc',
  'Sanlam Maroc',
  'AtlantaSanad Assurance',
  'MCMA (Mutuelle Centrale Marocaine d\'Assurances)',
  'La Marocaine Vie',
];

type NavItem = 'history' | 'insurance' | 'appointments' | 'messages' | 'settings';

interface UserData {
  id: string;
  fullName: string;
  phone: string;
  email?: string;
  cin?: string;
  isAdmin?: boolean;
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
  guestEmail?: string | null;
  guestPhone?: string | null;
  user?: { id: string; fullName: string; email: string; phone: string } | null;
}

interface InsuranceData {
  id: string;
  insuranceCompany: string;
  membershipNumber: string;
  contractNumber: string;
}

const baseNavItems: { id: NavItem; label: string; icon: React.ReactNode }[] = [
  { id: 'history', label: 'History', icon: <History className="h-5 w-5" /> },
  { id: 'insurance', label: 'Insurance', icon: <Shield className="h-5 w-5" /> },
  { id: 'appointments', label: 'Appointments', icon: <Calendar className="h-5 w-5" /> },
  { id: 'messages', label: 'Messages', icon: <MessageCircle className="h-5 w-5" /> },
  { id: 'settings', label: 'Settings', icon: <Settings className="h-5 w-5" /> },
];
function getNavItems(isAdmin: boolean): { id: NavItem; label: string; icon: React.ReactNode }[] {
  if (!isAdmin) return baseNavItems.filter((item) => item.id !== 'messages');
  return baseNavItems;
}

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<NavItem>('history');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [user, setUser] = useState<UserData | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [appointments, setAppointments] = useState<AppointmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [servicesLoading, setServicesLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [insurance, setInsurance] = useState<InsuranceData | null>(null);
  const [insuranceLoading, setInsuranceLoading] = useState(false);
  const [insuranceSaving, setInsuranceSaving] = useState(false);
  const [insuranceEditing, setInsuranceEditing] = useState(false);
  const [insuranceForm, setInsuranceForm] = useState({
    insuranceCompany: '',
    membershipNumber: '',
    contractNumber: '',
  });
  const [settingsForm, setSettingsForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    cin: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [settingsSuccess, setSettingsSuccess] = useState(false);
  // Admin: service management
  const [serviceDialogOpen, setServiceDialogOpen] = useState(false);
  const [serviceDialogMode, setServiceDialogMode] = useState<'create' | 'edit'>('create');
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [serviceForm, setServiceForm] = useState({
    name: '',
    description: '',
    price: '',
    category: '',
    duration: '30',
  });
  const [serviceSaving, setServiceSaving] = useState(false);
  const [serviceError, setServiceError] = useState<string | null>(null);
  const [deleteServiceId, setDeleteServiceId] = useState<string | null>(null);
  const [deletingService, setDeletingService] = useState(false);
  // Admin: Messages (WhatsApp)
  const [messages, setMessages] = useState<{ id: string; fromPhone: string; toPhone: string; body: string; sender: string | null; direction: string; createdAt: string }[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [whatsappReady, setWhatsappReady] = useState(false);
  const [whatsappQr, setWhatsappQr] = useState<string | null>(null);
  const [sendForm, setSendForm] = useState({ toPhone: '', body: '' });
  const [sendLoading, setSendLoading] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [appSettingsWhatsappPhone, setAppSettingsWhatsappPhone] = useState('');
  const [appSettingsSaving, setAppSettingsSaving] = useState(false);
  const [blockedNumbers, setBlockedNumbers] = useState<string[]>([]);
  const [newBlockedInput, setNewBlockedInput] = useState('');
  const router = useRouter();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch('/api/auth/me');
        const data = await res.json();
        if (data.user) {
          setUser(data.user);
          setSettingsForm({
            fullName: data.user.fullName ?? '',
            email: data.user.email ?? '',
            phone: data.user.phone ?? '',
            cin: data.user.cin ?? '',
            newPassword: '',
            confirmPassword: '',
          });
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

  function openCreateService() {
    setServiceDialogMode('create');
    setEditingServiceId(null);
    setServiceForm({ name: '', description: '', price: '', category: '', duration: '30' });
    setServiceError(null);
    setServiceDialogOpen(true);
  }

  function openEditService(service: Service) {
    setServiceDialogMode('edit');
    setEditingServiceId(String(service.id));
    setServiceForm({
      name: service.name,
      description: service.description ?? '',
      price: String(service.price),
      category: service.category,
      duration: String(service.duration ?? 30),
    });
    setServiceError(null);
    setServiceDialogOpen(true);
  }

  async function saveService() {
    setServiceError(null);
    const price = parseFloat(serviceForm.price);
    const duration = parseInt(serviceForm.duration, 10);
    if (!serviceForm.name.trim()) {
      setServiceError('Name is required');
      return;
    }
    if (Number.isNaN(price) || price < 0) {
      setServiceError('Valid price is required');
      return;
    }
    if (!serviceForm.category.trim()) {
      setServiceError('Category is required');
      return;
    }
    if (Number.isNaN(duration) || duration < 1) {
      setServiceError('Duration must be at least 1 minute');
      return;
    }
    setServiceSaving(true);
    try {
      if (serviceDialogMode === 'create') {
        const res = await fetch('/api/services', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: serviceForm.name.trim(),
            description: serviceForm.description.trim() || undefined,
            price,
            category: serviceForm.category.trim(),
            duration,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setServiceError(data.details ?? data.error ?? 'Failed to create service');
          return;
        }
        setServiceDialogOpen(false);
        setServicesLoading(true);
        await fetchServices();
      } else if (editingServiceId) {
        const res = await fetch(`/api/services/${editingServiceId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: serviceForm.name.trim(),
            description: serviceForm.description.trim() || undefined,
            price,
            category: serviceForm.category.trim(),
            duration,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setServiceError(data.details ?? data.error ?? 'Failed to update service');
          return;
        }
        setServiceDialogOpen(false);
        setServicesLoading(true);
        await fetchServices();
      }
    } catch (e) {
      setServiceError('Something went wrong');
    } finally {
      setServiceSaving(false);
    }
  }

  async function confirmDeleteService(id: string) {
    setDeletingService(true);
    try {
      const res = await fetch(`/api/services/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        setServiceError(data.error ?? 'Failed to delete service');
        return;
      }
      setDeleteServiceId(null);
      setServicesLoading(true);
      await fetchServices();
    } catch (e) {
      setServiceError('Something went wrong');
    } finally {
      setDeletingService(false);
    }
  }

  useEffect(() => {
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

  useEffect(() => {
    if (activeTab !== 'messages' || !user?.isAdmin) return;
    let cancelled = false;
    setMessagesLoading(true);
    const fetchMessagesAndStatus = async () => {
      try {
        const [messagesRes, statusRes, qrRes] = await Promise.all([
          fetch('/api/messages'),
          fetch('/api/whatsapp/status'),
          fetch('/api/whatsapp/qr'),
        ]);
        if (!cancelled && messagesRes.ok) {
          const data = await messagesRes.json();
          setMessages(data.messages || []);
        }
        if (!cancelled && statusRes.ok) {
          const statusData = await statusRes.json();
          setWhatsappReady(statusData.ready === true);
        }
        if (!cancelled && qrRes.ok) {
          const qrData = await qrRes.json();
          setWhatsappQr(qrData.qr || null);
        }
      } catch (error) {
        console.error('Error fetching messages/status:', error);
      } finally {
        if (!cancelled) setMessagesLoading(false);
      }
    };
    fetchMessagesAndStatus();
    // Poll status every 2s while on Messages tab so Send button enables after QR scan
    const poll = setInterval(() => {
      if (cancelled) return;
      fetch('/api/whatsapp/status')
        .then((r) => r.json())
        .then((data) => {
          if (!cancelled && data.ready === true) {
            setWhatsappReady(true);
            setWhatsappQr(null);
          }
        })
        .catch(() => {});
    }, 2000);
    return () => {
      cancelled = true;
      clearInterval(poll);
    };
  }, [activeTab, user?.isAdmin]);

  useEffect(() => {
    if (activeTab !== 'settings' || !user?.isAdmin) return;
    let cancelled = false;
    const fetchAppSettings = async () => {
      try {
        const res = await fetch('/api/app-settings');
        if (!cancelled && res.ok) {
          const data = await res.json();
          setAppSettingsWhatsappPhone(data.whatsappPhone ?? '');
          setBlockedNumbers(Array.isArray(data.blockedNumbers) ? data.blockedNumbers : []);
        }
      } catch (error) {
        console.error('Error fetching app settings:', error);
      }
    };
    fetchAppSettings();
    return () => { cancelled = true; };
  }, [activeTab, user?.isAdmin]);

  useEffect(() => {
    if (activeTab !== 'insurance') return;
    let cancelled = false;
    setInsuranceLoading(true);
    const fetchInsurance = async () => {
      try {
        const res = await fetch('/api/insurance');
        if (res.status === 401) {
          router.push('/login');
          return;
        }
        const data = await res.json();
        if (!cancelled && data.insurance) {
          setInsurance(data.insurance);
          setInsuranceForm({
            insuranceCompany: data.insurance.insuranceCompany,
            membershipNumber: data.insurance.membershipNumber,
            contractNumber: data.insurance.contractNumber,
          });
        } else if (!cancelled) {
          setInsurance(null);
          setInsuranceForm({ insuranceCompany: '', membershipNumber: '', contractNumber: '' });
        }
      } catch (error) {
        console.error('Error fetching insurance:', error);
      } finally {
        if (!cancelled) setInsuranceLoading(false);
      }
    };
    fetchInsurance();
    return () => { cancelled = true; };
  }, [activeTab, router]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  const handleBookService = (serviceId: number | string) => {
    router.push(`/services/${serviceId}`);
  };

  const handleSaveInsurance = async () => {
    if (!insuranceForm.insuranceCompany.trim() || !insuranceForm.membershipNumber.trim() || !insuranceForm.contractNumber.trim()) {
      return;
    }
    setInsuranceSaving(true);
    try {
      const res = await fetch('/api/insurance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(insuranceForm),
      });
      const data = await res.json();
      if (data.insurance) {
        setInsurance(data.insurance);
        setInsuranceEditing(false);
      }
    } catch (error) {
      console.error('Error saving insurance:', error);
    } finally {
      setInsuranceSaving(false);
    }
  };

  const handleSaveSettings = async () => {
    setSettingsError(null);
    setSettingsSuccess(false);
    const { fullName, email, phone, cin, newPassword, confirmPassword } = settingsForm;
    if (!fullName.trim() || !email.trim() || !phone.trim() || !cin.trim()) {
      setSettingsError('Name, email, phone and CIN are required.');
      return;
    }
    if (newPassword && newPassword !== confirmPassword) {
      setSettingsError('New password and confirmation do not match.');
      return;
    }
    if (newPassword && newPassword.length < 6) {
      setSettingsError('Password must be at least 6 characters.');
      return;
    }
    setSettingsSaving(true);
    try {
      const body: { fullName: string; email: string; phone: string; cin: string; password?: string } = {
        fullName: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        cin: cin.trim(),
      };
      if (newPassword.trim()) body.password = newPassword.trim();
      const res = await fetch('/api/auth/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setSettingsError(data.error ?? 'Failed to update profile');
        return;
      }
      if (data.user) {
        setUser(data.user);
        setSettingsForm((prev) => ({ ...prev, newPassword: '', confirmPassword: '' }));
        setSettingsSuccess(true);
      }
    } catch (error) {
      setSettingsError('Failed to update profile');
    } finally {
      setSettingsSaving(false);
    }
  };

  const handleSendMessage = async () => {
    setSendError(null);
    if (!sendForm.toPhone.trim() || !sendForm.body.trim()) {
      setSendError('Phone number and message are required.');
      return;
    }
    setSendLoading(true);
    try {
      const res = await fetch('/api/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toPhone: sendForm.toPhone.trim(), body: sendForm.body.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSendError(data.error ?? 'Failed to send message');
        return;
      }
      setSendForm((prev) => ({ ...prev, body: '' }));
      const messagesRes = await fetch('/api/messages');
      if (messagesRes.ok) {
        const list = await messagesRes.json();
        setMessages(list.messages || []);
      }
    } catch (error) {
      setSendError('Failed to send message');
    } finally {
      setSendLoading(false);
    }
  };

  const handleSaveAppSettings = async () => {
    setAppSettingsSaving(true);
    try {
      const res = await fetch('/api/app-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          whatsappPhone: appSettingsWhatsappPhone.trim(),
          blockedNumbers,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        console.error(data.error ?? 'Failed to save app settings');
        return;
      }
      const data = await res.json();
      if (Array.isArray(data.blockedNumbers)) setBlockedNumbers(data.blockedNumbers);
    } catch (error) {
      console.error('Error saving app settings:', error);
    } finally {
      setAppSettingsSaving(false);
    }
  };

  const handleAddBlockedNumber = () => {
    const v = newBlockedInput.trim();
    if (!v || blockedNumbers.includes(v)) return;
    setBlockedNumbers((prev) => [...prev, v]);
    setNewBlockedInput('');
  };

  const handleRemoveBlockedNumber = (entry: string) => {
    setBlockedNumbers((prev) => prev.filter((x) => x !== entry));
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
            <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-3xl font-bold text-gray-800">Book an Appointment</h2>
                <p className="text-gray-500 mt-2">Select a service to schedule your appointment</p>
              </div>
              {user?.isAdmin && (
                <Button onClick={openCreateService} variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add service
                </Button>
              )}
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
                      <div className="flex justify-between items-start gap-2">
                        <div className="min-w-0 flex-1">
                          <CardTitle className="text-lg">{service.name}</CardTitle>
                          <Badge variant="secondary" className="mt-1">{service.category}</Badge>
                        </div>
                        {user?.isAdmin && (
                          <div className="flex items-center gap-1 shrink-0">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => openEditService(service)}
                              aria-label="Edit service"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => setDeleteServiceId(String(service.id))}
                              aria-label="Delete service"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
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
              <p className="text-gray-500 mt-2">{user?.isAdmin ? 'All appointments (admin view)' : 'All your booked appointments'}</p>
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
                        {(user?.isAdmin && (apt.user || apt.guestName)) && (
                          <div className="flex items-center gap-2 pb-1">
                            <User className="h-4 w-4 text-gray-500" />
                            <span className="font-medium text-gray-800">
                              {apt.user ? apt.user.fullName : (apt.guestName || 'Guest')}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-gray-500" />
                          <span>{dateStr}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-gray-500" />
                          <span>{timeStr}</span>
                        </div>
                        <p className="font-semibold text-primary pt-2">{formatCurrency(apt.totalPrice)}</p>
                        {user?.isAdmin && apt.user?.id === user?.id && (apt.guestName || apt.guestEmail) && (
                          <p className="text-xs font-bold text-muted-foreground pt-2 border-t mt-2">
                            Booked for: {apt.guestName || apt.guestEmail || 'Guest'}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        );
      case 'messages':
        return (
          <div className="w-full">
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-gray-800">Messages</h2>
              <p className="text-gray-500 mt-2">Send and receive WhatsApp messages with clients</p>
            </div>
            {messagesLoading ? (
              <div className="text-center py-12">
                <p className="text-gray-500">Loading...</p>
              </div>
            ) : (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Connection</CardTitle>
                    <CardDescription>
                      {whatsappReady
                        ? 'WhatsApp is connected. You can send and receive messages.'
                        : 'Scan the QR code with WhatsApp on your phone to connect.'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {!whatsappReady && whatsappQr && (
                      <div className="flex justify-center p-4 bg-white rounded-lg">
                        <img src={whatsappQr} alt="WhatsApp QR code" className="w-64 h-64" />
                      </div>
                    )}
                    {!whatsappReady && !whatsappQr && (
                      <p className="text-sm text-muted-foreground">Start the WhatsApp bridge (pnpm run whatsapp) and refresh. QR will appear here.</p>
                    )}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Send message</CardTitle>
                    <CardDescription>Enter client phone number (with country code) and message.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {sendError && (
                      <div className="rounded-md bg-destructive/10 text-destructive text-sm px-3 py-2">
                        {sendError}
                      </div>
                    )}
                    <div className="space-y-2">
                      <Label htmlFor="msg-toPhone">Phone number</Label>
                      <Input
                        id="msg-toPhone"
                        type="tel"
                        value={sendForm.toPhone}
                        onChange={(e) => setSendForm((prev) => ({ ...prev, toPhone: e.target.value }))}
                        placeholder="e.g. 212612345678"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="msg-body">Message</Label>
                      <Textarea
                        id="msg-body"
                        value={sendForm.body}
                        onChange={(e) => setSendForm((prev) => ({ ...prev, body: e.target.value }))}
                        placeholder="Your message..."
                        rows={3}
                      />
                    </div>
                    <Button onClick={handleSendMessage} disabled={sendLoading || !whatsappReady}>
                      {sendLoading ? 'Sending...' : 'Send'}
                    </Button>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Message history</CardTitle>
                    <CardDescription>Recent WhatsApp messages</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {messages.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No messages yet.</p>
                    ) : (
                      <div className="space-y-3 max-h-96 overflow-y-auto">
                        {messages.map((msg) => (
                          <div
                            key={msg.id}
                            className={`p-3 rounded-lg text-sm ${
                              msg.direction === 'outbound'
                                ? 'bg-primary/10 ml-8'
                                : 'bg-muted mr-8'
                            }`}
                          >
                            <p className="font-medium text-muted-foreground">
                              {msg.direction === 'outbound' ? 'You' : msg.fromPhone}
                              {msg.sender ? ` (${msg.sender})` : ''} · {new Date(msg.createdAt).toLocaleString()}
                            </p>
                            <p className="mt-1">{msg.body}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        );
      case 'settings':
        return (
          <div className="w-full">
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-gray-800">Settings</h2>
              <p className="text-gray-500 mt-2">Update your profile information</p>
            </div>
            <Card className="max-w-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Profile
                </CardTitle>
                <CardDescription>Change your name, email, phone, CIN, or password.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {settingsError && (
                  <div className="rounded-md bg-destructive/10 text-destructive text-sm px-3 py-2">
                    {settingsError}
                  </div>
                )}
                {settingsSuccess && (
                  <div className="rounded-md bg-green-500/10 text-green-700 text-sm px-3 py-2">
                    Profile updated successfully.
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="settings-fullName">Full name</Label>
                  <Input
                    id="settings-fullName"
                    value={settingsForm.fullName}
                    onChange={(e) =>
                      setSettingsForm((prev) => ({ ...prev, fullName: e.target.value }))
                    }
                    placeholder="Your full name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="settings-email">Email</Label>
                  <Input
                    id="settings-email"
                    type="email"
                    value={settingsForm.email}
                    onChange={(e) =>
                      setSettingsForm((prev) => ({ ...prev, email: e.target.value }))
                    }
                    placeholder="your@email.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="settings-phone">Phone number</Label>
                  <Input
                    id="settings-phone"
                    type="tel"
                    value={settingsForm.phone}
                    onChange={(e) =>
                      setSettingsForm((prev) => ({ ...prev, phone: e.target.value }))
                    }
                    placeholder="Phone number"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="settings-cin">CIN</Label>
                  <Input
                    id="settings-cin"
                    value={settingsForm.cin}
                    onChange={(e) =>
                      setSettingsForm((prev) => ({ ...prev, cin: e.target.value }))
                    }
                    placeholder="CIN"
                  />
                </div>
                <div className="pt-2 border-t">
                  <p className="text-sm text-gray-500 mb-2">Change password (leave blank to keep current)</p>
                  <div className="space-y-2">
                    <Label htmlFor="settings-newPassword">New password</Label>
                    <Input
                      id="settings-newPassword"
                      type="password"
                      value={settingsForm.newPassword}
                      onChange={(e) =>
                        setSettingsForm((prev) => ({ ...prev, newPassword: e.target.value }))
                      }
                      placeholder="New password"
                      autoComplete="new-password"
                    />
                  </div>
                  <div className="space-y-2 mt-2">
                    <Label htmlFor="settings-confirmPassword">Confirm new password</Label>
                    <Input
                      id="settings-confirmPassword"
                      type="password"
                      value={settingsForm.confirmPassword}
                      onChange={(e) =>
                        setSettingsForm((prev) => ({ ...prev, confirmPassword: e.target.value }))
                      }
                      placeholder="Confirm new password"
                      autoComplete="new-password"
                    />
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button onClick={handleSaveSettings} disabled={settingsSaving}>
                  {settingsSaving ? 'Saving...' : 'Save changes'}
                </Button>
              </CardFooter>
            </Card>
            {user?.isAdmin && (
              <Card className="max-w-lg mt-6">
                <CardHeader>
                  <CardTitle>App settings</CardTitle>
                  <CardDescription>WhatsApp sender number (admin only). Used for the Messages section.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="app-settings-whatsapp">WhatsApp sender number</Label>
                    <Input
                      id="app-settings-whatsapp"
                      type="tel"
                      value={appSettingsWhatsappPhone}
                      onChange={(e) => setAppSettingsWhatsappPhone(e.target.value)}
                      placeholder="e.g. +212612345678"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-base font-medium">Blocked numbers</Label>
                    <p className="text-sm text-muted-foreground">
                      Numbers or group IDs the AI will not reply to and will not receive WhatsApp messages (e.g. 212708010325 or 120363421754134116@g.us).
                    </p>
                    <div className="flex gap-2">
                      <Input
                        value={newBlockedInput}
                        onChange={(e) => setNewBlockedInput(e.target.value)}
                        placeholder="Number or group ID"
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddBlockedNumber())}
                      />
                      <Button type="button" variant="outline" onClick={handleAddBlockedNumber}>
                        Add
                      </Button>
                    </div>
                    {blockedNumbers.length > 0 && (
                      <ul className="mt-2 space-y-1 rounded-md border p-2 bg-muted/30">
                        {blockedNumbers.map((entry) => (
                          <li key={entry} className="flex items-center justify-between gap-2 text-sm">
                            <span className="font-mono truncate">{entry}</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="shrink-0 h-8 w-8 p-0 text-destructive hover:text-destructive"
                              onClick={() => handleRemoveBlockedNumber(entry)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <Button onClick={handleSaveAppSettings} disabled={appSettingsSaving}>
                    {appSettingsSaving ? 'Saving...' : 'Save'}
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        );
      case 'insurance':
        return (
          <div className="w-full">
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-gray-800">Insurance Information</h2>
              <p className="text-gray-500 mt-2">
                {insurance
                  ? 'Your saved insurance details. You can edit them anytime.'
                  : 'Add your insurance details to use them when booking appointments.'}
              </p>
            </div>
            {insuranceLoading ? (
              <div className="text-center py-12">
                <p className="text-gray-500">Loading insurance...</p>
              </div>
            ) : !insurance || insuranceEditing ? (
              <Card className="max-w-lg">
                <CardHeader>
                  <CardTitle>Insurance details</CardTitle>
                  <CardDescription>
                    Select your insurance company and enter your membership and contract numbers.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="insurance-company">Insurance company</Label>
                    <Select
                      value={insuranceForm.insuranceCompany || undefined}
                      onValueChange={(v) =>
                        setInsuranceForm((prev) => ({ ...prev, insuranceCompany: v }))
                      }
                    >
                      <SelectTrigger id="insurance-company">
                        <SelectValue placeholder="Choose a company" />
                      </SelectTrigger>
                      <SelectContent>
                        {INSURANCE_COMPANIES.map((name) => (
                          <SelectItem key={name} value={name}>
                            {name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="membership-number">Membership number</Label>
                    <Input
                      id="membership-number"
                      value={insuranceForm.membershipNumber}
                      onChange={(e) =>
                        setInsuranceForm((prev) => ({ ...prev, membershipNumber: e.target.value }))
                      }
                      placeholder="Enter membership number"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contract-number">Contract number</Label>
                    <Input
                      id="contract-number"
                      value={insuranceForm.contractNumber}
                      onChange={(e) =>
                        setInsuranceForm((prev) => ({ ...prev, contractNumber: e.target.value }))
                      }
                      placeholder="Enter contract number"
                    />
                  </div>
                </CardContent>
                <CardFooter>
                  <Button onClick={handleSaveInsurance} disabled={insuranceSaving}>
                    {insuranceSaving ? 'Saving...' : 'Save'}
                  </Button>
                  {insurance && (
                    <Button
                      variant="outline"
                      className="ml-2"
                      onClick={() => {
                        setInsuranceEditing(false);
                        setInsuranceForm({
                          insuranceCompany: insurance.insuranceCompany,
                          membershipNumber: insurance.membershipNumber,
                          contractNumber: insurance.contractNumber,
                        });
                      }}
                    >
                      Cancel
                    </Button>
                  )}
                </CardFooter>
              </Card>
            ) : (
              <Card className="max-w-lg">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Insurance details
                  </CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setInsuranceEditing(true);
                      setInsuranceForm({
                        insuranceCompany: insurance.insuranceCompany,
                        membershipNumber: insurance.membershipNumber,
                        contractNumber: insurance.contractNumber,
                      });
                    }}
                  >
                    <Pencil className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <label className="text-sm text-gray-500">Insurance company</label>
                    <p className="text-gray-800 font-medium">{insurance.insuranceCompany}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">Membership number</label>
                    <p className="text-gray-800 font-medium">{insurance.membershipNumber}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">Contract number</label>
                    <p className="text-gray-800 font-medium">{insurance.contractNumber}</p>
                  </div>
                </CardContent>
              </Card>
            )}
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
    <div className="min-h-screen">
      {/* Mobile top bar - menu button to show sections (hidden on desktop) */}
      <header className="fixed top-0 left-0 right-0 z-20 flex md:hidden h-14 items-center justify-between px-4 bg-primary text-white border-b border-white/20">
        <h1 className="text-xl font-bold">AppointLab</h1>
        <Button
          variant="ghost"
          size="icon"
          className="text-white hover:bg-white/10"
          onClick={() => setMobileNavOpen((open) => !open)}
          aria-label={mobileNavOpen ? 'Close menu' : 'Open menu'}
        >
          {mobileNavOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </Button>
      </header>

      {/* Overlay when mobile nav is open - tap to close */}
      {mobileNavOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 md:hidden"
          aria-hidden
          onClick={() => setMobileNavOpen(false)}
        />
      )}

      {/* Left Sidebar - hidden on mobile until toggled; always visible on md+ */}
      <aside
        className={`fixed left-0 top-0 z-30 h-screen w-64 flex flex-col bg-primary text-white transition-transform duration-200 ease-out md:translate-x-0 ${
          mobileNavOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="shrink-0 p-6 border-b border-white/20">
          <h1 className="text-2xl font-bold">AppointLab</h1>
          {user && (
            <p className="text-sm text-white/70 mt-1">Welcome, <span className="font-bold text-white">{user.fullName}</span></p>
          )}
        </div>

        <nav className="min-h-0 flex-1 overflow-y-auto p-4">
          <ul className="space-y-2">
            {getNavItems(user?.isAdmin ?? false).map((item) => (
              <li key={item.id}>
                <button
                  onClick={() => {
                    setActiveTab(item.id);
                    setMobileNavOpen(false);
                  }}
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

        <div className="shrink-0 p-4 border-t border-white/20">
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

      {/* Main Content - full width on mobile with top padding for header; offset by sidebar on desktop */}
      <main className="pt-14 md:pt-0 md:ml-64 min-h-screen overflow-auto bg-gray-50">
        <div className="p-4 sm:p-6 md:p-8">
          {renderContent()}
        </div>
      </main>

      {/* Admin: Create/Edit service dialog */}
      <Dialog open={serviceDialogOpen} onOpenChange={setServiceDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{serviceDialogMode === 'create' ? 'Add service' : 'Edit service'}</DialogTitle>
            <DialogDescription>
              {serviceDialogMode === 'create'
                ? 'Create a new service that users can book.'
                : 'Update the service details.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {serviceError && (
              <p className="text-sm text-destructive">{serviceError}</p>
            )}
            <div className="space-y-2">
              <Label htmlFor="service-name">Name</Label>
              <Input
                id="service-name"
                value={serviceForm.name}
                onChange={(e) => setServiceForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="e.g. Blood Glucose Test"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="service-description">Description (optional)</Label>
              <Textarea
                id="service-description"
                value={serviceForm.description}
                onChange={(e) => setServiceForm((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description of the service"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="service-price">Price (MAD)</Label>
                <Input
                  id="service-price"
                  type="number"
                  min={0}
                  step={0.01}
                  value={serviceForm.price}
                  onChange={(e) => setServiceForm((prev) => ({ ...prev, price: e.target.value }))}
                  placeholder="100"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="service-duration">Duration (min)</Label>
                <Input
                  id="service-duration"
                  type="number"
                  min={1}
                  value={serviceForm.duration}
                  onChange={(e) => setServiceForm((prev) => ({ ...prev, duration: e.target.value }))}
                  placeholder="30"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="service-category">Category</Label>
              <Input
                id="service-category"
                value={serviceForm.category}
                onChange={(e) => setServiceForm((prev) => ({ ...prev, category: e.target.value }))}
                placeholder="e.g. Blood Tests, Imaging"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setServiceDialogOpen(false)} disabled={serviceSaving}>
              Cancel
            </Button>
            <Button onClick={saveService} disabled={serviceSaving}>
              {serviceSaving ? 'Saving...' : serviceDialogMode === 'create' ? 'Create' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Admin: Delete service confirmation */}
      <AlertDialog open={!!deleteServiceId} onOpenChange={(open) => !open && setDeleteServiceId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete service</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this service. Existing appointments for this service will still exist but the service will no longer be available for new bookings. Are you sure?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingService}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteServiceId && confirmDeleteService(deleteServiceId)}
              disabled={deletingService}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletingService ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
