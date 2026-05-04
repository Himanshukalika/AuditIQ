'use client'

import { useState } from 'react'
import { Link2, CheckCircle2, AlertTriangle, RefreshCw, Eye, EyeOff } from 'lucide-react'

interface PortalConfig {
  id: string
  name: string
  abbr: string
  icon: string
  connected: boolean
  method: string
  methodColor: string
  methodBg: string
  fields: { key: string; label: string; placeholder: string; type?: string }[]
  note?: string
  noteColor?: string
  noteBg?: string
  noteBorder?: string
}

const PORTALS: PortalConfig[] = [
  {
    id: 'gst',
    name: 'GST Portal',
    abbr: 'GST',
    icon: '🧾',
    connected: true,
    method: 'Via GSTHero ASP',
    methodColor: '#166534',
    methodBg: '#DCFCE7',
    fields: [
      { key: 'gstin',    label: 'GSTIN',       placeholder: '27AAAAA1234A1Z5' },
      { key: 'asp',      label: 'ASP Partner', placeholder: 'GSTHero (Perennial Systems)' },
      { key: 'mode',     label: 'Access Mode', placeholder: 'Official API — 100% Legal' },
    ],
    note: '✅ Connected via GSTHero ASP partnership — 100% legal, no CAPTCHA, official GSTN API pipeline.',
    noteColor: '#166534', noteBg: '#DCFCE7', noteBorder: 'rgba(22,101,52,0.3)',
  },
  {
    id: 'traces',
    name: 'Traces Portal',
    abbr: 'TRC',
    icon: '📋',
    connected: true,
    method: 'Manual Upload',
    methodColor: '#92400E',
    methodBg: '#FEF3C7',
    fields: [
      { key: 'tan',     label: 'TAN Number',     placeholder: 'DELJ12345A' },
      { key: 'deductor',label: 'Deductor Name',  placeholder: 'As per Traces registration' },
    ],
    note: '⚠️ Phase 1: Download Form 26AS manually from Traces and upload here. Phase 2 mein auto-fetch add hoga.',
    noteColor: '#92400E', noteBg: '#FEF3C7', noteBorder: 'rgba(180,83,9,0.25)',
  },
  {
    id: 'itportal',
    name: 'Income Tax Portal',
    abbr: 'ITD',
    icon: '🏛️',
    connected: false,
    method: 'Manual Upload',
    methodColor: '#9BA3BF',
    methodBg: '#F7F8FC',
    fields: [
      { key: 'pan',      label: 'PAN (Client)',    placeholder: 'AAABJ5678G' },
    ],
    note: '⚠️ IT Portal ka official API abhi public nahi hai. AIS JSON manually download karke upload karo. Government dheere dheere API open kar rahi hai.',
    noteColor: '#92400E', noteBg: '#FEF3C7', noteBorder: 'rgba(180,83,9,0.25)',
  },
  {
    id: 'tally',
    name: 'Tally ODBC',
    abbr: 'TLY',
    icon: '📊',
    connected: true,
    method: 'Live ODBC',
    methodColor: '#2E5BE8',
    methodBg: '#EEF2FD',
    fields: [
      { key: 'url',     label: 'Connection URL', placeholder: 'http://localhost:9000' },
      { key: 'company', label: 'Company',         placeholder: 'M/s Joshi & Sons Traders' },
      { key: 'version', label: 'Tally Version',   placeholder: 'TallyPrime 4.1' },
    ],
    note: '✅ Tally same machine pe chal raha hai — direct localhost:9000 connection. No credentials needed.',
    noteColor: '#166534', noteBg: '#DCFCE7', noteBorder: 'rgba(22,101,52,0.3)',
  },
]

