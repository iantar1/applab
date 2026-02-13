import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import Link from 'next/link'

import './globals.css'

const _geist = Geist({ subsets: ['latin'] })
const _geistMono = Geist_Mono({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'v0 App',
  description: 'Created with v0',
  generator: 'v0.app',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased" suppressHydrationWarning>
        <header className="bg-background border-b">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <Link href="/" className="flex items-center space-x-2">
              <span className="font-semibold text-lg">Lab</span>
            </Link>

            <nav className="flex items-center gap-4">
              <Link
                href="/login"
                className="flex items-center gap-2 text-sm text-foreground hover:text-primary transition"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 21v-2a4 4 0 00-3-3.87M12 7a4 4 0 110 8 4 4 0 010-8z" />
                </svg>
                <span className="hidden sm:inline">Login</span>
              </Link>

              <Link
                href="/register"
                className="flex items-center gap-2 text-sm text-foreground hover:text-primary transition"
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

        {children}
      </body>
    </html>
  )
}
