'use client'

import { useState } from 'react'
import { AlertTriangle, CheckCircle2, FileOutput } from 'lucide-react'

type Severity = 'high' | 'medium' | 'clean'

interface Observation {
    id: string
    severity: Severity
    section: string
    title: string
    description: string
    amount: string
    meta: string
    status: 'pending' | 'confirmed' | 'overridden'
}

const OBSERVATIONS: Observation[] = [
    {
        id: '1', severity: 'high', section: 'Sec 40A(3)',
        title: 'Cash Payment Exceeds Prescribed Limit',
        description: 'Payment of ₹18,400 made in cash to M/s ABC Goods Supplier on 12-Dec-2024. This exceeds the ₹10,000 per day limit under Sec 40A(3). The entire amount is disallowable as a deduction from income.',
        amount: 'Disallowance: ₹18,400',
        meta: 'Voucher #PY-2024-0892 · Ledger: Cash A/c · Narration: goods purchase · Date: 12 Dec 2024',
        status: 'pending',
    },
    {
        id: '2', severity: 'high', section: 'Sec 43B',
        title: 'ESI/PF Contribution Paid After Due Date',
        description: 'Employee PF contribution of ₹42,000 for April 2024 was paid on 25-May-2024. The due date was 15-May-2024. Under Sec 43B, late payment disallows the deduction for the current year.',
        amount: 'Disallowance: ₹42,000',
        meta: 'Challan Date: 25-May-2024 · Due Date: 15-May-2024 · Delay: 10 days · PF Account: 1234',
        status: 'pending',
    },
    {
        id: '3', severity: 'medium', section: 'GST',
        title: 'GSTR-2B Mismatch — Input Tax Credit at Risk',
        description: '3 purchase invoices totaling ₹1,24,500 have been claimed as ITC in GSTR-3B but are NOT appearing in the supplier\'s GSTR-2B. The ITC may be reversed by the GST department with interest and penalty.',
        amount: 'ITC Risk: ₹1,24,500',
        meta: 'Supplier: Verma Trading Co. · GSTIN: 08AAACV2345K1Z1 · Invoices: 3 nos. · Period: Oct-Dec 2024',
        status: 'pending',
    },
    {
        id: '4', severity: 'medium', section: 'Bank',
        title: 'Bank Entry Party Mismatch — Verification Required',
        description: 'Payment of ₹85,000 on 03-Sep-2024 is recorded in Tally as "Raj Trading Co." but the bank statement shows "Vijay Enterprises". Same amount and date but different party.',
        amount: 'Amount: ₹85,000 · Possible wrong entry',
        meta: 'Tally Voucher: PY-2024-0567 · Bank: SBI A/c · NEFT Ref: SBIN24246789 · Date: 03 Sep 2024',
        status: 'pending',
    },
    {
        id: '5', severity: 'clean', section: 'GST Sales',
        title: 'GST Sales Reconciliation — No Discrepancy Found',
        description: 'GSTR-1 sales figures are fully reconciled with Tally sales register. All invoices are accounted for, output tax liability matches correctly. No unreported income detected.',
        amount: 'Total Sales: ₹1,82,40,000 · 100% matched',
        meta: 'Period: Apr 2024 – Mar 2025 · Invoices checked: 486 · GST collected: ₹21,88,800',
        status: 'confirmed',
    },
]

const SEV_CONFIG: Record<Severity, {
    bar: string; tag: string; tagText: string; tagBg: string; label: string
}> = {
    high: { bar: '#991B1B', tag: 'HIGH RISK', tagBg: '#FEE2E2', tagText: '#991B1B', label: 'High Risk' },
    medium: { bar: '#D97706', tag: 'MEDIUM RISK', tagBg: '#FEF3C7', tagText: '#92400E', label: 'Medium Risk' },
    clean: { bar: '#166534', tag: '✓ CLEAN', tagBg: '#DCFCE7', tagText: '#166534', label: 'Clean' },
}

