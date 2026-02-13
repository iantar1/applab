import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { AdminStats } from '@/components/admin-stats';
import { AdminBookingsTable } from '@/components/admin-bookings-table';

export default function AdminDashboard() {
  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold">Admin Dashboard</h1>
            <p className="text-muted-foreground mt-2">Manage bookings and view analytics</p>
          </div>
          <Link href="/">
            <Button variant="outline">Back to Home</Button>
          </Link>
        </div>

        {/* Stats */}
        <div className="mb-8">
          <AdminStats />
        </div>

        {/* Bookings Table */}
        <div>
          <AdminBookingsTable />
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
          <div className="bg-card border rounded-lg p-6">
            <h3 className="font-semibold mb-2">Generate Reports</h3>
            <p className="text-sm text-muted-foreground mb-4">Export booking and revenue data</p>
            <Button variant="outline" className="w-full">Export as CSV</Button>
          </div>
          <div className="bg-card border rounded-lg p-6">
            <h3 className="font-semibold mb-2">Send Reminders</h3>
            <p className="text-sm text-muted-foreground mb-4">Notify patients of upcoming appointments</p>
            <Button variant="outline" className="w-full">Send Reminders</Button>
          </div>
          <div className="bg-card border rounded-lg p-6">
            <h3 className="font-semibold mb-2">Manage Services</h3>
            <p className="text-sm text-muted-foreground mb-4">Add, edit, or remove lab services</p>
            <Button variant="outline" className="w-full">Edit Services</Button>
          </div>
        </div>
      </div>
    </main>
  );
}
