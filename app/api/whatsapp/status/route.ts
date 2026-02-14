import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';

const BRIDGE_URL = process.env.WHATSAPP_BRIDGE_URL || 'http://localhost:3001';

/**
 * GET: WhatsApp bridge connection status (admin only).
 */
export async function GET(request: Request) {
  try {
    const auth = await requireAdmin(request);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const res = await fetch(`${BRIDGE_URL}/status`, {
      method: 'GET',
      cache: 'no-store',
    });
    if (!res.ok) {
      return NextResponse.json({ ready: false });
    }
    const data = await res.json();
    return NextResponse.json({ ready: data.ready === true });
  } catch {
    return NextResponse.json({ ready: false });
  }
}