function PortalCard({ portal }: { portal: PortalConfig }) {
  const [showPwd, setShowPwd] = useState(false)
  const [testing, setTesting] = useState(false)
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(portal.fields.map(f => [f.key, '']))
  )

  const handleTest = () => {
    setTesting(true)
    setTimeout(() => setTesting(false), 1500)
  }

  return (
    <div className="rounded-xl border overflow-hidden shadow-card"
      style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>

      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b"
        style={{ borderColor: 'var(--border)' }}>
        <div className="text-2xl">{portal.icon}</div>
        <div className="flex-1">
          <h2 className="text-[14px] font-bold" style={{ color: 'var(--text)' }}>{portal.name}</h2>
        </div>
        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold"
          style={{ background: portal.methodBg, color: portal.methodColor }}>
          {portal.method}
        </span>
        {portal.connected ? (
          <span className="flex items-center gap-1 text-[11px] font-semibold"
            style={{ color: '#166534' }}>
            <CheckCircle2 size={14} /> Connected
          </span>
        ) : (
          <span className="flex items-center gap-1 text-[11px] font-semibold"
            style={{ color: '#9BA3BF' }}>
            <AlertTriangle size={14} /> Not linked
          </span>
        )}
      </div>

      {/* Fields */}
      <div className="px-5 py-4 flex flex-col gap-3">
        {portal.fields.map(f => (
          <div key={f.key}>
            <label className="block text-[11px] font-semibold mb-1"
              style={{ color: 'var(--text2)' }}>
              {f.label}
            </label>
            <div className="relative">
              <input
                type={f.type === 'password' && !showPwd ? 'password' : 'text'}
                value={values[f.key]}
                onChange={e => setValues(p => ({ ...p, [f.key]: e.target.value }))}
                placeholder={f.placeholder}
                className="w-full px-3 py-2 rounded-lg border text-[12px] outline-none transition-all"
                style={{ borderColor: 'var(--border2)', background: 'var(--surface2)', color: 'var(--text)' }}
              />
              {f.type === 'password' && (
                <button
                  onClick={() => setShowPwd(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: 'var(--text3)' }}>
                  {showPwd ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              )}
            </div>
          </div>
        ))}

        {/* Note */}
        {portal.note && (
          <div className="mt-1 px-3 py-2.5 rounded-lg border text-[12px] leading-relaxed"
            style={{
              background: portal.noteBg,
              borderColor: portal.noteBorder,
              color: portal.noteColor,
            }}>
            {portal.note}
          </div>
        )}

        {/* Action button */}
        <button
          onClick={handleTest}
          disabled={testing}
          className="mt-1 w-full py-2 rounded-lg text-[12px] font-semibold border flex items-center justify-center gap-2 transition-all"
          style={portal.connected
            ? { background: '#DCFCE7', borderColor: 'rgba(22,101,52,0.3)', color: '#166534' }
            : { background: 'var(--accent-l)', borderColor: 'rgba(46,91,232,0.3)', color: 'var(--accent)' }}>
          {testing
            ? <><RefreshCw size={13} className="animate-spin" /> Testing…</>
            : portal.connected
              ? <><CheckCircle2 size={13} /> Test Connection</>
              : 'Link Portal'
          }
        </button>
      </div>
    </div>
  )
}

export default function PortalsPage() {
  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-[22px] font-extrabold tracking-tight flex items-center gap-2"
            style={{ color: 'var(--text)' }}>
            <Link2 size={22} color="#2E5BE8" />
            Portal Connections
          </h1>
          <p className="text-[13px] mt-1" style={{ color: 'var(--text2)' }}>
            Manage portal credentials — stored encrypted on your machine only
          </p>
        </div>
      </div>

      {/* Security note */}
      <div className="flex items-start gap-3 px-4 py-3 rounded-xl border mb-6"
        style={{ background: '#EEF2FD', borderColor: 'rgba(46,91,232,0.2)' }}>
        <span className="text-lg mt-0.5">🔒</span>
        <div>
          <p className="text-[13px] font-semibold" style={{ color: '#1F3A8C' }}>
            Credentials stored securely — AES-256 encrypted on your local machine
          </p>
          <p className="text-[12px] mt-0.5" style={{ color: '#2E5BE8' }}>
            Koi bhi credential cloud pe save nahi hota. Sirf aapki machine pe encrypted form mein store hota hai.
          </p>
        </div>
      </div>

      {/* Portal grid */}
      <div className="grid grid-cols-2 gap-4">
        {PORTALS.map(p => (
          <PortalCard key={p.id} portal={p} />
        ))}
      </div>
    </div>
  )
}