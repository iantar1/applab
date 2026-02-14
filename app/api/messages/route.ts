import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin-auth';

/**
 * GET: List messages (admin only). Query ?contact=phone to filter by fromPhone or toPhone.
 */
export async function GET(request: Request) {
  try {
    const auth = await requireAdmin(request);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { searchParams } = new URL(request.url);
    const contact = searchParams.get('contact')?.trim();

    const where = contact
      ? {
          OR: [
            { fromPhone: { contains: contact } },
            { toPhone: { contains: contact } },
          ],
        }
      : {};

    const messages = await prisma.message.findMany({
      where,
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({ messages });
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}
