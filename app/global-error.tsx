'use client';

/**
 * Minimal global error boundary. Replaces the root layout when an uncaught error occurs.
 * This avoids relying on Next.js built-in global-error when HMR leaves it in a bad state.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body style={{ fontFamily: 'system-ui, sans-serif', padding: '2rem', maxWidth: '40rem', margin: '0 auto' }}>
        <h1 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Something went wrong</h1>
        <p style={{ color: '#666', marginBottom: '1.5rem' }}>{error.message}</p>
        <button
          type="button"
          onClick={() => reset()}
          style={{
            padding: '0.5rem 1rem',
            background: '#000',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
