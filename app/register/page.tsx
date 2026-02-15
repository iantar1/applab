"use client"

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { validatePhoneWithCountryCode } from '@/lib/utils'

export default function RegisterPage() {
  const router = useRouter()
  const [form, setForm] = useState({ fullName: '', email: '', phone: '', cin: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [phoneWarning, setPhoneWarning] = useState<string | null>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
    if (name === 'phone') setPhoneWarning(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setPhoneWarning(null)
    const phoneValidation = validatePhoneWithCountryCode(form.phone)
    if (phoneValidation) {
      setPhoneWarning(phoneValidation)
      return
    }
    setLoading(true)
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

      // Auto-logged in; go to home
      router.push('/home')
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
          {phoneWarning && <div className="p-2 bg-amber-500/10 text-amber-700 dark:text-amber-400 rounded text-sm" role="alert">{phoneWarning}</div>}
          <input name="fullName" value={form.fullName} onChange={handleChange} placeholder="Full name" className="w-full px-3 py-2 border rounded" required />
          <input name="email" value={form.email} onChange={handleChange} placeholder="Email" type="email" className="w-full px-3 py-2 border rounded" required />
          <input name="phone" value={form.phone} onChange={handleChange} placeholder="Phone with country code, e.g. 212612345678" className="w-full px-3 py-2 border rounded" required />
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
