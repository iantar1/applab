'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export function BrowseServicesLink() {
  const pathname = usePathname();

  const scrollToServices = (e: React.MouseEvent) => {
    e.preventDefault();
    document.getElementById('services')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const isHome = pathname === '/';

  return (
    <Button
      asChild
      size="lg"
      variant="secondary"
      className="bg-white text-primary hover:bg-white/90"
    >
      <Link
        href={isHome ? '#services' : '/#services'}
        onClick={isHome ? scrollToServices : undefined}
      >
        Browse Services
      </Link>
    </Button>
  );
}
