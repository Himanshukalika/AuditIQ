'use client'

import { useState, useEffect } from 'react'
import { RefreshCw, RotateCcw, Save, AlertTriangle, ShieldCheck, Info } from 'lucide-react'
import Link from 'next/link'
import api from '@/lib/api'

interface AuditRule {
    id: string
    section: string
    name: string
    flag_type: string
    severity: 'high' | 'medium' | 'low'
    amount_gt: number
    enabled: boolean
    keywords: string[]
    voucher_types: string[]
    payment_mode: string
    message: string
}

const SEVERITY_STYLE = {
    high:   { bg: '#FEE2E2', color: '#991B1B', dot: '#DC2626', label: 'High' },
    medium: { bg: '#FEF3C7', color: '#92400E', dot: '#D97706', label: 'Medium' },
    low:    { bg: '#EEF2FD', color: '#1E40AF', dot: '#3B82F6', label: 'Low' },
}

const FLAG_STYLE: Record<string, { bg: string; color: string; label: string }> = {
    sec_40a3_risk:  { bg: '#F3E8FF', color: '#6B21A8', label: '🔴 Sec 40A(3)' },
    tds_applicable: { bg: '#FEF3C7', color: '#B45309', label: '📋 TDS Applicable' },
    cash_payment:   { bg: '#FEE2E2', color: '#991B1B', label: '💵 Cash Payment' },
}

