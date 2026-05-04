'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import {
    RefreshCw, CheckCircle2, Upload, FolderOpen,
    FileText, Shield, Database, ChevronRight, Play
} from 'lucide-react'

import Link from 'next/link'

import clsx from 'clsx'
import api from '@/lib/api'
 
// Hardcoded client for now — baad mein URL params se aayega
const CLIENT_ID = 1
const FIRM_ID   = 1
 
interface TallyStatus { connected: boolean; message: string }
interface SyncResult  { synced_count: number; message: string }
 
type UploadStatus = 'done' | 'pending' | 'uploading' | 'error'
interface UploadItem { id: string; icon: React.ReactNode; label: string; sub: string; status: UploadStatus; iconBg: string }
 
const INITIAL_ITEMS: UploadItem[] = [
  { id: 'tally', icon: <Database size={16} color="#2E5BE8" />,  label: 'Tally XML Export',      sub: 'Sync button se auto-fetch',     status: 'pending', iconBg: '#EEF2FD' },
  { id: 'bank',  icon: <FileText  size={16} color="#9BA3BF" />, label: 'Bank Statement',         sub: 'PDF ya Excel upload karo',      status: 'pending', iconBg: '#F7F8FC' },
  { id: 'gstr',  icon: <FileText  size={16} color="#9BA3BF" />, label: 'GSTR-2B JSON',           sub: 'GST portal se download karo',   status: 'pending', iconBg: '#F7F8FC' },
  { id: 'ais',   icon: <FileText  size={16} color="#9BA3BF" />, label: 'Form 26AS / AIS',        sub: 'Traces se download karo',       status: 'pending', iconBg: '#F7F8FC' },
  { id: 'tds',   icon: <FileText  size={16} color="#9BA3BF" />, label: 'TDS Challans',           sub: 'PDF upload karo',               status: 'pending', iconBg: '#F7F8FC' },
  { id: 'esi',   icon: <Shield    size={16} color="#9BA3BF" />, label: 'ESI / PF Challans',      sub: 'PDF upload karo',               status: 'pending', iconBg: '#F7F8FC' },
]
 
function TallySyncCard({ onSyncDone }: { onSyncDone: (count: number) => void }) {
  const [status,   setStatus]   = useState<TallyStatus | null>(null)
  const [syncing,  setSyncing]  = useState(false)
  const [result,   setResult]   = useState<SyncResult | null>(null)
  const [testing,  setTesting]  = useState(false)
 
  const testConnection = async () => {
    setTesting(true)
    try {
      const res = await api.get('/tally/test-connection')
      setStatus(res.data)
    } catch {
      setStatus({ connected: false, message: 'Backend se connect nahi hua' })
    } finally { setTesting(false) }
  }
 
  const syncTally = async () => {
    setSyncing(true); setResult(null)
    try {
      const res = await api.post(`/tally/sync/${CLIENT_ID}`)
      setResult(res.data)
      onSyncDone(res.data.synced_count)
    } catch (e: any) {
      setResult({ synced_count: 0, message: e.response?.data?.detail || 'Sync failed — Tally open hai?' })
    } finally { setSyncing(false) }
  }
 
  return (
    <div className="rounded-xl border overflow-hidden shadow-card" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
      <div className="flex items-center justify-between px-5 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
        <h2 className="flex items-center gap-2 text-[13px] font-bold" style={{ color: 'var(--text)' }}>
          <RefreshCw size={14} color="#2E5BE8" /> Tally Data Sync
        </h2>
        {status && (
          <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold"
            style={{ background: status.connected ? '#DCFCE7' : '#FEE2E2', color: status.connected ? '#166534' : '#991B1B' }}>
            {status.connected ? '● Connected' : '● Not found'}
          </span>
        )}
      </div>
 
      <div className="p-5">
        {/* Result message */}
        {result && (
          <div className="mb-4 px-3 py-2.5 rounded-lg text-[12px]"
            style={{ background: result.synced_count > 0 ? '#DCFCE7' : '#FEE2E2', color: result.synced_count > 0 ? '#166534' : '#991B1B' }}>
            {result.message}
          </div>
        )}
 
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          {[
            { val: result?.synced_count || '—', label: 'Vouchers',  color: '#2E5BE8', bg: '#EEF2FD' },
            { val: '—',                          label: 'Ledgers',   color: '#7C3AED', bg: '#F3E8FF' },
            { val: '—',                          label: 'Parties',   color: '#166534', bg: '#DCFCE7' },
          ].map(s => (
            <div key={s.label} className="rounded-lg p-3 border text-center" style={{ background: s.bg, borderColor: 'var(--border)' }}>
              <div className="text-[22px] font-extrabold" style={{ color: s.color }}>{s.val}</div>
              <div className="text-[11px] mt-0.5" style={{ color: 'var(--text3)' }}>{s.label}</div>
            </div>
          ))}
        </div>
 
        {/* Tally instruction */}
        <div className="mb-4 px-3 py-2.5 rounded-lg border text-[11px]"
          style={{ background: '#EEF2FD', borderColor: 'rgba(46,91,232,0.2)', color: '#2E5BE8' }}>
          ℹ️ TallyPrime mein: F12 → Advanced Config → Enable ODBC Server → Port 9000
        </div>
 
        {/* Buttons */}
        <div className="flex gap-2">
          <button onClick={testConnection} disabled={testing}
            className="flex-1 py-2.5 rounded-lg text-[12px] font-semibold border transition-all"
            style={{ background: 'var(--surface2)', borderColor: 'var(--border2)', color: 'var(--text2)' }}>
            {testing ? '…Testing' : '🔌 Test Connection'}
          </button>
          <button onClick={syncTally} disabled={syncing}
            className="flex-1 py-2.5 rounded-lg text-white text-[12px] font-semibold transition-all disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg, #2E5BE8, #4F46E5)', boxShadow: '0 4px 14px rgba(46,91,232,0.35)' }}>
            {syncing ? <><RefreshCw size={13} className="inline animate-spin mr-1" />Syncing…</> : '🔄 Sync from Tally'}
          </button>
        </div>
      </div>
    </div>
  )
}
 
