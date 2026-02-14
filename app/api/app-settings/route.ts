import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin-auth';

const KEY_WHATSAPP_PHONE = 'whatsapp_phone';

/**
 * GET: Return app settings (whatsappPhone). Admin only.
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

    return NextResponse.json({ whatsappPhone });
  } catch (error) {
    console.error('Error fetching app settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch app settings' },
      { status: 500 }
    );
  }
}

/**
 * PUT: Update app settings (whatsappPhone). Admin only.
 * Body: { whatsappPhone?: string }
 */
export async function PUT(request: Request) {
  try {
    const auth = await requireAdmin(request);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await request.json();
    const whatsappPhone = body.whatsappPhone != null ? String(body.whatsappPhone).trim() : undefined;

    if (whatsappPhone !== undefined) {
      await prisma.appSetting.upsert({
        where: { key: KEY_WHATSAPP_PHONE },
        create: { key: KEY_WHATSAPP_PHONE, value: whatsappPhone },
        update: { value: whatsappPhone },
      });
    }

    const updated = await prisma.appSetting.findUnique({
      where: { key: KEY_WHATSAPP_PHONE },
    });
    return NextResponse.json({
      whatsappPhone: updated?.value ?? '',
    });
  } catch (error) {
    console.error('Error updating app settings:', error);
    return NextResponse.json(
      { error: 'Failed to update app settings' },
      { status: 500 }
    );
  }
}
