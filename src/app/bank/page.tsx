'use client'

import { useState } from 'react'
import { Download, CheckCircle2, AlertTriangle, XCircle, Filter } from 'lucide-react'
import Link from 'next/link'

type MatchType = 'exact' | 'fuzzy' | 'unmatched' | 'cash_flag'

interface ReconRow {
    id: string
    date: string
    tallyEntry: string
    tallyType: string
    tallyAmount: string
    bankEntry: string
    bankNote: string
    bankAmount: string
    matchType: MatchType
    matchLabel: string
    flag?: string
    isDebit: boolean
}

const ROWS: ReconRow[] = [
    {
        id: '1', date: '15 Apr 2024',
        tallyEntry: 'ABC Suppliers Pvt Ltd', tallyType: 'Payment Voucher', tallyAmount: '₹15,000',
        bankEntry: 'NEFT-ABC Suppliers Pvt', bankNote: 'HDFC A/c', bankAmount: '₹15,000',
        matchType: 'exact', matchLabel: 'Exact', isDebit: true,
    },
    {
        id: '2', date: '03 Sep 2024',
        tallyEntry: 'Raj Trading Co.', tallyType: 'Payment Voucher', tallyAmount: '₹85,000',
        bankEntry: 'NEFT-Vijay Enterprises', bankNote: 'SBI A/c', bankAmount: '₹85,000',
        matchType: 'fuzzy', matchLabel: 'Fuzzy 72%', flag: '⚠️ Party mismatch', isDebit: true,
    },
    {
        id: '3', date: '22 Oct 2024',
        tallyEntry: 'Sharma Construction', tallyType: 'Receipt Voucher', tallyAmount: '₹2,40,000',
        bankEntry: 'RTGS-Sharma Const.', bankNote: 'HDFC A/c', bankAmount: '₹2,40,000',
        matchType: 'exact', matchLabel: 'Exact', isDebit: false,
    },
    {
        id: '4', date: '20 Aug 2024',
        tallyEntry: 'Gupta Goods Supplier', tallyType: 'Payment Voucher', tallyAmount: '₹32,000',
        bankEntry: 'No bank entry found', bankNote: '', bankAmount: '—',
        matchType: 'unmatched', matchLabel: 'Unmatched', flag: '🚨 Cash payment?', isDebit: true,
    },
    {
        id: '5', date: '12 Dec 2024',
        tallyEntry: 'Cash Payment', tallyType: 'Cash Voucher', tallyAmount: '₹18,400',
        bankEntry: 'Cash — no bank entry', bankNote: '', bankAmount: '—',
        matchType: 'cash_flag', matchLabel: 'Cash', flag: '🔴 Sec 40A(3) risk', isDebit: true,
    },
    {
        id: '6', date: '18 Nov 2024',
        tallyEntry: 'Patel Engineering', tallyType: 'Receipt Voucher', tallyAmount: '₹1,50,000',
        bankEntry: 'NEFT-Patel Eng Works', bankNote: 'Axis A/c', bankAmount: '₹1,50,000',
        matchType: 'exact', matchLabel: 'Exact', isDebit: false,
    },
]

const MATCH_STYLES: Record<MatchType, { bg: string; color: string; leftBar: string }> = {
    exact: { bg: '#DCFCE7', color: '#166534', leftBar: '#166534' },
    fuzzy: { bg: '#FEF3C7', color: '#92400E', leftBar: '#D97706' },
    unmatched: { bg: '#FEE2E2', color: '#991B1B', leftBar: '#991B1B' },
    cash_flag: { bg: '#F3E8FF', color: '#6B21A8', leftBar: '#7C3AED' },
}

const TABS = ['All', 'Matched', 'Review Needed', 'Unmatched', 'Flags']

