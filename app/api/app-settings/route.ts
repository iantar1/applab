import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin-auth';
import { getBlockedNumbers } from '@/lib/blocked-numbers';

const KEY_WHATSAPP_PHONE = 'whatsapp_phone';

/**
 * GET: Return app settings (whatsappPhone, blockedNumbers). Admin only.
 */
export async function GET(request: Request) {
  try {
    const auth = await requireAdmin(request);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const whatsappPhoneSetting = await prisma.appSetting.findUnique({
      where: { key: KEY_WHATSAPP_PHONE },
    });
    const whatsappPhone = whatsappPhoneSetting?.value ?? '';
    const blockedNumbers = await getBlockedNumbers();

    return NextResponse.json({ whatsappPhone, blockedNumbers });
  } catch (error) {
    console.error('Error fetching app settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch app settings' },
      { status: 500 }
    );
  }
}

const KEY_BLOCKED_NUMBERS = 'blocked_numbers';

/**
 * PUT: Update app settings (whatsappPhone, blockedNumbers). Admin only.
 * Body: { whatsappPhone?: string, blockedNumbers?: string[] }
 */
export async function PUT(request: Request) {
  try {
    const auth = await requireAdmin(request);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await request.json();
    const whatsappPhone = body.whatsappPhone != null ? String(body.whatsappPhone).trim() : undefined;
    const blockedNumbers = body.blockedNumbers;

    if (whatsappPhone !== undefined) {
      await prisma.appSetting.upsert({
        where: { key: KEY_WHATSAPP_PHONE },
        create: { key: KEY_WHATSAPP_PHONE, value: whatsappPhone },
        update: { value: whatsappPhone },
      });
    }

    if (blockedNumbers !== undefined) {
      const list = Array.isArray(blockedNumbers)
        ? blockedNumbers.map((x: unknown) => String(x).trim()).filter(Boolean)
        : [];
      const value = JSON.stringify(list);
      await prisma.appSetting.upsert({
        where: { key: KEY_BLOCKED_NUMBERS },
        create: { key: KEY_BLOCKED_NUMBERS, value: '', block_number: value },
        update: { block_number: value },
      });
    }

    const [whatsappRow, blockedRow] = await Promise.all([
      prisma.appSetting.findUnique({ where: { key: KEY_WHATSAPP_PHONE } }),
      prisma.appSetting.findUnique({ where: { key: KEY_BLOCKED_NUMBERS } }),
    ]);
    let parsedBlocked: string[] = [];
    if (blockedRow?.block_number) {
      try {
        parsedBlocked = JSON.parse(blockedRow.block_number) ?? [];
      } catch {
        parsedBlocked = [];
      }
    }
    return NextResponse.json({
      whatsappPhone: whatsappRow?.value ?? '',
      blockedNumbers: parsedBlocked,
    });
  } catch (error) {
    console.error('Error updating app settings:', error);
    return NextResponse.json(
      { error: 'Failed to update app settings' },
      { status: 500 }
    );
  }
}
