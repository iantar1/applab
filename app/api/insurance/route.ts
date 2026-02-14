import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyJwt } from '@/lib/auth';

function getAuthUserId(request: Request): string | null {
  const cookie = request.headers.get('cookie') || '';
  const match = cookie.split(';').map(c => c.trim()).find(c => c.startsWith('token='));
  const token = match ? match.split('=')[1] : null;
  if (!token) return null;
  const payload = verifyJwt<{ userId: string }>(token);
  return payload?.userId ?? null;
}

/**
 * GET: Fetch current user's insurance (first record; one insurance per user for profile).
 */
export async function GET(request: Request) {
  try {
    const userId = getAuthUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const insurance = await prisma.insurance.findFirst({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        insuranceCompany: true,
        membershipNumber: true,
        contractNumber: true,
      },
    });

    return NextResponse.json({ insurance });
  } catch (error) {
    console.error('Insurance GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch insurance' }, { status: 500 });
  }
}

/**
 * POST: Create or update current user's insurance (upsert: one per user).
 * Body: { insuranceCompany: string, membershipNumber: string, contractNumber: string }
 */
export async function POST(request: Request) {
  try {
    const userId = getAuthUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { insuranceCompany, membershipNumber, contractNumber } = body;

    if (
      typeof insuranceCompany !== 'string' ||
      typeof membershipNumber !== 'string' ||
      typeof contractNumber !== 'string'
    ) {
      return NextResponse.json(
        { error: 'insuranceCompany, membershipNumber and contractNumber are required' },
        { status: 400 }
      );
    }

    const trimmedCompany = insuranceCompany.trim();
    const trimmedMembership = membershipNumber.trim();
    const trimmedContract = contractNumber.trim();

    if (!trimmedCompany || !trimmedMembership || !trimmedContract) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    const existing = await prisma.insurance.findFirst({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      select: { id: true },
    });

    if (existing) {
      const updated = await prisma.insurance.update({
        where: { id: existing.id },
        data: {
          insuranceCompany: trimmedCompany,
          membershipNumber: trimmedMembership,
          contractNumber: trimmedContract,
        },
        select: {
          id: true,
          insuranceCompany: true,
          membershipNumber: true,
          contractNumber: true,
        },
      });
      return NextResponse.json({ insurance: updated });
    }

    const created = await prisma.insurance.create({
      data: {
        userId,
        insuranceCompany: trimmedCompany,
        membershipNumber: trimmedMembership,
        contractNumber: trimmedContract,
      },
      select: {
        id: true,
        insuranceCompany: true,
        membershipNumber: true,
        contractNumber: true,
      },
    });
    return NextResponse.json({ insurance: created });
  } catch (error) {
    console.error('Insurance POST error:', error);
    return NextResponse.json({ error: 'Failed to save insurance' }, { status: 500 });
  }
}
