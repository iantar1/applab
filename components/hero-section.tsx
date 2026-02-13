import { Button } from '@/components/ui/button';

export function HeroSection() {
  return (
    <section className="bg-gradient-to-r from-primary to-secondary text-white py-20 px-4 rounded-2xl mb-16">
      <div className="max-w-4xl mx-auto text-center">
        <h1 className="text-4xl md:text-5xl font-bold mb-4 text-balance">
          Professional Lab Testing Services
        </h1>
        <p className="text-lg md:text-xl text-white/90 mb-8 text-balance">
          Book your medical tests online and get accurate results delivered to you. Fast, reliable, and professional laboratory services at your convenience.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button size="lg" variant="secondary" className="text-primary hover:bg-white/90">
            Browse Services
          </Button>
          <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/20">
            Learn More
          </Button>
        </div>
      </div>
    </section>
  );
}
