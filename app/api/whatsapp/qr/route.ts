import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';

const BRIDGE_URL = process.env.WHATSAPP_BRIDGE_URL || 'http://localhost:3001';

/**
 * GET: WhatsApp QR code for first-time link (admin only). Returns { qr: dataUrl | null, ready: boolean }.
 */
export async function GET(request: Request) {
  try {
    const auth = await requireAdmin(request);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const res = await fetch(`${BRIDGE_URL}/qr`, {
      method: 'GET',
      cache: 'no-store',
    });
    if (!res.ok) {
      return NextResponse.json({ qr: null, ready: false });
    }
    const data = await res.json();
    return NextResponse.json({ qr: data.qr ?? null, ready: data.ready === true });
  } catch {
    return NextResponse.json({ qr: null, ready: false });
  }
}
