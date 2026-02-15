import Link from 'next/link';
import { Button } from '@/components/ui/button';

export const metadata = {
  title: 'Learn More',
  description: 'Discover how our appointment platform helps you save time and access healthcare conveniently.',
};

export default function LearnMorePage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 md:py-12 max-w-3xl">
        <div className="mb-8">
          <Link href="/">
            <Button variant="ghost" size="sm">← Back to home</Button>
          </Link>
        </div>

        <h1 className="text-3xl md:text-4xl font-bold mb-6">Learn More</h1>
        <p className="text-lg text-muted-foreground mb-10">
          What this platform does, how you can use it, and how it saves your time.
        </p>

        <section className="space-y-10">
          <div>
            <h2 className="text-xl font-semibold mb-3">What is this website?</h2>
            <p className="text-muted-foreground leading-relaxed">
            This is a medical appointment booking platform. Its role is to facilitate appointment bookings and save you time. You can browse available services, choose a time that works for you, and book your appointment online — all from your phone or computer.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-3">Main use</h2>
            <p className="text-muted-foreground leading-relaxed">
              The main use of the website is to <strong>schedule and manage medical appointments</strong>. You can explore different services (such as consultations, check-ups, or specialized care), see availability, select a slot, and complete your booking. You get a clear confirmation and can manage your appointments without having to visit or call the clinic in advance.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-3">How it saves your time</h2>
            <ul className="text-muted-foreground leading-relaxed space-y-2 list-disc list-inside">
              <li><strong>No more long waits:</strong> Book a specific time slot instead of walking in and waiting in line.</li>
              <li><strong>One place for many services:</strong> Browse and book different types of appointments without calling multiple offices.</li>
              <li><strong>24/7 booking:</strong> Schedule whenever it suits you—no need to wait for clinic opening hours.</li>
              <li><strong>Less back-and-forth:</strong> See availability, prices, and details upfront so you can decide quickly.</li>
              <li><strong>Fewer missed appointments:</strong> Get confirmations and reminders so you stay on top of your healthcare.</li>
            </ul>
          </div>
        </section>

        <div className="mt-12 flex flex-wrap gap-4">
          <Button asChild>
            <Link href="/#services">Browse Services</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/">Back to home</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
