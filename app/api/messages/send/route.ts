import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { prisma } from '@/lib/prisma';

const BRIDGE_URL = process.env.WHATSAPP_BRIDGE_URL || 'http://localhost:3001';

/**
 * POST: Send WhatsApp message (admin only). Body: { toPhone: string, body: string }
 */
export async function POST(request: Request) {
  try {
    const auth = await requireAdmin(request);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await request.json();
    const toPhone = body.toPhone != null ? String(body.toPhone).trim() : '';
    const text = body.body != null ? String(body.body) : '';

    if (!toPhone || !text) {
      return NextResponse.json(
        { error: 'toPhone and body are required' },
        { status: 400 }
      );
    }

    let sender: string | null = null;
    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: { fullName: true },
    });
    sender = user?.fullName ?? null;

    const res = await fetch(`${BRIDGE_URL}/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: toPhone, body: text, sender }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      const message = data.error || res.statusText;
      if (res.status === 503) {
        return NextResponse.json(
          { error: message || 'WhatsApp bridge is not ready. Start it with: pnpm run whatsapp' },
          { status: 503 }
        );
      }
      return NextResponse.json(
        { error: message || 'Failed to send message' },
        { status: res.status }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.cause?.code === 'ECONNREFUSED' || err.code === 'ECONNREFUSED') {
      return NextResponse.json(
        { error: 'WhatsApp bridge is not running. Start it with: pnpm run whatsapp' },
        { status: 503 }
      );
    }
    console.error('Error sending message:', error);
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    );
  }
}
