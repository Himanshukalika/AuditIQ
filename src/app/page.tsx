import Link from 'next/link'
import {
  Users, CheckCircle2, Clock, AlertTriangle,
} from 'lucide-react'
import StatCard from '@/app/components/StatCard'
import StatusBadge from '@/app/components/StatusBadge'
import ProgressBar from '@/app/components/ProgressBar'

const CLIENTS = [
  { id: '1', name: 'Mehta Textiles Pvt Ltd',    pan: 'AAACM1234F', turnover: '₹4.2 Cr', status: 'completed'  as const, progress: 100, progressColor: '#166534', due: '28 Sep', dueColor: 'var(--text3)' },
  { id: '2', name: 'Joshi & Sons Traders',       pan: 'AAABJ5678G', turnover: '₹1.8 Cr', status: 'analysing'  as const, progress: 68,  progressColor: '#2E5BE8', due: '5 Oct',  dueColor: '#B45309' },
  { id: '3', name: 'Patel Engineering Works',    pan: 'AAACP9012H', turnover: '₹2.6 Cr', status: 'gst_recon'  as const, progress: 45,  progressColor: '#2E5BE8', due: '8 Oct',  dueColor: '#B45309' },
  { id: '4', name: 'Gupta Pharma Distributors',  pan: 'AAACG3456I', turnover: '₹3.1 Cr', status: 'pending'    as const, progress: 20,  progressColor: '#D97706', due: '12 Oct', dueColor: '#991B1B' },
  { id: '5', name: 'Sharma Construction',        pan: 'AAACS7890J', turnover: '₹5.7 Cr', status: 'completed'  as const, progress: 100, progressColor: '#166534', due: '22 Sep', dueColor: 'var(--text3)' },
  { id: '6', name: 'Verma Auto Parts Pvt Ltd',   pan: 'AAACV2345K', turnover: '₹1.2 Cr', status: 'error'      as const, progress: 30,  progressColor: '#991B1B', due: '15 Oct', dueColor: '#991B1B' },
]

const AUDIT_STEPS = [
  { label: 'Data Upload',          sub: 'Tally synced · 2,847 vouchers · 3 banks', state: 'done' },
  { label: 'Bank Reconciliation',  sub: '2,610 matched · 42 flagged · 3 unmatched', state: 'done' },
  { label: 'GST Reconciliation',   sub: 'Running… GSTR-2B matching in progress',    state: 'active' },
  { label: 'AI Disallowance Scan', sub: 'Waiting for GST module',                   state: 'pending' },
  { label: 'Generate Report',      sub: 'PDF + Excel output',                        state: 'pending' },
]

const PORTALS = [
  { abbr: 'GST', name: 'GST Portal',   status: 'Connected · ASP via GSTHero', ok: true },
  { abbr: 'TRC', name: 'Traces Portal', status: 'Connected',                   ok: true },
  { abbr: 'ITD', name: 'IT Portal',     status: 'Not linked',                  ok: false },
  { abbr: 'TLY', name: 'Tally ODBC',   status: 'Live · localhost:9000',        ok: true },
]