export default function BankReconPage() {
    const [activeTab, setActiveTab] = useState('All')
    const [reviewed, setReviewed] = useState<Set<string>>(new Set())

    const filtered = ROWS.filter(r => {
        if (activeTab === 'All') return true
        if (activeTab === 'Matched') return r.matchType === 'exact'
        if (activeTab === 'Review Needed') return r.matchType === 'fuzzy'
        if (activeTab === 'Unmatched') return r.matchType === 'unmatched'
        if (activeTab === 'Flags') return r.matchType === 'cash_flag' || r.flag
        return true
    })

    return (
        <div>
            {/* Header */}
            <div className="flex items-start justify-between mb-5">
                <div>
                    <h1 className="text-[22px] font-extrabold tracking-tight" style={{ color: 'var(--text)' }}>
                        🏦 Bank Reconciliation
                    </h1>
                    <p className="text-[13px] mt-1" style={{ color: 'var(--text2)' }}>
                        Joshi &amp; Sons Traders · FY 2024-25 · 2,655 entries processed
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-full text-[11px] font-semibold" style={{ background: '#DCFCE7', color: '#166534' }}>2,610 Matched</span>
                    <span className="px-3 py-1 rounded-full text-[11px] font-semibold" style={{ background: '#FEF3C7', color: '#92400E' }}>42 Review</span>
                    <span className="px-3 py-1 rounded-full text-[11px] font-semibold" style={{ background: '#FEE2E2', color: '#991B1B' }}>3 Unmatched</span>
                    <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-white text-[12px] font-semibold"
                        style={{ background: 'var(--accent)', boxShadow: '0 2px 8px rgba(46,91,232,0.3)' }}>
                        <Download size={13} />
                        Download Report
                    </button>
                </div>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-4 gap-3 mb-5">
                {[
                    { label: 'Exact Match', val: '2,568', sub: '100% confident', color: '#166534', stripe: '#166534', icon: <CheckCircle2 size={16} color="#166534" />, bg: '#DCFCE7' },
                    { label: 'Fuzzy Match', val: '42', sub: 'CA confirm karo', color: '#D97706', stripe: '#D97706', icon: <AlertTriangle size={16} color="#D97706" />, bg: '#FEF3C7' },
                    { label: 'Unmatched', val: '3', sub: 'Investigate karo', color: '#991B1B', stripe: '#991B1B', icon: <XCircle size={16} color="#991B1B" />, bg: '#FEE2E2' },
                    { label: 'Flagged Entries', val: '12', sub: 'Special attention', color: '#6B21A8', stripe: '#7C3AED', icon: <AlertTriangle size={16} color="#7C3AED" />, bg: '#F3E8FF' },
                ].map(s => (
                    <div key={s.label} className="rounded-xl border overflow-hidden shadow-card"
                        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
                        <div className="h-[3px]" style={{ background: s.stripe }} />
                        <div className="px-4 pt-4 pb-3">
                            <div className="w-7 h-7 rounded-lg flex items-center justify-center mb-2"
                                style={{ background: s.bg }}>
                                {s.icon}
                            </div>
                            <div className="text-[9px] font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--text3)' }}>
                                {s.label}
                            </div>
                            <div className="text-[24px] font-extrabold" style={{ color: s.color }}>{s.val}</div>
                            <div className="text-[10px] mt-0.5" style={{ color: 'var(--text3)' }}>{s.sub}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Results table */}
            <div className="rounded-xl border overflow-hidden shadow-card"
                style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>

                {/* Table header */}
                <div className="flex items-center justify-between px-5 py-3 border-b"
                    style={{ borderColor: 'var(--border)' }}>
                    <h2 className="text-[13px] font-bold" style={{ color: 'var(--text)' }}>
                        📊 Reconciliation Results
                    </h2>
                    <div className="flex items-center gap-3">
                        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-medium"
                            style={{ borderColor: 'var(--border)', color: 'var(--text2)', background: 'var(--surface2)' }}>
                            <Filter size={12} /> Filter
                        </button>
                        {/* Tabs */}
                        <div className="flex gap-1 p-1 rounded-lg" style={{ background: 'var(--surface2)' }}>
                            {TABS.map(t => (
                                <button key={t} onClick={() => setActiveTab(t)}
                                    className="px-3 py-1 rounded-md text-[11px] font-semibold transition-all"
                                    style={activeTab === t
                                        ? { background: 'var(--surface)', color: 'var(--accent)' }
                                        : { color: 'var(--text2)' }}>
                                    {t}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Column headers */}
                <div className="grid text-[10px] font-bold uppercase tracking-wider px-5 py-2.5 border-b"
                    style={{
                        gridTemplateColumns: '100px 1fr 90px 1fr 90px 100px 140px 120px',
                        background: 'var(--surface2)',
                        borderColor: 'var(--border)',
                        color: 'var(--text3)',
                    }}>
                    <span>Date</span>
                    <span>Tally Entry</span>
                    <span>Amount</span>
                    <span>Bank Entry</span>
                    <span>Amount</span>
                    <span>Match</span>
                    <span>Flag</span>
                    <span>Action</span>
                </div>

                {/* Rows */}
                {filtered.map((row, i) => {
                    const style = MATCH_STYLES[row.matchType]
                    const isReviewed = reviewed.has(row.id)

                    return (
                        <div key={row.id}
                            className="grid items-center px-5 py-3.5 border-b relative transition-colors hover:bg-gray-50/50"
                            style={{
                                gridTemplateColumns: '100px 1fr 90px 1fr 90px 100px 140px 120px',
                                borderColor: 'var(--border)',
                                background: i % 2 !== 0 ? 'var(--surface2)' : 'transparent',
                            }}>

                            {/* Left color bar */}
                            <div className="absolute left-0 top-0 bottom-0 w-[4px] rounded-r-sm"
                                style={{ background: style.leftBar }} />

                            <div className="text-[10px] font-medium pl-1" style={{ color: 'var(--text3)', fontFamily: 'monospace' }}>
                                {row.date}
                            </div>

                            <div>
                                <div className="text-[12px] font-semibold" style={{ color: 'var(--text)' }}>{row.tallyEntry}</div>
                                <div className="text-[10px]" style={{ color: 'var(--text3)' }}>{row.tallyType}</div>
                            </div>

                            <div className="text-[12px] font-semibold" style={{ color: row.isDebit ? '#991B1B' : '#166534' }}>
                                {row.isDebit ? '−' : '+'}{row.tallyAmount}
                            </div>

                            <div>
                                <div className="text-[12px]" style={{ color: 'var(--text)' }}>{row.bankEntry}</div>
                                {row.bankNote && (
                                    <div className="text-[10px]" style={{ color: 'var(--text3)' }}>{row.bankNote}</div>
                                )}
                            </div>

                            <div className="text-[12px] font-semibold"
                                style={{ color: row.bankAmount === '—' ? 'var(--text3)' : (row.isDebit ? '#991B1B' : '#166534') }}>
                                {row.bankAmount !== '—' && (row.isDebit ? '−' : '+')}{row.bankAmount}
                            </div>

                            {/* Match badge */}
                            <div>
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
                                    style={{ background: style.bg, color: style.color }}>
                                    {row.matchLabel}
                                </span>
                            </div>

                            {/* Flag */}
                            <div className="text-[11px]" style={{ color: style.color }}>
                                {row.flag || '—'}
                            </div>

                            {/* Action */}
                            <div className="flex gap-1.5">
                                {row.matchType === 'exact' ? (
                                    <button className="px-2.5 py-1 rounded-md text-[10px] font-semibold border"
                                        style={{ background: 'var(--surface2)', borderColor: 'var(--border)', color: 'var(--text2)' }}>
                                        View
                                    </button>
                                ) : isReviewed ? (
                                    <span className="text-[10px] font-semibold" style={{ color: '#166534' }}>✓ Reviewed</span>
                                ) : (
                                    <>
                                        <button
                                            onClick={() => setReviewed(prev => new Set([...prev, row.id]))}
                                            className="px-2.5 py-1 rounded-md text-[10px] font-semibold border"
                                            style={{ background: '#DCFCE7', borderColor: 'rgba(22,101,52,0.3)', color: '#166534' }}>
                                            ✓
                                        </button>
                                        <button
                                            className="px-2.5 py-1 rounded-md text-[10px] font-semibold border"
                                            style={{ background: '#FEE2E2', borderColor: 'rgba(153,27,27,0.3)', color: '#991B1B' }}>
                                            {row.matchType === 'fuzzy' ? 'Review' : 'Investigate'}
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    )
                })}

                {/* Footer */}
                <div className="px-5 py-3 flex items-center justify-between"
                    style={{ background: 'var(--surface2)', borderTop: '1px solid var(--border)' }}>
                    <p className="text-[12px]" style={{ color: 'var(--text2)' }}>
                        Showing {filtered.length} of {ROWS.length} entries (sample data)
                    </p>
                    <Link href="/observations"
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-white text-[12px] font-semibold"
                        style={{ background: 'var(--accent)' }}>
                        Next: AI Observations →
                    </Link>
                </div>
            </div>
        </div>
    )
}