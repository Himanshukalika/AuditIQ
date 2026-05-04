import React from 'react'

interface StatCardProps {
  label: string
  value: string
  change: string
  changeType: 'up' | 'down' | 'warn'
  stripeColor: string
  iconBg: string
  icon: React.ReactNode
}

export default function StatCard({ label, value, change, changeType, stripeColor, iconBg, icon }: StatCardProps) {
  const changeColor = changeType === 'up' ? 'text-green-600' : changeType === 'warn' ? 'text-amber-600' : 'text-red-600'
  
  return (
    <div className="relative rounded-xl border p-4 shadow-card bg-white overflow-hidden" style={{ borderColor: 'var(--border)' }}>
      <div className="absolute top-0 left-0 w-full h-[3px]" style={{ background: stripeColor }} />
      <div className="flex justify-between items-start mb-2">
        <div className="text-[12px] font-semibold text-gray-500">{label}</div>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: iconBg }}>
          {icon}
        </div>
      </div>
      <div className="text-2xl font-bold mb-1" style={{ color: 'var(--text)' }}>{value}</div>
      <div className={`text-[10px] font-medium ${changeColor}`}>
        {change}
      </div>
    </div>
  )
}
