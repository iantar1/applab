/**
 * Blocked numbers / group IDs: AI must not reply and must not send WhatsApp to these.
 */

import { prisma } from "@/lib/prisma";

const KEY_BLOCKED_NUMBERS = "blocked_numbers";

/** Normalize for comparison: digits only for phone-like ids, full string for group ids (contain @). */
function normalizeId(id: string): string {
  const trimmed = (id || "").trim();
  if (trimmed.includes("@")) return trimmed;
  return trimmed.replace(/\D/g, "").replace(/^0+/, "") || trimmed;
}

/** Fetch list of blocked numbers/group IDs from AppSetting (block_number column, key = blocked_numbers). */
export async function getBlockedNumbers(): Promise<string[]> {
  const row = await prisma.appSetting.findUnique({
    where: { key: KEY_BLOCKED_NUMBERS },
  });
  const raw = row?.block_number;
  if (!raw || typeof raw !== "string") return [];
  try {
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return [];
    return arr.filter((x): x is string => typeof x === "string").map((s) => s.trim()).filter(Boolean);
  } catch {
    return [];
  }
}

/** Return true if the given identifier (phone or group id) is in the blocked list. */
export function isBlocked(identifier: string, blockedList: string[]): boolean {
  const normalized = normalizeId(identifier);
  if (!normalized) return false;
  for (const entry of blockedList) {
    const normEntry = normalizeId(entry);
    if (normEntry === normalized) return true;
  }
  return false;
}
