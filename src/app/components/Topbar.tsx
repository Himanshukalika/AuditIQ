import React from 'react'
import { Search, Bell, User } from 'lucide-react'

export default function Topbar() {
  return (
    <header className="h-16 flex items-center justify-between px-8 bg-white border-b" style={{ borderColor: 'var(--border)' }}>
      <div className="relative w-96">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
        <input 
          type="text" 
          placeholder="Search clients, PAN, or vouchers..." 
          className="w-full pl-10 pr-4 py-2 bg-gray-50 border rounded-lg text-[13px] outline-none focus:border-blue-400 transition-colors"
          style={{ borderColor: 'var(--border)' }}
        />
      </div>

      <div className="flex items-center gap-4">
        <button className="p-2 text-gray-500 hover:bg-gray-50 rounded-full relative">
          <Bell size={20} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
        </button>
        <div className="flex items-center gap-3 pl-4 border-l" style={{ borderColor: 'var(--border)' }}>
          <div className="text-right">
            <div className="text-[12px] font-bold text-gray-900">CA Rajesh Sharma</div>
            <div className="text-[10px] font-medium text-gray-500">Principal Auditor</div>
          </div>
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
            <User size={20} />
          </div>
        </div>
      </div>
    </header>
  )
}
