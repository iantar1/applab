import { HeroSection } from '@/components/hero-section';
import { ServicesList } from '@/components/services-list';

export default function Page() {
  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 md:py-12">
        <HeroSection />
        
        <section id="services">
          <h2 className="text-3xl font-bold mb-2">Our Services</h2>
          <p className="text-muted-foreground mb-8">Select a service and book your appointment</p>
          <ServicesList />
        </section>
      </div>
    </main>
  );
}
