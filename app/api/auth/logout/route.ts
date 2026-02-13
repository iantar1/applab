import { NextResponse } from 'next/server';

export async function POST() {
  const res = NextResponse.json({ ok: true });
  // Clear cookie
  res.headers.set('Set-Cookie', `token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
  return res;
}
