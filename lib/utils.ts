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
