'use client'

import { useState, useEffect } from 'react'
import { Search, Plus, X, Building2 } from 'lucide-react'
import Link from 'next/link'
import StatusBadge, { Status } from '@/app/components/StatusBadge'
import ProgressBar from '@/app/components/ProgressBar'
import api from '@/lib/api'
 
interface Client {
  id: number
  client_name: string
  pan: string
  gstin: string
  business_type: string
  city: string
  financial_year: string
  turnover_approx: number
  audit_status: string
  audit_progress_pct: number
}
 
const STATUS_MAP: Record<string, any> = {
  completed:    { status: 'completed',   color: '#166534' },
  bank_recon:   { status: 'in_progress', color: '#2E5BE8' },
  gst_recon:    { status: 'gst_recon',   color: '#2E5BE8' },
  ai_analysis:  { status: 'analysing',   color: '#2E5BE8' },
  data_uploaded:{ status: 'in_progress', color: '#2E5BE8' },
  pending:      { status: 'pending',     color: '#D97706' },
  error:        { status: 'error',       color: '#991B1B' },
}
 
function AddClientModal({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const [form, setForm] = useState({
    client_name: '', pan: '', gstin: '',
    business_type: 'Pvt Ltd', financial_year: 'FY 2024-25',
    turnover_approx: '', city: '', state: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
 
  const update = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))
 
  const submit = async () => {
    if (!form.client_name || !form.pan) { setError('Client name aur PAN required hai'); return }
    if (form.pan.length !== 10)          { setError('PAN 10 characters ka hona chahiye'); return }
    setLoading(true); setError('')
    try {
      await api.post('/clients/?firm_id=1', {
        ...form,
        financial_year:  form.financial_year.replace('FY ', ''),
        turnover_approx: form.turnover_approx ? parseFloat(form.turnover_approx) : null,
      })
      onAdded(); onClose()
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Error — dobara try karo')
    } finally { setLoading(false) }
  }
 
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}>
      <div className="w-[520px] rounded-2xl border shadow-2xl overflow-hidden"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
 
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <h2 className="text-[16px] font-bold" style={{ color: 'var(--text)' }}>➕ Add New Client</h2>
          <button onClick={onClose}><X size={20} className="text-gray-400" /></button>
        </div>
 
        <div className="px-6 py-5 flex flex-col gap-4">
          {error && <div className="px-3 py-2 rounded-lg text-[12px]" style={{ background: '#FEE2E2', color: '#991B1B' }}>{error}</div>}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[12px] font-semibold mb-1.5" style={{ color: 'var(--text2)' }}>Client Name *</label>
              <input value={form.client_name} onChange={e => update('client_name', e.target.value)} placeholder="M/s ABC Traders"
                className="w-full px-3 py-2 rounded-lg border text-[13px] outline-none"
                style={{ borderColor: 'var(--border2)', background: 'var(--surface2)', color: 'var(--text)' }} />
            </div>
            <div>
              <label className="block text-[12px] font-semibold mb-1.5" style={{ color: 'var(--text2)' }}>Business Type</label>
              <select value={form.business_type} onChange={e => update('business_type', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border text-[13px] outline-none"
                style={{ borderColor: 'var(--border2)', background: 'var(--surface2)', color: 'var(--text)' }}>
                {['Pvt Ltd','Partnership','Proprietorship','LLP','Trust'].map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[12px] font-semibold mb-1.5" style={{ color: 'var(--text2)' }}>PAN *</label>
              <input value={form.pan} onChange={e => update('pan', e.target.value.toUpperCase())} placeholder="AAAAA1234A" maxLength={10}
                className="w-full px-3 py-2 rounded-lg border text-[13px] outline-none font-mono uppercase"
                style={{ borderColor: 'var(--border2)', background: 'var(--surface2)', color: 'var(--text)' }} />
            </div>
            <div>
              <label className="block text-[12px] font-semibold mb-1.5" style={{ color: 'var(--text2)' }}>GSTIN</label>
              <input value={form.gstin} onChange={e => update('gstin', e.target.value.toUpperCase())} placeholder="27AAAAA1234A1Z5" maxLength={15}
                className="w-full px-3 py-2 rounded-lg border text-[13px] outline-none font-mono uppercase"
                style={{ borderColor: 'var(--border2)', background: 'var(--surface2)', color: 'var(--text)' }} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[12px] font-semibold mb-1.5" style={{ color: 'var(--text2)' }}>Financial Year</label>
              <select value={form.financial_year} onChange={e => update('financial_year', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border text-[13px] outline-none"
                style={{ borderColor: 'var(--border2)', background: 'var(--surface2)', color: 'var(--text)' }}>
                {['FY 2024-25','FY 2023-24','FY 2022-23'].map(y => <option key={y}>{y}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[12px] font-semibold mb-1.5" style={{ color: 'var(--text2)' }}>City</label>
              <input value={form.city} onChange={e => update('city', e.target.value)} placeholder="Udaipur"
                className="w-full px-3 py-2 rounded-lg border text-[13px] outline-none"
                style={{ borderColor: 'var(--border2)', background: 'var(--surface2)', color: 'var(--text)' }} />
            </div>
          </div>
        </div>
 
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t" style={{ borderColor: 'var(--border)' }}>
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-[13px] font-semibold border"
            style={{ borderColor: 'var(--border2)', color: 'var(--text2)' }}>Cancel</button>
          <button onClick={submit} disabled={loading}
            className="px-5 py-2 rounded-lg text-white text-[13px] font-semibold disabled:opacity-60"
            style={{ background: 'var(--accent)' }}>
            {loading ? 'Saving…' : 'Add Client'}
          </button>
        </div>
      </div>
    </div>
  )
}
 
export default function ClientsPage() {
  const [clients, setClients]     = useState<Client[]>([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [showModal, setShowModal] = useState(false)
  const [deleting, setDeleting]   = useState<number | null>(null)
 
  const fetchClients = async () => {
    setLoading(true)
    try {
      const res = await api.get('/clients/?firm_id=1')
      setClients(res.data.data || [])
    } catch { setClients([]) }
    finally { setLoading(false) }
  }
 
  useEffect(() => { fetchClients() }, [])
 
  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`"${name}" delete karo?`)) return
    setDeleting(id)
    try {
      await api.delete(`/clients/${id}`)
      setClients(p => p.filter(c => c.id !== id))
    } catch { alert('Delete nahi hua') }
    finally { setDeleting(null) }
  }
 
  const filtered = clients.filter(c =>
    c.client_name.toLowerCase().includes(search.toLowerCase()) ||
    c.pan.toLowerCase().includes(search.toLowerCase())
  )
 
  return (
    <div>
      {showModal && <AddClientModal onClose={() => setShowModal(false)} onAdded={fetchClients} />}
 
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-[22px] font-extrabold tracking-tight" style={{ color: 'var(--text)' }}>👥 All Clients</h1>
          <p className="text-[13px] mt-1" style={{ color: 'var(--text2)' }}>{clients.length} clients · AY 2025-26</p>
        </div>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-[13px] font-semibold"
          style={{ background: 'var(--accent)', boxShadow: '0 3px 10px rgba(46,91,232,0.3)' }}>
          <Plus size={15} /> Add New Client
        </button>
      </div>
 
      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Total',           val: clients.length,                                               color: '#2E5BE8', bg: '#EEF2FD' },
          { label: 'Completed',       val: clients.filter(c => c.audit_status === 'completed').length,   color: '#166534', bg: '#DCFCE7' },
          { label: 'In Progress',     val: clients.filter(c => !['completed','pending','error'].includes(c.audit_status)).length, color: '#D97706', bg: '#FEF3C7' },
          { label: 'Pending / Error', val: clients.filter(c => ['pending','error'].includes(c.audit_status)).length, color: '#991B1B', bg: '#FEE2E2' },
        ].map(s => (
          <div key={s.label} className="rounded-xl border px-4 py-3 flex items-center gap-3"
            style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
            <div className="w-9 h-9 rounded-lg flex items-center justify-center text-[18px] font-extrabold"
              style={{ background: s.bg, color: s.color }}>{s.val}</div>
            <span className="text-[13px] font-medium" style={{ color: 'var(--text2)' }}>{s.label}</span>
          </div>
        ))}
      </div>
 
      {/* Table */}
      <div className="rounded-xl border overflow-hidden shadow-card" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-3 px-5 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2 flex-1 max-w-xs h-9 px-3 rounded-lg border"
            style={{ background: 'var(--surface2)', borderColor: 'var(--border)' }}>
            <Search size={13} style={{ color: 'var(--text3)' }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or PAN…"
              className="bg-transparent border-none outline-none text-[12px] w-full" style={{ color: 'var(--text)' }} />
          </div>
          <button onClick={fetchClients}
            className="ml-auto text-[11px] font-semibold px-3 py-1.5 rounded-lg border"
            style={{ color: 'var(--text2)', borderColor: 'var(--border)', background: 'var(--surface2)' }}>
            ↻ Refresh
          </button>
        </div>
 
        <div className="grid border-b px-5 py-2.5"
          style={{ gridTemplateColumns: '2fr 110px 150px 90px 110px 80px 110px', background: 'var(--surface2)', borderColor: 'var(--border)' }}>
          {['Client Name','PAN','GSTIN','Turnover','Status','Progress',''].map(h => (
            <span key={h} className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text3)' }}>{h}</span>
          ))}
        </div>
 
        {loading && <div className="py-14 text-center text-[13px]" style={{ color: 'var(--text3)' }}>Loading…</div>}
 
        {!loading && filtered.length === 0 && (
          <div className="py-14 text-center">
            <div className="text-4xl mb-3 opacity-30">👥</div>
            <p className="text-[14px] font-semibold mb-3" style={{ color: 'var(--text2)' }}>
              {clients.length === 0 ? 'Koi client nahi — pehla add karo!' : 'Koi nahi mila'}
            </p>
            {clients.length === 0 && (
              <button onClick={() => setShowModal(true)}
                className="px-4 py-2 rounded-lg text-white text-[12px] font-semibold"
                style={{ background: 'var(--accent)' }}>+ Add First Client</button>
            )}
          </div>
        )}
 
        {!loading && filtered.map((c, i) => {
          const si = STATUS_MAP[c.audit_status] || STATUS_MAP['pending']
          return (
            <div key={c.id}
              className="grid items-center px-5 py-3.5 border-b transition-colors hover:bg-blue-50/40"
              style={{ gridTemplateColumns: '2fr 110px 150px 90px 110px 80px 110px', borderColor: 'var(--border)', background: i % 2 !== 0 ? 'var(--surface2)' : '' }}>
              <div>
                <div className="text-[13px] font-semibold" style={{ color: 'var(--text)' }}>{c.client_name}</div>
                <div className="text-[10px] mt-0.5" style={{ color: 'var(--text3)' }}>{c.business_type}{c.city ? ` · ${c.city}` : ''}</div>
              </div>
              <div className="font-mono text-[11px]" style={{ color: 'var(--text2)' }}>{c.pan}</div>
              <div className="font-mono text-[10px] truncate" style={{ color: 'var(--text3)' }}>{c.gstin || '—'}</div>
              <div className="text-[12px]" style={{ color: 'var(--text2)' }}>
                {c.turnover_approx ? `₹${(c.turnover_approx/100000).toFixed(1)}L` : '—'}
              </div>
              <div><StatusBadge status={si.status} /></div>
              <div><ProgressBar percentage={c.audit_progress_pct} color={si.color} width={60} /></div>
              <div className="flex items-center gap-1.5">
                <Link href="/upload"
                  className="px-2.5 py-1 rounded-md text-[10px] font-semibold border hover:bg-gray-50"
                  style={{ color: 'var(--text2)', borderColor: 'var(--border)' }}>Open →</Link>
                <button onClick={() => handleDelete(c.id, c.client_name)} disabled={deleting === c.id}
                  className="px-2.5 py-1 rounded-md text-[10px] font-semibold border hover:bg-red-50 disabled:opacity-50"
                  style={{ color: '#991B1B', borderColor: 'rgba(153,27,27,0.3)', background: '#FEE2E2' }}>
                  {deleting === c.id ? '…' : 'Del'}
                </button>
              </div>
            </div>
          )
        })}
 
        {!loading && filtered.length > 0 && (
          <div className="px-5 py-3 flex items-center justify-between"
            style={{ background: 'var(--surface2)', borderTop: '1px solid var(--border)' }}>
            <p className="text-[12px]" style={{ color: 'var(--text3)' }}>{filtered.length} of {clients.length} clients</p>
            <button onClick={() => setShowModal(true)} className="flex items-center gap-1.5 text-[12px] font-semibold" style={{ color: 'var(--accent)' }}>
              <Plus size={13} /> Add client
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
