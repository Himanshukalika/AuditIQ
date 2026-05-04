import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

// ── Tailwind class merge ───────────────────────────────────
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ── Format currency ───────────────────────────────────────
export function formatCurrency(amount: number): string {
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)} Cr`
  if (amount >= 100000)   return `₹${(amount / 100000).toFixed(2)} L`
  if (amount >= 1000)     return `₹${(amount / 1000).toFixed(1)}K`
  return `₹${amount.toLocaleString('en-IN')}`
}

// ── Format date ────────────────────────────────────────────
export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

// ── Validate PAN ───────────────────────────────────────────
export function validatePAN(pan: string): boolean {
  return /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(pan.toUpperCase())
}

// ── Validate GSTIN ─────────────────────────────────────────
export function validateGSTIN(gstin: string): boolean {
  return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(gstin.toUpperCase())
}

// ── Progress color based on percentage ────────────────────
export function getProgressColor(pct: number, status?: string): string {
  if (status === 'error')     return '#991B1B'
  if (status === 'completed') return '#166534'
  if (pct >= 75)              return '#166534'
  if (pct >= 40)              return '#2E5BE8'
  return '#D97706'
}

// ── Truncate text ──────────────────────────────────────────
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + '…'
}