function BankUploadCard({ onUploaded }: { onUploaded: (filename: string) => void }) {
  const [uploading, setUploading] = useState(false)
  const [result,    setResult]    = useState<any>(null)
  const [error,     setError]     = useState('')
 
  const uploadFile = async (file: File) => {
    setUploading(true); setResult(null); setError('')
    const form = new FormData()
    form.append('file', file)
    try {
      const res = await api.post(`/bank/upload/${CLIENT_ID}`, form, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setResult(res.data)
      onUploaded(file.name)
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Upload failed — file format check karo')
    } finally { setUploading(false) }
  }
 
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: files => files[0] && uploadFile(files[0]),
    accept: { 'application/pdf': ['.pdf'], 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'], 'text/csv': ['.csv'] },
    maxFiles: 1,
  })
 
  return (
    <div className="rounded-xl border overflow-hidden shadow-card" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
      <div className="px-5 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
        <h2 className="text-[13px] font-bold flex items-center gap-2" style={{ color: 'var(--text)' }}>
          <Upload size={14} color="#2E5BE8" /> Bank Statement Upload
        </h2>
      </div>
      <div className="p-4">
        {result && (
          <div className="mb-3 px-3 py-2.5 rounded-lg text-[12px]" style={{ background: '#DCFCE7', color: '#166534' }}>
            ✅ {result.message} ({result.bank_name} · {result.saved} transactions)
          </div>
        )}
        {error && (
          <div className="mb-3 px-3 py-2.5 rounded-lg text-[12px]" style={{ background: '#FEE2E2', color: '#991B1B' }}>
            ❌ {error}
          </div>
        )}
        <div {...getRootProps()}
          className={clsx('border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all', uploading && 'opacity-60 pointer-events-none')}
          style={{ borderColor: isDragActive ? '#2E5BE8' : 'var(--border2)', background: isDragActive ? 'var(--accent-l)' : 'var(--surface2)' }}>
          <input {...getInputProps()} />
          {uploading
            ? <><RefreshCw size={24} className="animate-spin mx-auto mb-2 text-blue-500" /><p className="text-[13px] font-semibold" style={{ color: 'var(--text)' }}>Parsing file…</p></>
            : <><div className="text-3xl mb-2">📂</div>
               <p className="text-[13px] font-bold mb-1" style={{ color: 'var(--text)' }}>
                 {isDragActive ? 'Drop here…' : 'Drag & Drop Bank Statement'}
               </p>
               <p className="text-[11px] mb-3" style={{ color: 'var(--text3)' }}>PDF, Excel, CSV · Max 50MB</p>
               <button type="button" className="px-4 py-1.5 rounded-lg text-[12px] font-semibold text-white" style={{ background: 'var(--accent)' }}>Browse File</button>
            </>
          }
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {['HDFC','SBI','ICICI','Axis','PNB'].map(b => (
            <span key={b} className="px-2.5 py-1 rounded-full text-[10px] font-semibold border"
              style={{ background: '#DCFCE7', borderColor: 'rgba(22,101,52,0.3)', color: '#166534' }}>✓ {b}</span>
          ))}
        </div>
      </div>
    </div>
  )
}
 
