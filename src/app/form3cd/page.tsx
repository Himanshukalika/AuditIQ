'use client'

import { useState } from 'react'
import { FileText, CheckCircle2, AlertCircle, ChevronRight, Search, Filter, Download } from 'lucide-react'
import clsx from 'clsx'

interface Clause {
  id: string
  clause: string
  title: string
  description: string
  status: 'completed' | 'review' | 'pending'
  value?: string
  aiSuggested?: string
}

const CLAUSES: Clause[] = [
  { id: '1', clause: 'Clause 16(d)', title: 'Capital Gains - Land/Building', description: 'Particulars of any land or building or both transferred during the previous year for a consideration less than value adopted by Stamp Valuation Authority.', status: 'completed', value: 'Nil' },
  { id: '2', clause: 'Clause 21(a)', title: 'Personal Expenditure', description: 'Expenditure by way of personal expenses of the assessee. Check ledger for drawings or personal bills.', status: 'review', aiSuggested: '₹14,500 found in Miscellaneous Exp' },
  { id: '3', clause: 'Clause 21(i)', title: 'Club Entrance/Subscription', description: 'Expenditure incurred at clubs namely entrance fees and subscriptions.', status: 'completed', value: 'Nil' },
  { id: '4', clause: 'Clause 31(a)', title: 'Sec 269SS - Loans/Deposits', description: 'Particulars of each loan or deposit in an amount exceeding the limit specified in section 269SS.', status: 'review', aiSuggested: '2 entries exceeding ₹20k detected' },
  { id: '5', clause: 'Clause 34(a)', title: 'TDS/TCS Compliance', description: 'Whether the assessee is required to deduct or collect tax as per the provisions of Chapter XVII-B or XVII-BB.', status: 'pending' },
  { id: '6', clause: 'Clause 40', title: 'Accounting Ratios', description: 'Details regarding turnover, gross profit, net profit, stock-in-trade and material consumed.', status: 'completed', value: 'GP: 18.4%, NP: 4.2%' },
]

export default function Form3CDPage() {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('All')

  const filtered = CLAUSES.filter(c => {
    const matchesSearch = c.title.toLowerCase().includes(search.toLowerCase()) || c.clause.toLowerCase().includes(search.toLowerCase())
    const matchesFilter = filter === 'All' || (filter === 'Review' && c.status === 'review') || (filter === 'Pending' && c.status === 'pending')
    return matchesSearch && matchesFilter
  })

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-[24px] font-extrabold tracking-tight flex items-center gap-2" style={{ color: 'var(--navy)' }}>
            <FileText size={24} className="text-blue-600" />
            Tax Audit Report — Form 3CD
          </h1>
          <p className="text-[13px] mt-1 text-gray-500">
            Joshi & Sons Traders · AY 2025-26 · Section 44AB Audit
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg border bg-white text-[13px] font-semibold text-gray-600 hover:bg-gray-50 transition-all">
            <Download size={16} />
            Export Draft
          </button>
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-[13px] font-semibold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all">
            Submit Review
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Clauses', value: '44', color: 'blue' },
          { label: 'Completed', value: '28', color: 'green' },
          { label: 'Review Needed', value: '12', color: 'amber' },
          { label: 'Not Started', value: '4', color: 'gray' },
        ].map((s) => (
          <div key={s.label} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
            <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">{s.label}</div>
            <div className="text-2xl font-extrabold text-gray-800">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Main Content */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-gray-50 flex items-center justify-between gap-4 bg-gray-50/50">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input 
              type="text" 
              placeholder="Search clause or title..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-gray-400" />
            <div className="flex bg-white border border-gray-200 rounded-lg p-1">
              {['All', 'Review', 'Pending'].map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={clsx(
                    "px-3 py-1 rounded-md text-[11px] font-bold transition-all",
                    filter === f ? "bg-blue-600 text-white shadow-md" : "text-gray-500 hover:text-gray-700"
                  )}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Clause List */}
        <div className="divide-y divide-gray-50">
          {filtered.map((clause) => (
            <div key={clause.id} className="p-5 hover:bg-blue-50/30 transition-colors group">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="px-2 py-1 rounded bg-gray-100 text-[11px] font-bold text-gray-600 uppercase tracking-tight">
                      {clause.clause}
                    </span>
                    <h3 className="text-[15px] font-bold text-gray-800">{clause.title}</h3>
                  </div>
                  <p className="text-[13px] text-gray-500 mb-4 line-clamp-2 leading-relaxed">
                    {clause.description}
                  </p>

                  {clause.status === 'completed' && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-green-50 rounded-lg border border-green-100">
                      <CheckCircle2 size={14} className="text-green-600" />
                      <span className="text-[12px] font-semibold text-green-700">Value: {clause.value}</span>
                    </div>
                  )}

                  {clause.status === 'review' && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 rounded-lg border border-amber-100">
                      <AlertCircle size={14} className="text-amber-600" />
                      <span className="text-[12px] font-semibold text-amber-700">AI Flag: {clause.aiSuggested}</span>
                    </div>
                  )}

                  {clause.status === 'pending' && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg border border-gray-100">
                      <div className="w-2 h-2 rounded-full bg-gray-300 animate-pulse" />
                      <span className="text-[12px] font-semibold text-gray-400">Documentation required</span>
                    </div>
                  )}
                </div>

                <div className="flex flex-col items-end gap-3">
                  <span className={clsx(
                    "text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider",
                    clause.status === 'completed' ? "bg-green-100 text-green-700" :
                    clause.status === 'review' ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-500"
                  )}>
                    {clause.status}
                  </span>
                  <button className="flex items-center gap-1 text-[12px] font-bold text-blue-600 opacity-0 group-hover:opacity-100 transition-all">
                    Edit Details
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