export default function ObservationsPage() {
    const [obs, setObs] = useState(OBSERVATIONS)

    const update = (id: string, status: 'confirmed' | 'overridden') => {
        setObs(prev => prev.map(o => o.id === id ? { ...o, status } : o))
    }

    const highCount = obs.filter(o => o.severity === 'high').length
    const medCount = obs.filter(o => o.severity === 'medium').length
    const cleanCount = obs.filter(o => o.severity === 'clean').length
    const totalDisallow = '₹2.84L'

    return (
        <div>
            {/* Header */}
            <div className="flex items-start justify-between mb-5">
                <div>
                    <h1 className="text-[22px] font-extrabold tracking-tight flex items-center gap-2"
                        style={{ color: 'var(--text)' }}>
                        <AlertTriangle size={22} color="#D97706" />
                        AI Observations
                    </h1>
                    <p className="text-[13px] mt-1" style={{ color: 'var(--text2)' }}>
                        Joshi &amp; Sons Traders · {obs.length} observations · Total risk: {totalDisallow}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg border text-[12px] font-semibold"
                        style={{ background: 'var(--surface2)', borderColor: 'var(--border2)', color: 'var(--text2)' }}>
                        Export Excel
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-[13px] font-semibold"
                        style={{ background: 'var(--accent)', boxShadow: '0 3px 10px rgba(46,91,232,0.3)' }}>
                        <FileOutput size={14} />
                        Generate 3CD Draft
                    </button>
                </div>
            </div>

            {/* Disclaimer */}
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl border mb-5 text-[12px]"
                style={{ background: '#FEF3C7', borderColor: 'rgba(180,83,9,0.3)', color: '#92400E' }}>
                ℹ️ These are AI-suggested observations. Every finding requires CA verification before use in filing.
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-4 gap-3 mb-5">
                {[
                    { label: 'HIGH RISK', val: String(highCount), sub: 'Immediate review', color: '#991B1B', stripe: '#991B1B', bg: '#FEE2E2' },
                    { label: 'MEDIUM RISK', val: String(medCount), sub: 'Verify & document', color: '#D97706', stripe: '#D97706', bg: '#FEF3C7' },
                    { label: 'INFO / CLEAN', val: String(cleanCount), sub: 'No action needed', color: '#166534', stripe: '#166534', bg: '#DCFCE7' },
                    { label: 'TOTAL DISALLOWANCE', val: totalDisallow, sub: 'Estimated risk', color: '#2E5BE8', stripe: '#2E5BE8', bg: '#EEF2FD' },
                ].map(s => (
                    <div key={s.label} className="rounded-xl border overflow-hidden shadow-card"
                        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
                        <div className="h-[3px]" style={{ background: s.stripe }} />
                        <div className="px-4 py-3.5">
                            <div className="text-[9px] font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--text3)' }}>
                                {s.label}
                            </div>
                            <div className="text-[24px] font-extrabold" style={{ color: s.color }}>{s.val}</div>
                            <div className="text-[10px] mt-0.5" style={{ color: 'var(--text3)' }}>{s.sub}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Observations list */}
            <div className="rounded-xl border overflow-hidden shadow-card"
                style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>

                <div className="flex items-center justify-between px-5 py-3 border-b"
                    style={{ borderColor: 'var(--border)' }}>
                    <h2 className="text-[13px] font-bold" style={{ color: 'var(--text)' }}>
                        🤖 AI-Detected Issues & Disallowances
                    </h2>
                    <p className="text-[11px] italic" style={{ color: 'var(--text3)' }}>
                        AI suggestion only — CA approval mandatory before filing
                    </p>
                </div>

                {obs.map((o, i) => {
                    const sev = SEV_CONFIG[o.severity]
                    return (
                        <div key={o.id}
                            className="flex gap-4 px-5 py-5 border-b transition-colors"
                            style={{
                                borderColor: 'var(--border)',
                                background: i % 2 !== 0 ? 'var(--surface2)' : 'transparent',
                            }}>

                            {/* Severity bar */}
                            <div className="w-1 rounded-full flex-shrink-0 self-stretch"
                                style={{ background: sev.bar, minHeight: 40 }} />

                            {/* Severity tag + section */}
                            <div className="flex flex-col gap-1 w-24 flex-shrink-0 pt-0.5">
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold text-center"
                                    style={{ background: sev.tagBg, color: sev.tagText }}>
                                    {sev.tag}
                                </span>
                                <span className="text-[10px] text-center font-semibold" style={{ color: 'var(--text3)' }}>
                                    {o.section}
                                </span>
                            </div>

                            {/* Body */}
                            <div className="flex-1 min-w-0">
                                <h3 className="text-[13px] font-bold mb-1" style={{ color: 'var(--text)' }}>
                                    {o.title}
                                </h3>
                                <p className="text-[12px] leading-relaxed mb-2" style={{ color: 'var(--text2)' }}>
                                    {o.description}
                                </p>
                                <p className="text-[11px] font-semibold mb-1" style={{ color: sev.bar }}>
                                    {o.amount}
                                </p>
                                <p className="text-[10px]" style={{ color: 'var(--text3)' }}>
                                    {o.meta}
                                </p>
                            </div>

                            {/* Actions */}
                            <div className="flex flex-col gap-2 flex-shrink-0 justify-start pt-0.5">
                                {o.status === 'confirmed' ? (
                                    <span className="flex items-center gap-1 text-[11px] font-semibold px-3 py-1.5 rounded-lg"
                                        style={{ background: '#DCFCE7', color: '#166534' }}>
                                        <CheckCircle2 size={12} /> Verified
                                    </span>
                                ) : o.status === 'overridden' ? (
                                    <span className="text-[11px] font-semibold px-3 py-1.5 rounded-lg"
                                        style={{ background: '#F3E8FF', color: '#6B21A8' }}>
                                        Overridden
                                    </span>
                                ) : (
                                    <>
                                        <button onClick={() => update(o.id, 'confirmed')}
                                            className="px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition-colors hover:opacity-90"
                                            style={{ background: '#DCFCE7', borderColor: 'rgba(22,101,52,0.3)', color: '#166534' }}>
                                            ✓ Confirm
                                        </button>
                                        {o.severity !== 'clean' && (
                                            <button onClick={() => update(o.id, 'overridden')}
                                                className="px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition-colors hover:opacity-90"
                                                style={{ background: '#FEE2E2', borderColor: 'rgba(153,27,27,0.3)', color: '#991B1B' }}>
                                                ✗ Override
                                            </button>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    )
                })}

                {/* Footer summary */}
                <div className="px-5 py-3.5 flex items-center justify-between"
                    style={{ background: 'var(--surface2)', borderTop: '1px solid var(--border)' }}>
                    <p className="text-[12px]" style={{ color: 'var(--text2)' }}>
                        {obs.filter(o => o.status !== 'pending').length} of {obs.length} observations reviewed
                    </p>
                    <button className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-white text-[12px] font-semibold"
                        style={{ background: 'var(--accent)' }}>
                        Generate 3CD Draft →
                    </button>
                </div>
            </div>
        </div>
    )
}