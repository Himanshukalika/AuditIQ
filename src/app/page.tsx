'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Users, CheckCircle2, Clock, AlertTriangle, RefreshCw, ArrowRight } from 'lucide-react'
import StatCard from '@/app/components/StatCard'
import StatusBadge from '@/app/components/StatusBadge'
import ProgressBar from '@/app/components/ProgressBar'
import api from '@/lib/api'

const FIRM_ID = 1   // hardcode — auth baad mein

interface ClientRow {
  id: number
  client_name: string
  pan: string
  turnover_approx: number | null
  audit_status: string
  audit_progress_pct: number
  tally_count: number
  bank_count: number
  flagged_count: number
  financial_year: string
}

interface Stats {
  total_clients: number
  completed: number
  in_progress: number
  pending: number
  total_flagged: number
  total_flag_amount: number
}

interface ActiveClient {
  id: number
  name: string
  status: string
  progress: number
  tally_count: number
  bank_count: number
  recon_total: number
  recon_exact: number
  recon_fuzzy: number
  recon_flagged: number
}

// Map audit_status → audit step index (0-based)
const STATUS_STEP: Record<string, number> = {
  pending:       0,
  tally_synced:  1,
  bank_uploaded: 2,
  bank_recon:    3,
  completed:     4,
}

const AUDIT_STEPS = [
  { label: 'Data Upload',         key: 'tally_synced' },
  { label: 'Bank Statement',      key: 'bank_uploaded' },
  { label: 'Bank Reconciliation', key: 'bank_recon' },
  { label: 'AI Observations',     key: 'observations' },
  { label: 'Generate Report',     key: 'completed' },
]

const PORTALS = [
  { abbr: 'GST', name: 'GST Portal',    status: 'Connected · ASP via GSTHero', ok: true },
  { abbr: 'TRC', name: 'Traces Portal', status: 'Connected',                   ok: true },
  { abbr: 'ITD', name: 'IT Portal',     status: 'Not linked',                  ok: false },
  { abbr: 'TLY', name: 'Tally ODBC',   status: 'Live · localhost:9000',        ok: true },
]

function fmtTurnover(n: number | null) {
  if (!n) return '—'
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(1)} Cr`
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(1)} L`
  return `₹${n.toLocaleString('en-IN')}`
}

function fmtAmount(n: number) {
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(1)} Cr`
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(1)} L`
  return `₹${n.toLocaleString('en-IN')}`
}

function progressColor(pct: number) {
  if (pct === 100) return '#166534'
  if (pct >= 50)  return '#2E5BE8'
  if (pct >= 20)  return '#D97706'
  return '#991B1B'
}