export default function RulesPage() {
    const [rules, setRules]     = useState<AuditRule[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving]   = useState<string | null>(null)
    const [toast, setToast]     = useState('')
    // Local edits: { [rule_id]: { amount_gt, enabled } }
    const [edits, setEdits]     = useState<Record<string, Partial<AuditRule>>>({})

    useEffect(() => { loadRules() }, [])

    const loadRules = async () => {
        setLoading(true)
        try {
            const res = await api.get('/recon/rules')
            setRules(res.data.rules || [])
            setEdits({})
        } catch { showToast('Rules load nahi hue') }
        finally { setLoading(false) }
    }

    const showToast = (msg: string) => {
        setToast(msg)
        setTimeout(() => setToast(''), 3000)
    }

    const getVal = (rule: AuditRule, field: keyof AuditRule) =>
        edits[rule.id]?.[field] !== undefined ? edits[rule.id][field] : rule[field]

    const setEdit = (id: string, patch: Partial<AuditRule>) =>
        setEdits(prev => ({ ...prev, [id]: { ...prev[id], ...patch } }))

    const isDirty = (id: string) => !!edits[id] && Object.keys(edits[id]).length > 0

    const saveRule = async (rule: AuditRule) => {
        const patch = edits[rule.id]
        if (!patch) return
        setSaving(rule.id)
        try {
            await api.put(`/recon/rules/${rule.id}`, patch)
            // Merge saved values back into rules
            setRules(prev => prev.map(r => r.id === rule.id ? { ...r, ...patch } : r))
            setEdits(prev => { const n = { ...prev }; delete n[rule.id]; return n })
            showToast(`✓ "${rule.name}" saved`)
        } catch { showToast('Save nahi hua — backend check karo') }
        finally { setSaving(null) }
    }

    const resetRule = async (rule: AuditRule) => {
        setSaving(rule.id)
        try {
            await api.post(`/recon/rules/${rule.id}/reset`)
            await loadRules()
            showToast(`↺ "${rule.name}" reset to defaults`)
        } catch { showToast('Reset nahi hua') }
        finally { setSaving(null) }
    }

    const toggleRule = (rule: AuditRule) => {
        const newEnabled = !getVal(rule, 'enabled') as boolean
        setEdit(rule.id, { enabled: newEnabled })
    }

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
            <div className="flex items-start justify-between mb-6">
                <div>
                    <h1 className="text-[22px] font-extrabold tracking-tight" style={{ color: 'var(--text)' }}>
                        ⚙️ Audit Rules
                    </h1>
                    <p className="text-[13px] mt-1" style={{ color: 'var(--text2)' }}>
                        In-built Indian tax rules — threshold edit karo ya rule band karo
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={loadRules} disabled={loading}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg border text-[12px] font-semibold"
                        style={{ background: 'var(--surface2)', borderColor: 'var(--border2)', color: 'var(--text2)' }}>
                        <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
                        Refresh
                    </button>
                    <Link href="/bank"
                        className="px-4 py-2 rounded-lg text-white text-[13px] font-semibold"
                        style={{ background: 'var(--accent)' }}>
                        ← Bank Recon
                    </Link>
                </div>
            </div>

            {/* Info banner */}
            <div className="flex items-start gap-3 mb-6 px-4 py-3 rounded-xl border"
                style={{ background: '#EEF2FD', borderColor: 'rgba(46,91,232,0.2)' }}>
                <Info size={16} className="mt-0.5 shrink-0" style={{ color: '#2E5BE8' }} />
                <p className="text-[12px]" style={{ color: '#1E3A8A' }}>
                    Ye rules reconciliation ke time automatically apply hote hain. Threshold change karne ke baad
                    <strong> Start Reconciliation</strong> dobara chalao nayi flags ke liye.
                </p>
            </div>

            {/* Loading */}
            {loading && (
                <div className="py-16 text-center" style={{ color: 'var(--text3)' }}>
                    <RefreshCw size={22} className="animate-spin mx-auto mb-3 opacity-40" />
                    <p className="text-[13px]">Loading rules…</p>
                </div>
            )}

            {/* Rules grid */}
            {!loading && (
                <div className="grid grid-cols-1 gap-4">
                    {rules.map(rule => {
                        const sev      = SEVERITY_STYLE[rule.severity] || SEVERITY_STYLE.low
                        const flagStyle = FLAG_STYLE[rule.flag_type]  || FLAG_STYLE.cash_payment
                        const enabled  = getVal(rule, 'enabled') as boolean
                        const amtVal   = getVal(rule, 'amount_gt') as number
                        const dirty    = isDirty(rule.id)
                        const isSaving = saving === rule.id

                        return (
                            <div key={rule.id}
                                className="rounded-xl border overflow-hidden shadow-card transition-all"
                                style={{
                                    background:   'var(--surface)',
                                    borderColor:  dirty ? 'rgba(46,91,232,0.5)' : 'var(--border)',
                                    opacity:      enabled ? 1 : 0.55,
                                }}>

                                {/* Top stripe */}
                                <div className="h-[3px]" style={{ background: sev.dot }} />

                                <div className="px-5 py-4">
                                    <div className="flex items-start justify-between gap-4">

                                        {/* Left: section + name + badges */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                {/* Section badge */}
                                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider"
                                                    style={{ background: sev.bg, color: sev.color }}>
                                                    {rule.section}
                                                </span>
                                                {/* Flag type badge */}
                                                <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold"
                                                    style={{ background: flagStyle.bg, color: flagStyle.color }}>
                                                    {flagStyle.label}
                                                </span>
                                                {/* Severity dot */}
                                                <span className="flex items-center gap-1 text-[10px]"
                                                    style={{ color: sev.color }}>
                                                    <span className="w-1.5 h-1.5 rounded-full inline-block"
                                                        style={{ background: sev.dot }} />
                                                    {sev.label} priority
                                                </span>
                                            </div>

                                            <h3 className="text-[14px] font-bold mb-1" style={{ color: 'var(--text)' }}>
                                                {rule.name}
                                            </h3>

                                            {/* Keywords preview */}
                                            {rule.keywords.length > 0 && (
                                                <div className="flex flex-wrap gap-1 mt-2">
                                                    {rule.keywords.slice(0, 6).map(kw => (
                                                        <span key={kw}
                                                            className="px-1.5 py-0.5 rounded text-[10px] font-mono"
                                                            style={{ background: 'var(--surface2)', color: 'var(--text3)' }}>
                                                            {kw}
                                                        </span>
                                                    ))}
                                                    {rule.keywords.length > 6 && (
                                                        <span className="text-[10px]" style={{ color: 'var(--text3)' }}>
                                                            +{rule.keywords.length - 6} more
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {/* Right: controls */}
                                        <div className="flex items-center gap-3 shrink-0">

                                            {/* Threshold input */}
                                            {rule.amount_gt > 0 && (
                                                <div className="flex flex-col items-end gap-1">
                                                    <label className="text-[9px] font-bold uppercase tracking-wider"
                                                        style={{ color: 'var(--text3)' }}>
                                                        Threshold
                                                    </label>
                                                    <div className="flex items-center gap-1">
                                                        <span className="text-[12px]" style={{ color: 'var(--text3)' }}>₹</span>
                                                        <input
                                                            type="number"
                                                            value={amtVal}
                                                            onChange={e => setEdit(rule.id, { amount_gt: Number(e.target.value) })}
                                                            disabled={!enabled || isSaving}
                                                            className="w-28 px-2 py-1.5 rounded-lg border text-[12px] font-semibold text-right"
                                                            style={{
                                                                background:   'var(--surface2)',
                                                                borderColor:  dirty ? 'rgba(46,91,232,0.5)' : 'var(--border)',
                                                                color:        'var(--text)',
                                                                outline:      'none',
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                            )}

                                            {/* Toggle switch */}
                                            <div className="flex flex-col items-center gap-1">
                                                <label className="text-[9px] font-bold uppercase tracking-wider"
                                                    style={{ color: 'var(--text3)' }}>
                                                    {enabled ? 'Active' : 'Off'}
                                                </label>
                                                <button
                                                    onClick={() => toggleRule(rule)}
                                                    disabled={isSaving}
                                                    className="relative w-11 h-6 rounded-full transition-colors duration-200"
                                                    style={{ background: enabled ? '#166534' : 'var(--border2)' }}>
                                                    <span
                                                        className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all duration-200"
                                                        style={{ left: enabled ? '22px' : '2px' }}
                                                    />
                                                </button>
                                            </div>

                                            {/* Save / Reset */}
                                            <div className="flex flex-col gap-1.5">
                                                <button
                                                    onClick={() => saveRule(rule)}
                                                    disabled={!dirty || isSaving}
                                                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg border text-[11px] font-semibold disabled:opacity-40"
                                                    style={{
                                                        background:  dirty ? '#2E5BE8' : 'var(--surface2)',
                                                        borderColor: dirty ? '#2E5BE8' : 'var(--border)',
                                                        color:       dirty ? '#fff'    : 'var(--text3)',
                                                    }}>
                                                    {isSaving
                                                        ? <RefreshCw size={10} className="animate-spin" />
                                                        : <Save size={10} />
                                                    }
                                                    Save
                                                </button>
                                                <button
                                                    onClick={() => resetRule(rule)}
                                                    disabled={isSaving}
                                                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg border text-[11px] font-semibold"
                                                    style={{ background: 'var(--surface2)', borderColor: 'var(--border)', color: 'var(--text3)' }}>
                                                    <RotateCcw size={10} />
                                                    Reset
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Unsaved changes indicator */}
                                    {dirty && (
                                        <div className="mt-3 flex items-center gap-1.5 text-[11px]"
                                            style={{ color: '#2E5BE8' }}>
                                            <AlertTriangle size={11} />
                                            Unsaved changes — Save button dabao phir Start Reconciliation chalao
                                        </div>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            {/* Footer */}
            <div className="mt-6 flex items-center justify-between px-4 py-3 rounded-xl border"
                style={{ background: 'var(--surface2)', borderColor: 'var(--border)' }}>
                <div className="flex items-center gap-2">
                    <ShieldCheck size={14} style={{ color: 'var(--text3)' }} />
                    <p className="text-[12px]" style={{ color: 'var(--text3)' }}>
                        {rules.filter(r => r.enabled).length} of {rules.length} rules active
                    </p>
                </div>
                <Link href="/bank"
                    className="px-4 py-2 rounded-lg text-white text-[12px] font-semibold"
                    style={{ background: 'var(--accent)' }}>
                    ← Back to Reconciliation
                </Link>
            </div>
        </div>
    )
}