export default function DashboardPage() {
  return (
    <div>
      {/* Page header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-[22px] font-extrabold tracking-tight" style={{ color: 'var(--text)' }}>
            Good morning, CA Rajesh 👋
          </h1>
          <p className="text-[13px] mt-1" style={{ color: 'var(--text2)' }}>
            AY 2025-26 · Tax Audit Season · Due: 31 Oct 2025
          </p>
        </div>
        <Link href="/upload"
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-[13px] font-semibold"
          style={{ background: 'var(--accent)', boxShadow: '0 3px 10px rgba(46,91,232,0.3)' }}>
          ▶ Start New Audit
        </Link>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-4 mb-5">
        <StatCard
          label="Total Clients" value="24"
          change="↑ 4 from last year" changeType="up"
          stripeColor="#2E5BE8" iconBg="#EEF2FD"
          icon={<Users size={17} color="#2E5BE8" />}
        />
        <StatCard
          label="Audits Completed" value="11"
          change="↑ 46% completion rate" changeType="up"
          stripeColor="#166534" iconBg="#DCFCE7"
          icon={<CheckCircle2 size={17} color="#166534" />}
        />
        <StatCard
          label="In Progress" value="8"
          change="⚠ Due in 32 days" changeType="warn"
          stripeColor="#D97706" iconBg="#FEF3C7"
          icon={<Clock size={17} color="#D97706" />}
        />
        <StatCard
          label="Disallowances Found" value="₹14.2L"
          change="Sec 40A(3), 43B, 36(va)" changeType="down"
          stripeColor="#991B1B" iconBg="#FEE2E2"
          icon={<AlertTriangle size={17} color="#991B1B" />}
        />
      </div>

      {/* Main two-col row */}
      <div className="grid gap-4 mb-4" style={{ gridTemplateColumns: '1fr 360px' }}>

        {/* Client table */}
        <div className="rounded-xl border overflow-hidden shadow-card" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          <div className="flex items-center justify-between px-5 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
            <h2 className="text-[13px] font-bold" style={{ color: 'var(--text)' }}>
              🏢 Client Audit Status
            </h2>
            <div className="flex gap-1 p-1 rounded-lg" style={{ background: 'var(--surface2)' }}>
              {['All', 'Pending', 'Done'].map((t, i) => (
                <button key={t}
                  className="px-3 py-1 rounded-md text-[11px] font-semibold transition-all"
                  style={i === 0 ? { background: 'var(--surface)', color: 'var(--accent)' } : { color: 'var(--text2)' }}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          <table className="w-full">
            <thead>
              <tr style={{ background: 'var(--surface2)' }}>
                {['Client', 'Turnover', 'Status', 'Progress', 'Due', ''].map(h => (
                  <th key={h} className="text-left px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider border-b"
                    style={{ color: 'var(--text3)', borderColor: 'var(--border)' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {CLIENTS.map((client, i) => (
                <tr key={client.id}
                  className="cursor-pointer hover:bg-blue-50/50 transition-colors"
                  style={{ background: i % 2 !== 0 ? 'var(--surface2)' : 'transparent' }}>
                  <td className="px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
                    <div className="text-[12px] font-semibold" style={{ color: 'var(--text)' }}>{client.name}</div>
                    <div className="text-[10px] font-mono" style={{ color: 'var(--text3)' }}>{client.pan}</div>
                  </td>
                  <td className="px-4 py-3 border-b text-[12px] font-medium" style={{ borderColor: 'var(--border)', color: 'var(--text2)' }}>
                    {client.turnover}
                  </td>
                  <td className="px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
                    <StatusBadge status={client.status} />
                  </td>
                  <td className="px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
                    <ProgressBar percentage={client.progress} color={client.progressColor} />
                  </td>
                  <td className="px-4 py-3 border-b text-[11px] font-medium" style={{ borderColor: 'var(--border)', color: client.dueColor }}>
                    {client.due}
                  </td>
                  <td className="px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
                    <Link href={`/clients/${client.id}`}
                      className="px-3 py-1 rounded-md text-[10px] font-semibold border transition-colors hover:bg-gray-50"
                      style={{ color: 'var(--text2)', borderColor: 'var(--border)' }}>
                      Open →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Right panel */}
        <div className="flex flex-col gap-4">

          {/* Audit progress */}
          <div className="rounded-xl border overflow-hidden shadow-card" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
            <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
              <h2 className="text-[12px] font-bold" style={{ color: 'var(--text)' }}>
                📊 Joshi & Sons — Progress
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                style={{ background: 'var(--accent-l)', color: 'var(--accent)' }}>
                68%
              </span>
            </div>
            <div className="p-4 flex flex-col gap-0">
              {AUDIT_STEPS.map((step, i) => (
                <div key={step.label} className="flex gap-3">
                  <div className="flex flex-col items-center w-5 flex-shrink-0">
                    <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0"
                      style={{
                        background: step.state === 'done' ? '#DCFCE7' : step.state === 'active' ? '#2E5BE8' : 'var(--surface2)',
                        border: `2px solid ${step.state === 'done' ? '#166534' : step.state === 'active' ? '#2E5BE8' : 'var(--border2)'}`,
                        color: step.state === 'done' ? '#166534' : step.state === 'active' ? '#fff' : 'var(--text3)',
                      }}>
                      {step.state === 'done' ? '✓' : i + 1}
                    </div>
                    {i < AUDIT_STEPS.length - 1 && (
                      <div className="w-[2px] flex-1 my-1"
                        style={{ background: step.state === 'done' ? '#166534' : 'var(--border)' }} />
                    )}
                  </div>
                  <div className="pb-3 flex-1">
                    <div className="text-[12px] font-semibold" style={{ color: 'var(--text)' }}>{step.label}</div>
                    <div className="text-[10px] mt-0.5"
                      style={{ color: step.state === 'active' ? 'var(--accent)' : step.state === 'done' ? '#166534' : 'var(--text3)' }}>
                      {step.sub}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Portal status */}
          <div className="rounded-xl border overflow-hidden shadow-card" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
            <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
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
