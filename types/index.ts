export interface BookingFormData {
  fullName: string;
  phone: string;
  cin: string;
  insuranceProvider?: string;
  insuranceId?: string;
  appointmentDate: Date;
}

export interface ServiceData {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category: string;
}

export interface AppointmentData {
  id: string;
  userId: string;
  serviceId: string;
  appointmentDate: Date;
  status: "pending" | "paid" | "completed";
  totalPrice: number;
  insuranceProvider: string | null;
  insuranceId: string | null;
  stripeSessionId: string | null;
  pdfPath: string | null;
  createdAt: Date;
  updatedAt: Date;
}
