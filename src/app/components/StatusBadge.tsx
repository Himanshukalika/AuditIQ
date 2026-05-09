import React from 'react'

export type Status = 'completed' | 'analysing' | 'gst_recon' | 'pending' | 'error' | 'in_progress' | 'bank_recon' | 'tally_synced' | 'bank_uploaded'

interface StatusBadgeProps {
  status: Status | string
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const config: Record<string, { label: string; bg: string; text: string }> = {
    completed:     { label: 'Completed',    bg: '#DCFCE7', text: '#166534' },
    analysing:     { label: 'Analysing',    bg: '#EEF2FD', text: '#2E5BE8' },
    gst_recon:     { label: 'GST Recon',    bg: '#EEF2FD', text: '#2E5BE8' },
    bank_recon:    { label: 'Bank Recon',   bg: '#EEF2FD', text: '#2E5BE8' },
    tally_synced:  { label: 'Tally Synced', bg: '#EEF2FD', text: '#2E5BE8' },
    bank_uploaded: { label: 'Bank Ready',   bg: '#EEF2FD', text: '#2E5BE8' },
    in_progress:   { label: 'In Progress',  bg: '#EEF2FD', text: '#2E5BE8' },
    pending:       { label: 'Pending',      bg: '#FEF3C7', text: '#92400E' },
    error:         { label: 'Error',        bg: '#FEE2E2', text: '#991B1B' },
  }

  const { label, bg, text } = config[status] ?? { label: status, bg: '#F3F4F6', text: '#6B7280' }

  return (
    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold inline-block" 
      style={{ background: bg, color: text }}>
      {label}
    </span>
  )
}
