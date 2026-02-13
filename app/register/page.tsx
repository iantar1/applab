"use client"

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function RegisterPage() {
  const router = useRouter()
  const [form, setForm] = useState({ fullName: '', email: '', phone: '', cin: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data?.error || 'Registration failed')
        setLoading(false)
        return
      }

      // On success, redirect to login
      router.push('/login')
    } catch (err) {
      setError((err as Error).message)
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-8">
      <div className="max-w-md w-full bg-card p-8 rounded-lg shadow">
        <h1 className="text-2xl font-bold mb-4">Register</h1>
        <p className="text-sm text-muted-foreground mb-6">Create an account to book services.</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="p-2 bg-destructive/10 text-destructive rounded">{error}</div>}
          <input name="fullName" value={form.fullName} onChange={handleChange} placeholder="Full name" className="w-full px-3 py-2 border rounded" required />
          <input name="email" value={form.email} onChange={handleChange} placeholder="Email" type="email" className="w-full px-3 py-2 border rounded" required />
          <input name="phone" value={form.phone} onChange={handleChange} placeholder="Phone" className="w-full px-3 py-2 border rounded" required />
          <input name="cin" value={form.cin} onChange={handleChange} placeholder="CIN" className="w-full px-3 py-2 border rounded" required />
          <input name="password" value={form.password} onChange={handleChange} placeholder="Password" type="password" className="w-full px-3 py-2 border rounded" required />
          <button className="w-full py-2 bg-primary text-primary-foreground rounded" disabled={loading}>{loading ? 'Creating...' : 'Create account'}</button>
        </form>
        <div className="mt-4 text-sm">
          <Link href="/login" className="text-primary hover:underline">Already have an account?</Link>
        </div>
      </div>
    </main>
  )
}
