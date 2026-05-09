'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Users, FileText,
  Settings, HelpCircle, LogOut, ShieldCheck
} from 'lucide-react'

export default function Sidebar() {
  const pathname = usePathname()

  const menuItems = [
    { icon: <LayoutDashboard size={18} />, label: 'Dashboard',    href: '/' },
    { icon: <Users size={18} />,           label: 'Clients',      href: '/clients' },
    { icon: <FileText size={18} />,        label: 'Reports',      href: '/observations' },
    { icon: <FileText size={18} />,        label: 'Form 3CD',     href: '/form3cd' },
    { icon: <ShieldCheck size={18} />,     label: 'Audit Rules',  href: '/rules' },
    { icon: <Settings size={18} />,        label: 'Settings',     href: '#' },
  ]

  return (
    <aside className="w-64 flex flex-col border-r h-full bg-white" style={{ borderColor: 'var(--border)' }}>
      <div className="p-6">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold">A</div>
          <span className="text-xl font-extrabold tracking-tight" style={{ color: 'var(--navy)' }}>Audit<span className="text-blue-600">IQ</span></span>
        </div>

        <nav className="flex flex-col gap-1">
          {menuItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link 
                key={item.label} 
                href={item.href} 
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-semibold transition-colors ${
                  isActive ? 'bg-blue-50 text-blue-600' : 'text-gray-500 hover:bg-gray-50'
                }`}
              >
                {item.icon}
                {item.label}
              </Link>
            )
          })}
        </nav>
      </div>

      <div className="mt-auto p-6 border-t" style={{ borderColor: 'var(--border)' }}>
        <nav className="flex flex-col gap-1">
          <Link href="#" className="flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-semibold text-gray-500 hover:bg-gray-50">
            <HelpCircle size={18} />
            Support
          </Link>
          <Link href="#" className="flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-semibold text-red-500 hover:bg-red-50">
            <LogOut size={18} />
            Sign Out
          </Link>
        </nav>
      </div>
    </aside>
  )
}
