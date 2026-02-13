import Link from 'next/link'

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-8">
      <div className="max-w-md w-full bg-card p-8 rounded-lg shadow">
        <h1 className="text-2xl font-bold mb-4">Login</h1>
        <p className="text-sm text-muted-foreground mb-6">This is a placeholder login page. Replace with your auth flow.</p>
        <form className="space-y-4">
          <input placeholder="Email" className="w-full px-3 py-2 border rounded" />
          <input placeholder="Password" type="password" className="w-full px-3 py-2 border rounded" />
          <button className="w-full py-2 bg-primary text-primary-foreground rounded">Sign in</button>
        </form>
        <div className="mt-4 text-sm">
          <Link href="/register" className="text-primary hover:underline">Create an account</Link>
        </div>
      </div>
    </main>
  )
}
