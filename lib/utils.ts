import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number | null | undefined) {
  const amount = typeof value === 'number' ? value : 0;
  try {
    return new Intl.NumberFormat('en-MA', { style: 'currency', currency: 'MAD' }).format(amount);
  } catch (e) {
    // Fallback to simple formatting
    return `MAD ${amount.toFixed(2)}`;
  }
}

/**
 * Validates that a phone number is entered with country code (digits only, no +).
 * Returns a warning message if invalid, or null if valid.
 */
export function validatePhoneWithCountryCode(phone: string): string | null {
  const trimmed = (phone ?? '').trim();
  if (!trimmed) return null; // empty is handled by required
  if (trimmed.includes('+')) {
    return 'Do not use +. Enter your number with country code in digits only (e.g. 212612345678).';
  }
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length === 0) return 'Enter your phone number in digits only (e.g. 212612345678).';
  if (digits.startsWith('0')) {
    return 'Phone must start with your country code (digits only, no +). Example: 212612345678.';
  }
  if (digits.length < 10) {
    return 'Please include your country code at the start (digits only, no +). Example: 212612345678.';
  }
  return null;
}