export default function UploadPage() {
  const [items, setItems] = useState(INITIAL_ITEMS)
 
  const markDone = (id: string, sub: string) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, status: 'done' as const, sub, iconBg: '#DCFCE7' } : i))
  }
 
  const doneCount = items.filter(i => i.status === 'done').length
 
  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-[22px] font-extrabold tracking-tight flex items-center gap-2" style={{ color: 'var(--text)' }}>
            <FolderOpen size={22} color="#2E5BE8" /> Data Upload
          </h1>
          <p className="text-[13px] mt-1" style={{ color: 'var(--text2)' }}>Client #1 · FY 2024-25</p>
        </div>
        <Link href="/bank"
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-[13px] font-semibold"
          style={{ background: 'var(--accent)', boxShadow: '0 3px 10px rgba(46,91,232,0.3)' }}>
          <Play size={13} /> Start Audit Analysis
        </Link>
      </div>
 
      {/* Progress bar */}
      <div className="flex items-center gap-3 mb-6 px-4 py-3 rounded-xl border"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        <div className="flex-1">
          <div className="flex justify-between text-[12px] mb-1.5">
            <span style={{ color: 'var(--text2)' }}>Upload progress</span>
            <span className="font-semibold" style={{ color: 'var(--text)' }}>{doneCount} / {items.length}</span>
          </div>
          <div className="h-1.5 rounded-full" style={{ background: 'var(--border)' }}>
            <div className="h-full rounded-full transition-all duration-500"
              style={{ width: `${(doneCount / items.length) * 100}%`, background: 'var(--accent)' }} />
          </div>
        </div>
      </div>
 
      <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <div className="flex flex-col gap-4">
          {/* Tally sync */}
          <TallySyncCard onSyncDone={count => markDone('tally', `✓ ${count} vouchers synced`)} />
 
          {/* Upload checklist */}
          <div className="rounded-xl border overflow-hidden shadow-card" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
            <div className="px-5 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
              <h2 className="text-[13px] font-bold" style={{ color: 'var(--text)' }}>📂 Document Status</h2>
            </div>
            <div className="p-3 flex flex-col gap-2">
              {items.map(item => (
                <div key={item.id}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl border transition-all"
                  style={{ background: item.status === 'done' ? 'rgba(220,252,231,0.3)' : 'var(--surface2)', borderColor: item.status === 'done' ? 'rgba(22,101,52,0.25)' : 'var(--border)' }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: item.iconBg }}>
                    {item.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] font-semibold" style={{ color: 'var(--text)' }}>{item.label}</div>
                    <div className="text-[11px] mt-0.5" style={{ color: item.status === 'done' ? '#166534' : 'var(--text3)' }}>{item.sub}</div>
                  </div>
                  {item.status === 'done'
                    ? <CheckCircle2 size={18} color="#166534" />
                    : <span className="text-[10px] px-2 py-0.5 rounded-full border" style={{ color: 'var(--text3)', borderColor: 'var(--border2)' }}>Pending</span>
                  }
                </div>
              ))}
            </div>
          </div>
        </div>
 
        <div className="flex flex-col gap-4">
          <BankUploadCard onUploaded={filename => markDone('bank', `✓ ${filename} parsed`)} />
        </div>
      </div>
    </div>
  )
}