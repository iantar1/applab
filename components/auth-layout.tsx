'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

interface AuthLayoutProps {
  children: React.ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/me');
        const data = await res.json();
        setIsLoggedIn(!!data.user);
        
        // Redirect logged-in users from root page to /home
        if (data.user && pathname === '/') {
          router.push('/home');
        }
      } catch {
        setIsLoggedIn(false);
      }
    };

    checkAuth();
  }, [pathname, router]);

  // Pages where we don't show header/footer (like /home which has its own layout)
  const isAuthenticatedPage = pathname === '/home' || pathname?.startsWith('/checkout');
  
  // Don't show header/footer for authenticated users or on authenticated pages
  const showHeaderFooter = !isLoggedIn && !isAuthenticatedPage;

  if (isLoggedIn === null) {
    // Still checking auth status
    return (
      <>
        {children}
      </>
    );
  }

  return (
    <>
      {showHeaderFooter && (
        <header className="bg-primary text-white">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <Link href="/" className="flex items-center space-x-2">
              <span className="font-semibold text-lg">AppointLab</span>
            </Link>

            <nav className="flex items-center gap-4">
              <Link
                href="/login"
                className="flex items-center gap-2 text-sm text-white/90 hover:text-white transition"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 21v-2a4 4 0 00-3-3.87M12 7a4 4 0 110 8 4 4 0 010-8z" />
                </svg>
                <span className="hidden sm:inline">Login</span>
              </Link>

              <Link
                href="/register"
                className="flex items-center gap-2 text-sm text-white/90 hover:text-white transition"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 21v-2a4 4 0 00-3-3.87M12 7a4 4 0 110 8 4 4 0 010-8z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 8v6M23 11h-6" />
                </svg>
                <span className="hidden sm:inline">Register</span>
              </Link>
            </nav>
          </div>
        </header>
      )}

      {children}

      {showHeaderFooter && (
        <footer className="bg-primary text-white mt-auto">
          <div className="container mx-auto px-4 py-12">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              {/* Brand */}
              <div className="md:col-span-1">
                <h3 className="font-bold text-xl mb-4">AppointLab</h3>
                <p className="text-white/80 text-sm">
                  Your trusted partner for scheduling medical appointments. Quality healthcare made accessible.
                </p>
              </div>

              {/* Quick Links */}
              <div>
                <h4 className="font-semibold mb-4">Quick Links</h4>
                <ul className="space-y-2 text-sm text-white/80">
                  <li><Link href="/" className="hover:text-white transition">Home</Link></li>
                  <li><Link href="/services" className="hover:text-white transition">Services</Link></li>
                  <li><Link href="/login" className="hover:text-white transition">Login</Link></li>
                  <li><Link href="/register" className="hover:text-white transition">Register</Link></li>
                </ul>
              </div>

              {/* Services */}
              <div>
                <h4 className="font-semibold mb-4">Services</h4>
                <ul className="space-y-2 text-sm text-white/80">
                  <li><span className="hover:text-white transition">General Consultation</span></li>
                  <li><span className="hover:text-white transition">Lab Tests</span></li>
                  <li><span className="hover:text-white transition">Specialist Appointments</span></li>
                  <li><span className="hover:text-white transition">Health Checkups</span></li>
                </ul>
              </div>

              {/* Contact */}
              <div>
                <h4 className="font-semibold mb-4">Contact Us</h4>
                <ul className="space-y-2 text-sm text-white/80">
                  <li className="flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/>
                    </svg>
                    +212 5XX-XXXXXX
                  </li>
                  <li className="flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                      <polyline points="22,6 12,13 2,6"/>
                    </svg>
                    contact@appointlab.com
                  </li>
                  <li className="flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
                      <circle cx="12" cy="10" r="3"/>
                    </svg>
                    Casablanca, Morocco
                  </li>
                </ul>
              </div>
            </div>

            {/* Bottom Bar */}
            <div className="border-t border-white/20 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center text-sm text-white/70">
              <p>&copy; {new Date().getFullYear()} AppointLab. All rights reserved.</p>
              <div className="flex gap-4 mt-4 md:mt-0">
                <Link href="#" className="hover:text-white transition">Privacy Policy</Link>
                <Link href="#" className="hover:text-white transition">Terms of Service</Link>
              </div>
            </div>
          </div>
        </footer>
      )}
    </>
  );
}
