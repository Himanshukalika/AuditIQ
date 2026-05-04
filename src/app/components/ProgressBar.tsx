import React from 'react'

interface ProgressBarProps {
  percentage: number
  color: string
  width?: number
}

export default function ProgressBar({ percentage, color, width }: ProgressBarProps) {
  return (
    <div style={{ width: width ? `${width}px` : '100%' }}>
      <div className="flex justify-between items-center mb-1">
        <span className="text-[10px] font-bold" style={{ color }}>{percentage}%</span>
      </div>
      <div className="w-full h-1.5 rounded-full bg-gray-100 overflow-hidden">
        <div 
          className="h-full transition-all duration-500" 
          style={{ width: `${percentage}%`, background: color }} 
        />
      </div>
    </div>
  )
}