export default function DashboardPage() {
  const [stats, setStats]       = useState<Stats | null>(null)
  const [clients, setClients]   = useState<ClientRow[]>([])
  const [active, setActive]     = useState<ActiveClient | null>(null)
  const [loading, setLoading]   = useState(true)
  const [tab, setTab]           = useState<'All' | 'Pending' | 'Done'>('All')

  useEffect(() => { loadDashboard() }, [])

  const loadDashboard = async () => {
    setLoading(true)
    try {
      const res = await api.get(`/clients/dashboard?firm_id=${FIRM_ID}`)
      setStats(res.data.stats)
      setClients(res.data.clients || [])
      setActive(res.data.active_client)
    } catch {
      setStats(null)
      setClients([])
    } finally { setLoading(false) }
  }

  const filtered = clients.filter(c => {
    if (tab === 'Done')    return c.audit_status === 'completed'
    if (tab === 'Pending') return c.audit_status === 'pending'
    return true
  })

  const activeStep = active ? (STATUS_STEP[active.status] ?? 0) : 0

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-[22px] font-extrabold tracking-tight" style={{ color: 'var(--text)' }}>
            Good morning, CA 👋
          </h1>
          <p className="text-[13px] mt-1" style={{ color: 'var(--text2)' }}>
            AY 2025-26 · Tax Audit Season · Due: 31 Oct 2025
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={loadDashboard} disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border text-[12px] font-semibold"
            style={{ background: 'var(--surface2)', borderColor: 'var(--border2)', color: 'var(--text2)' }}>
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          </button>
          <Link href="/upload"
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-[13px] font-semibold"
            style={{ background: 'var(--accent)', boxShadow: '0 3px 10px rgba(46,91,232,0.3)' }}>
            ▶ Start New Audit
          </Link>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-4 mb-5">
        <StatCard
          label="Total Clients"
          value={loading ? '…' : String(stats?.total_clients ?? 0)}
          change={`${stats?.in_progress ?? 0} in progress`}
          changeType="up"
          stripeColor="#2E5BE8" iconBg="#EEF2FD"
          icon={<Users size={17} color="#2E5BE8" />}
        />
        <StatCard
          label="Audits Completed"
          value={loading ? '…' : String(stats?.completed ?? 0)}
          change={stats && stats.total_clients > 0
            ? `${Math.round((stats.completed / stats.total_clients) * 100)}% completion rate`
            : '—'}
          changeType="up"
          stripeColor="#166534" iconBg="#DCFCE7"
          icon={<CheckCircle2 size={17} color="#166534" />}
        />
        <StatCard
          label="In Progress"
          value={loading ? '…' : String(stats?.in_progress ?? 0)}
          change={`${stats?.pending ?? 0} yet to start`}
          changeType="warn"
          stripeColor="#D97706" iconBg="#FEF3C7"
          icon={<Clock size={17} color="#D97706" />}
        />
        <StatCard
          label="Flagged Entries"
          value={loading ? '…' : (stats?.total_flag_amount
            ? fmtAmount(stats.total_flag_amount)
            : String(stats?.total_flagged ?? 0))}
          change={`${stats?.total_flagged ?? 0} transactions flagged`}
          changeType="down"
          stripeColor="#991B1B" iconBg="#FEE2E2"
          icon={<AlertTriangle size={17} color="#991B1B" />}
        />
      </div>

      {/* Main two-col row */}
      <div className="grid gap-4 mb-4" style={{ gridTemplateColumns: '1fr 360px' }}>

        {/* Client table */}
        <div className="rounded-xl border overflow-hidden shadow-card"
          style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          <div className="flex items-center justify-between px-5 py-3 border-b"
            style={{ borderColor: 'var(--border)' }}>
            <h2 className="text-[13px] font-bold" style={{ color: 'var(--text)' }}>
              🏢 Client Audit Status
            </h2>
            <div className="flex gap-1 p-1 rounded-lg" style={{ background: 'var(--surface2)' }}>
              {(['All', 'Pending', 'Done'] as const).map(t => (
                <button key={t} onClick={() => setTab(t)}
                  className="px-3 py-1 rounded-md text-[11px] font-semibold transition-all"
                  style={tab === t
                    ? { background: 'var(--surface)', color: 'var(--accent)' }
                    : { color: 'var(--text2)' }}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Loading */}
          {loading && (
            <div className="py-14 text-center" style={{ color: 'var(--text3)' }}>
              <RefreshCw size={18} className="animate-spin mx-auto mb-2 opacity-40" />
              <p className="text-[13px]">Loading clients…</p>
            </div>
          )}

          {/* Empty */}
          {!loading && filtered.length === 0 && (
            <div className="py-12 text-center">
              <p className="text-[14px] font-semibold mb-2" style={{ color: 'var(--text)' }}>
                Koi client nahi hai abhi
              </p>
              <Link href="/upload"
                className="text-[12px] font-semibold" style={{ color: 'var(--accent)' }}>
                ▶ Start New Audit →
              </Link>
            </div>
          )}

          {/* Table */}
          {!loading && filtered.length > 0 && (
            <table className="w-full">
              <thead>
                <tr style={{ background: 'var(--surface2)' }}>
                  {['Client', 'Turnover', 'Status', 'Progress', 'Flags', ''].map((h, i) => (
                    <th key={i} className="text-left px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider border-b"
                      style={{ color: 'var(--text3)', borderColor: 'var(--border)' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((client, i) => (
                  <tr key={client.id}
                    className="cursor-pointer hover:bg-blue-50/50 transition-colors"
                    style={{ background: i % 2 !== 0 ? 'var(--surface2)' : 'transparent' }}>

                    <td className="px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
                      <div className="text-[12px] font-semibold" style={{ color: 'var(--text)' }}>
                        {client.client_name}
                      </div>
                      <div className="text-[10px] font-mono" style={{ color: 'var(--text3)' }}>
                        {client.pan}
                      </div>
                    </td>

                    <td className="px-4 py-3 border-b text-[12px] font-medium"
                      style={{ borderColor: 'var(--border)', color: 'var(--text2)' }}>
                      {fmtTurnover(client.turnover_approx)}
                    </td>

                    <td className="px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
                      <StatusBadge status={client.audit_status} />
                    </td>

                    <td className="px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
                      <ProgressBar
                        percentage={client.audit_progress_pct}
                        color={progressColor(client.audit_progress_pct)}
                      />
                    </td>

                    <td className="px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
                      {client.flagged_count > 0
                        ? <span className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                            style={{ background: '#FEE2E2', color: '#991B1B' }}>
                            ⚠ {client.flagged_count}
                          </span>
                        : <span className="text-[11px]" style={{ color: 'var(--text3)' }}>—</span>
                      }
                    </td>

                    <td className="px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
                      <Link href={`/bank`}
                        className="flex items-center gap-1 px-3 py-1 rounded-md text-[10px] font-semibold border transition-colors hover:bg-gray-50"
                        style={{ color: 'var(--text2)', borderColor: 'var(--border)' }}>
                        Open <ArrowRight size={10} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Right panel */}
        <div className="flex flex-col gap-4">

          {/* Active client audit progress */}
          <div className="rounded-xl border overflow-hidden shadow-card"
            style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
            <div className="flex items-center justify-between px-4 py-3 border-b"
              style={{ borderColor: 'var(--border)' }}>
              <h2 className="text-[12px] font-bold" style={{ color: 'var(--text)' }}>
                📊 {active ? active.name : 'No Active Audit'}
              </h2>
              {active && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                  style={{ background: 'var(--accent-l)', color: 'var(--accent)' }}>
                  {active.progress}%
                </span>
              )}
            </div>

            {!active && !loading && (
              <div className="p-4 text-center">
                <p className="text-[12px]" style={{ color: 'var(--text3)' }}>
                  Koi active audit nahi
                </p>
              </div>
            )}

            {active && (
              <>
                <div className="p-4 flex flex-col gap-0">
                  {AUDIT_STEPS.map((step, i) => {
                    const state = i < activeStep ? 'done' : i === activeStep ? 'active' : 'pending'
                    const sub = state === 'done'
                      ? (i === 0 ? `${active.tally_count} entries synced`
                        : i === 1 ? `${active.bank_count} transactions`
                        : i === 2 ? `${active.recon_total} matched · ${active.recon_flagged} flagged`
                        : 'Completed')
                      : state === 'active'
                      ? (i === 0 ? 'Tally sync karo'
                        : i === 1 ? 'Bank statement upload karo'
                        : i === 2 ? 'Start Reconciliation chalao'
                        : 'Observations generate karo')
                      : 'Waiting…'

                    return (
                      <div key={step.label} className="flex gap-3">
                        <div className="flex flex-col items-center w-5 flex-shrink-0">
                          <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0"
                            style={{
                              background: state === 'done' ? '#DCFCE7' : state === 'active' ? '#2E5BE8' : 'var(--surface2)',
                              border: `2px solid ${state === 'done' ? '#166534' : state === 'active' ? '#2E5BE8' : 'var(--border2)'}`,
                              color: state === 'done' ? '#166534' : state === 'active' ? '#fff' : 'var(--text3)',
                            }}>
                            {state === 'done' ? '✓' : i + 1}
                          </div>
                          {i < AUDIT_STEPS.length - 1 && (
                            <div className="w-[2px] flex-1 my-1"
                              style={{ background: state === 'done' ? '#166534' : 'var(--border)' }} />
                          )}
                        </div>
                        <div className="pb-3 flex-1">
                          <div className="text-[12px] font-semibold" style={{ color: 'var(--text)' }}>
                            {step.label}
                          </div>
                          <div className="text-[10px] mt-0.5"
                            style={{ color: state === 'active' ? 'var(--accent)' : state === 'done' ? '#166534' : 'var(--text3)' }}>
                            {sub}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Quick action */}
                <div className="px-4 pb-4">
                  <Link href="/bank"
                    className="flex items-center justify-center gap-2 w-full py-2 rounded-lg text-white text-[12px] font-semibold"
                    style={{ background: 'var(--accent)' }}>
                    Continue Audit <ArrowRight size={13} />
                  </Link>
                </div>
              </>
            )}
          </div>

          {/* Portal status */}
          <div className="rounded-xl border overflow-hidden shadow-card"
            style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
            <div className="flex items-center justify-between px-4 py-3 border-b"
              style={{ borderColor: 'var(--border)' }}>
              <h2 className="text-[12px] font-bold" style={{ color: 'var(--text)' }}>🔗 Portal Connections</h2>
              <Link href="/portals" className="text-[11px] font-semibold" style={{ color: 'var(--accent)' }}>
                Manage →
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-2 p-3">
              {PORTALS.map(p => (
                <div key={p.abbr} className="flex items-center gap-2 p-2.5 rounded-lg border"
                  style={{ background: 'var(--surface2)', borderColor: 'var(--border)' }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[9px] font-extrabold flex-shrink-0"
                    style={{
                      background: p.ok ? (p.abbr === 'TLY' ? '#EEF2FD' : '#DCFCE7') : 'var(--surface2)',
                      color: p.ok ? (p.abbr === 'TLY' ? '#2E5BE8' : '#166534') : 'var(--text3)',
                    }}>
                    {p.abbr}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-semibold truncate" style={{ color: 'var(--text)' }}>{p.name}</div>
                    <div className="text-[10px]" style={{ color: p.ok ? '#166534' : 'var(--text3)' }}>{p.status}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
