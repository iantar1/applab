import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { BrowseServicesLink } from '@/components/browse-services-link';

export function HeroSection() {
  return (
    <section className="bg-gradient-to-r from-primary to-secondary text-white py-20 px-4 rounded-2xl mb-16">
      <div className="max-w-4xl mx-auto text-center">
        <h1 className="text-4xl md:text-5xl font-bold mb-4 text-balance">
          Your Health, One Appointment Away
        </h1>
        <p className="text-lg md:text-xl text-white/90 mb-8 text-balance">
          Easily schedule appointments for a wide range of specialized medical services.
          Save time, avoid long waiting queues, and access professional healthcare quickly and conveniently.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <BrowseServicesLink />
          <Button asChild size="lg" variant="outline" className="border-white bg-transparent text-white hover:bg-white/20">
            <Link href="/learn-more">Learn More</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
