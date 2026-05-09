'use client'

import { useState, useEffect } from 'react'
import { Download, RefreshCw, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react'
import Link from 'next/link'
import clsx from 'clsx'
import api from '@/lib/api'

const CLIENT_ID = 4  // apna client ID yahan daalo

type MatchType = 'exact' | 'fuzzy' | 'amount_only' | 'unmatched_tally' | 'unmatched_bank'
type FlagType = 'none' | 'cash_payment' | 'party_mismatch' | 'duplicate' | 'sec_40a3_risk'

interface ReconRow {
    id: number
    match_type: MatchType
    match_score: number
    flag_type: FlagType
    flag_description: string
    ca_review_status: string
    tally: {
        date: string
        party: string
        amount: number
        voucher_type: string
        narration: string
    } | null
    bank: {
        date: string
        description: string
        debit: number
        credit: number
        balance: number
    } | null
}

interface Summary {
    total: number
    exact_matched: number
    fuzzy_matched: number
    unmatched_tally: number
    unmatched_bank: number
    flagged: number
    sec_40a3_risk: number
    tds_applicable: number
    pending_review: number
}

const MATCH_STYLE: Record<string, { bg: string; color: string; bar: string; label: string }> = {
    exact: { bg: '#DCFCE7', color: '#166534', bar: '#166534', label: 'Exact' },
    fuzzy: { bg: '#FEF3C7', color: '#92400E', bar: '#D97706', label: 'Fuzzy' },
    amount_only: { bg: '#EEF2FD', color: '#2E5BE8', bar: '#2E5BE8', label: 'Amount' },
    unmatched_tally: { bg: '#FEE2E2', color: '#991B1B', bar: '#991B1B', label: 'Unmatched' },
    unmatched_bank: { bg: '#F3E8FF', color: '#6B21A8', bar: '#7C3AED', label: 'Bank Only' },
}

const FLAG_LABEL: Record<string, { color: string; label: string }> = {
    none:           { color: 'var(--text3)', label: '—' },
    cash_payment:   { color: '#D97706',      label: '💵 Cash / No bank entry' },
    party_mismatch: { color: '#D97706',      label: '⚠️ Party mismatch' },
    duplicate:      { color: '#7C3AED',      label: '🔁 Duplicate' },
    sec_40a3_risk:  { color: '#991B1B',      label: '🔴 Sec 40A(3)' },
    tds_applicable: { color: '#B45309',      label: '📋 TDS applicable' },
}

const TABS = ['All', 'Matched', 'Review Needed', 'Unmatched', 'Flags']

export default function BankReconPage() {
    const [rows, setRows] = useState<ReconRow[]>([])
    const [summary, setSummary] = useState<Summary | null>(null)
    const [loading, setLoading] = useState(false)
    const [starting, setStarting] = useState(false)
    const [activeTab, setActiveTab] = useState('All')
    const [error, setError] = useState('')
    const [reviewing, setReviewing] = useState<number | null>(null)
    const [bulkApproving, setBulkApproving] = useState(false)
    const [toast, setToast] = useState('')

    useEffect(() => {
        loadResults()
        loadSummary()
    }, [])

    const loadResults = async () => {
        setLoading(true)
        try {
            const res = await api.get(`/recon/results/${CLIENT_ID}`)
            setRows(res.data.data || [])
        } catch {
            setRows([])
        } finally { setLoading(false) }
    }

    const loadSummary = async () => {
        try {
            const res = await api.get(`/recon/summary/${CLIENT_ID}`)
            setSummary(res.data)
        } catch { setSummary(null) }
    }

    const startReconciliation = async () => {
        setStarting(true); setError('')
        try {
            await api.post(`/recon/start/${CLIENT_ID}`)
            await loadResults()
            await loadSummary()
        } catch (e: any) {
            setError(e.response?.data?.detail || 'Failed — pehle Tally sync aur bank upload karo')
        } finally { setStarting(false) }
    }

    const showToast = (msg: string) => {
        setToast(msg)
        setTimeout(() => setToast(''), 3000)
    }

    const reviewEntry = async (id: number, status: 'confirmed' | 'overridden') => {
        setReviewing(id)
        try {
            await api.put(`/recon/review/${id}`, { ca_review_status: status, reviewed_by: 'CA' })
            setRows(prev => prev.map(r => r.id === id ? { ...r, ca_review_status: status } : r))
        } catch { alert('Save nahi hua') }
        finally { setReviewing(null) }
    }

    const bulkApprove = async () => {
        // Approve all pending fuzzy/amount_only matches in current filtered view
        const pending = filtered.filter(r =>
            ['fuzzy', 'amount_only'].includes(r.match_type) &&
            r.ca_review_status === 'pending'
        )
        if (pending.length === 0) return
        setBulkApproving(true)
        try {
            await Promise.all(
                pending.map(r =>
                    api.put(`/recon/review/${r.id}`, { ca_review_status: 'confirmed', reviewed_by: 'CA' })
                )
            )
            setRows(prev => prev.map(r =>
                pending.find(p => p.id === r.id)
                    ? { ...r, ca_review_status: 'confirmed' }
                    : r
            ))
            await loadSummary()
            showToast(`✓ ${pending.length} entries approved`)
        } catch { showToast('Kuch entries save nahi hui') }
        finally { setBulkApproving(false) }
    }

    const filtered = rows.filter(r => {
        if (activeTab === 'All') return true
        if (activeTab === 'Matched') return r.match_type === 'exact'
        if (activeTab === 'Review Needed') return ['fuzzy', 'amount_only'].includes(r.match_type)
        if (activeTab === 'Unmatched') return ['unmatched_tally', 'unmatched_bank'].includes(r.match_type)
        if (activeTab === 'Flags') return r.flag_type !== 'none'
        return true
    })

    const fmtAmt = (n: number) => n > 0 ? `₹${n.toLocaleString('en-IN')}` : '—'

    // Pending fuzzy in current view — for bulk approve button
    const pendingFuzzy = filtered.filter(r =>
        ['fuzzy', 'amount_only'].includes(r.match_type) && r.ca_review_status === 'pending'
    )

    return (
        <div>
            {/* Toast */}
            {toast && (
                <div className="fixed top-5 right-5 z-50 px-4 py-2.5 rounded-xl text-white text-[13px] font-semibold shadow-2xl"
                    style={{ background: '#166534' }}>
                    {toast}
                </div>
            )}

            {/* Header */}
            <div className="flex items-start justify-between mb-5">
                <div>
                    <h1 className="text-[22px] font-extrabold tracking-tight" style={{ color: 'var(--text)' }}>
                        🏦 Bank Reconciliation
                    </h1>
                    <p className="text-[13px] mt-1" style={{ color: 'var(--text2)' }}>
                        Client #{CLIENT_ID} · {rows.length} entries
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={loadResults} disabled={loading}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg border text-[12px] font-semibold"
                        style={{ background: 'var(--surface2)', borderColor: 'var(--border2)', color: 'var(--text2)' }}>
                        <RefreshCw size={13} className={clsx(loading && 'animate-spin')} />
                        Refresh
                    </button>
                    <Link href="/rules"
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg border text-[12px] font-semibold"
                        style={{ background: 'var(--surface2)', borderColor: 'var(--border2)', color: 'var(--text2)' }}>
                        ⚙️ Rules
                    </Link>
                    <button
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg border text-[12px] font-semibold"
                        style={{ background: 'var(--surface2)', borderColor: 'var(--border2)', color: 'var(--text2)' }}>
                        <Download size={13} /> Download
                    </button>
                    <button onClick={startReconciliation} disabled={starting}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-[13px] font-semibold disabled:opacity-60"
                        style={{ background: 'var(--accent)', boxShadow: '0 3px 10px rgba(46,91,232,0.3)' }}>
                        {starting
                            ? <><RefreshCw size={13} className="animate-spin" /> Running…</>
                            : '▶ Start Reconciliation'
                        }
                    </button>
                </div>
            </div>

            {/* Error */}
            {error && (
                <div className="mb-4 px-4 py-3 rounded-xl border text-[12px]"
                    style={{ background: '#FEE2E2', borderColor: 'rgba(153,27,27,0.3)', color: '#991B1B' }}>
                    ❌ {error}
                    <div className="mt-1 text-[11px]">
                        Steps: 1) Upload page pe Tally sync karo → 2) Bank statement upload karo → 3) Phir Start karo
                    </div>
                </div>
            )}

            {/* Empty state */}
            {!loading && rows.length === 0 && !error && (
                <div className="mb-5 px-5 py-6 rounded-xl border text-center"
                    style={{ background: '#EEF2FD', borderColor: 'rgba(46,91,232,0.2)' }}>
                    <p className="text-[15px] font-bold mb-1" style={{ color: '#1F3A8C' }}>
                        Koi data nahi hai abhi
                    </p>
                    <p className="text-[12px] mb-4" style={{ color: '#2E5BE8' }}>
                        Pehle Upload page pe Tally sync karo + bank statement upload karo
                    </p>
                    <div className="flex items-center justify-center gap-3">
                        <Link href="/upload"
                            className="px-4 py-2 rounded-lg text-white text-[12px] font-semibold"
                            style={{ background: 'var(--accent)' }}>
                            ← Go to Upload
                        </Link>
                        <button onClick={startReconciliation} disabled={starting}
                            className="px-4 py-2 rounded-lg border text-[12px] font-semibold"
                            style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }}>
                            Try Anyway
                        </button>
                    </div>
                </div>
            )}

            {/* Summary cards */}
            <div className="grid grid-cols-5 gap-3 mb-5">
                {[
                    { label: 'Exact Match',    val: summary?.exact_matched ?? 0,                                                  color: '#166534', stripe: '#166534', bg: '#DCFCE7', icon: <CheckCircle2 size={16} color="#166534" /> },
                    { label: 'Fuzzy Match',    val: summary?.fuzzy_matched ?? 0,                                                  color: '#D97706', stripe: '#D97706', bg: '#FEF3C7', icon: <AlertTriangle size={16} color="#D97706" /> },
                    { label: 'Unmatched',      val: (summary?.unmatched_tally ?? 0) + (summary?.unmatched_bank ?? 0),             color: '#991B1B', stripe: '#991B1B', bg: '#FEE2E2', icon: <XCircle size={16} color="#991B1B" /> },
                    { label: 'TDS Flags',      val: summary?.tds_applicable ?? 0,                                                 color: '#B45309', stripe: '#B45309', bg: '#FEF3C7', icon: <AlertTriangle size={16} color="#B45309" /> },
                    { label: 'Sec 40A(3)',     val: summary?.sec_40a3_risk ?? 0,                                                  color: '#6B21A8', stripe: '#7C3AED', bg: '#F3E8FF', icon: <AlertTriangle size={16} color="#7C3AED" /> },
                ].map(s => (
                    <div key={s.label} className="rounded-xl border overflow-hidden shadow-card"
                        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
                        <div className="h-[3px]" style={{ background: s.stripe }} />
                        <div className="px-4 py-3.5">
                            <div className="w-7 h-7 rounded-lg flex items-center justify-center mb-2"
                                style={{ background: s.bg }}>{s.icon}</div>
                            <div className="text-[9px] font-bold uppercase tracking-wider mb-1"
                                style={{ color: 'var(--text3)' }}>{s.label}</div>
                            <div className="text-[26px] font-extrabold" style={{ color: s.color }}>{s.val}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Results table */}
            <div className="rounded-xl border overflow-hidden shadow-card"
                style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>

                {/* Table header + tabs */}
                <div className="flex items-center justify-between px-5 py-3 border-b"
                    style={{ borderColor: 'var(--border)' }}>
                    <div className="flex items-center gap-3">
                        <h2 className="text-[13px] font-bold" style={{ color: 'var(--text)' }}>
                            📊 Reconciliation Results
                        </h2>
                        {/* Bulk Approve — only on Review Needed tab with pending entries */}
                        {activeTab === 'Review Needed' && pendingFuzzy.length > 0 && (
                            <button
                                onClick={bulkApprove}
                                disabled={bulkApproving}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold border disabled:opacity-60"
                                style={{ background: '#DCFCE7', borderColor: 'rgba(22,101,52,0.3)', color: '#166534' }}>
                                {bulkApproving
                                    ? <><RefreshCw size={11} className="animate-spin" /> Approving…</>
                                    : <>✓ Approve All ({pendingFuzzy.length})</>
                                }
                            </button>
                        )}
                    </div>
                    <div className="flex gap-1 p-1 rounded-lg" style={{ background: 'var(--surface2)' }}>
                        {TABS.map(t => (
                            <button key={t} onClick={() => setActiveTab(t)}
                                className="px-3 py-1 rounded-md text-[11px] font-semibold transition-all"
                                style={activeTab === t
                                    ? { background: 'var(--surface)', color: 'var(--accent)' }
                                    : { color: 'var(--text2)' }}>
                                {t}
                                {t === 'Flags' && (summary?.flagged ?? 0) > 0 && (
                                    <span className="ml-1 px-1.5 rounded-full text-[9px] text-white"
                                        style={{ background: '#991B1B' }}>
                                        {summary?.flagged}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Col headers */}
                <div className="grid border-b px-5 py-2.5"
                    style={{
                        gridTemplateColumns: '100px 1fr 90px 1fr 90px 100px 160px 120px',
                        background: 'var(--surface2)',
                        borderColor: 'var(--border)',
                    }}>
                    {['Date', 'Tally Entry', 'Amount', 'Bank Entry', 'Amount', 'Match', 'Flag', 'Action'].map((h, i) => (
                        <span key={i} className="text-[10px] font-bold uppercase tracking-wider"
                            style={{ color: 'var(--text3)' }}>{h}</span>
                    ))}
                </div>

                {/* Loading */}
                {loading && (
                    <div className="py-14 text-center" style={{ color: 'var(--text3)' }}>
                        <RefreshCw size={20} className="animate-spin mx-auto mb-2 opacity-40" />
                        <p className="text-[13px]">Loading…</p>
                    </div>
                )}

                {/* No filtered results */}
                {!loading && rows.length > 0 && filtered.length === 0 && (
                    <div className="py-10 text-center text-[13px]" style={{ color: 'var(--text3)' }}>
                        Is tab mein koi entries nahi
                    </div>
                )}

                {/* Rows */}
                {!loading && filtered.map((row, i) => {
                    const ms = MATCH_STYLE[row.match_type] || MATCH_STYLE['exact']
                    const fl = FLAG_LABEL[row.flag_type] || FLAG_LABEL['none']
                    const amt = row.tally?.amount ?? 0
                    const isDebit = amt < 0

                    return (
                        <div key={row.id}
                            className="grid items-center px-5 py-3.5 border-b relative hover:bg-gray-50/50 transition-colors"
                            style={{
                                gridTemplateColumns: '100px 1fr 90px 1fr 90px 100px 160px 120px',
                                borderColor: 'var(--border)',
                                background: i % 2 !== 0 ? 'var(--surface2)' : 'transparent',
                            }}>

                            {/* Left color bar */}
                            <div className="absolute left-0 top-0 bottom-0 w-1 rounded-r-sm"
                                style={{ background: ms.bar }} />

                            {/* Date */}
                            <div className="text-[10px] font-mono pl-1" style={{ color: 'var(--text3)' }}>
                                {row.tally?.date || row.bank?.date || '—'}
                            </div>

                            {/* Tally entry */}
                            <div>
                                <div className="text-[12px] font-semibold" style={{ color: 'var(--text)' }}>
                                    {row.tally?.party || '—'}
                                </div>
                                <div className="text-[10px]" style={{ color: 'var(--text3)' }}>
                                    {row.tally?.voucher_type || ''}
                                </div>
                            </div>

                            {/* Tally amount */}
                            <div className="text-[12px] font-semibold"
                                style={{ color: amt === 0 ? 'var(--text3)' : isDebit ? '#991B1B' : '#166534' }}>
                                {amt !== 0 ? `${isDebit ? '−' : '+'}${fmtAmt(Math.abs(amt))}` : '—'}
                            </div>

                            {/* Bank entry */}
                            <div className="text-[12px]" style={{ color: 'var(--text)' }}>
                                {row.bank?.description || '—'}
                            </div>

                            {/* Bank amount */}
                            <div className="text-[12px] font-semibold" style={{ color: 'var(--text2)' }}>
                                {row.bank
                                    ? row.bank.debit > 0
                                        ? `−${fmtAmt(row.bank.debit)}`
                                        : `+${fmtAmt(row.bank.credit)}`
                                    : '—'
                                }
                            </div>

                            {/* Match badge */}
                            <div>
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
                                    style={{ background: ms.bg, color: ms.color }}>
                                    {ms.label}{row.match_type === 'fuzzy' ? ` ${Math.round(row.match_score)}%` : ''}
                                </span>
                            </div>

                            {/* Flag */}
                            <div className="text-[11px]" style={{ color: fl.color }}>
                                {fl.label}
                            </div>

                            {/* Action buttons */}
                            <div className="flex gap-1.5 items-center">
                                {row.ca_review_status === 'confirmed' ? (
                                    <span className="text-[10px] font-semibold flex items-center gap-1"
                                        style={{ color: '#166534' }}>
                                        <CheckCircle2 size={11} /> Done
                                    </span>
                                ) : row.ca_review_status === 'overridden' ? (
                                    <span className="text-[10px] font-semibold" style={{ color: '#6B21A8' }}>
                                        Overridden
                                    </span>
                                ) : row.match_type === 'exact' ? (
                                    <button onClick={() => reviewEntry(row.id, 'confirmed')}
                                        disabled={reviewing === row.id}
                                        className="px-2.5 py-1 rounded-md text-[10px] font-semibold border"
                                        style={{ background: 'var(--surface2)', borderColor: 'var(--border)', color: 'var(--text2)' }}>
                                        {reviewing === row.id ? '…' : 'Verify'}
                                    </button>
                                ) : (
                                    <>
                                        <button onClick={() => reviewEntry(row.id, 'confirmed')}
                                            disabled={reviewing === row.id}
                                            className="px-2.5 py-1 rounded-md text-[10px] font-semibold border"
                                            style={{ background: '#DCFCE7', borderColor: 'rgba(22,101,52,0.3)', color: '#166534' }}>
                                            {reviewing === row.id ? '…' : '✓'}
                                        </button>
                                        <button onClick={() => reviewEntry(row.id, 'overridden')}
                                            disabled={reviewing === row.id}
                                            className="px-2.5 py-1 rounded-md text-[10px] font-semibold border"
                                            style={{ background: '#FEE2E2', borderColor: 'rgba(153,27,27,0.3)', color: '#991B1B' }}>
                                            ✗
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
                    <p className="text-[12px]" style={{ color: 'var(--text3)' }}>
                        {filtered.length} of {rows.length} entries
                        {(summary?.pending_review ?? 0) > 0 && ` · ${summary?.pending_review} pending review`}
                    </p>
                    <Link href="/observations"
                        className="px-4 py-2 rounded-lg text-white text-[12px] font-semibold"
                        style={{ background: 'var(--accent)' }}>
                        Next: AI Observations →
                    </Link>
                </div>
            </div>
        </div>
    )
}