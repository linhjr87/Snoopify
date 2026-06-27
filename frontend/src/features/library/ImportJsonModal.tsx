'use client'
import { useState, type ChangeEvent, type CSSProperties } from 'react'
import { useRouter } from 'next/navigation'
import { useAppStore } from '../../store/useAppStore'
import { useT } from '../../i18n/useT'
import { sampleJson } from '../../data/seed'
import type { ImportStatus } from '../../store/types'
import type { ImportResult } from '../../lib/api-types'

export function ImportJsonModal() {
  const t = useT()
  const importOpen = useAppStore((s) => s.importOpen)
  const importText = useAppStore((s) => s.importText)
  const setPanel = useAppStore((s) => s.setPanel)
  const setImportText = useAppStore((s) => s.setImportText)
  const router = useRouter()
  const [status, setStatus] = useState<ImportStatus | null>(null)
  const [isPending, setIsPending] = useState(false)

  const onFile = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return
    const r = new FileReader()
    r.onload = () => setImportText(String(r.result || ''))
    r.onerror = () => setStatus({ ok: false, msg: t.importInvalidJson })
    r.readAsText(f)
  }

  const copySample = async () => {
    try {
      await navigator.clipboard.writeText(sampleJson)
    } catch {
      return
    }
  }

  if (!importOpen) return null

  const submitImport = async () => {
    let payload: unknown
    try { payload = JSON.parse(importText) } catch { setStatus({ ok: false, msg: t.importInvalidJson }); return }
    // /decks/import returns {ok,msg,deck?} for BOTH 200 and 400 — read body on any status.
    setIsPending(true)
    try {
      const res = await fetch('/api/decks/import', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      })
      const result = (await res.json()) as ImportResult
      setStatus({ ok: result.ok, msg: result.msg })
      if (result.ok) { setImportText(''); setPanel('importOpen', false); router.refresh() }
    } catch {
      setStatus({ ok: false, msg: t.importConnError })
    } finally {
      setIsPending(false)
    }
  }

  const statusStyle: CSSProperties = {
    fontSize: '13px', fontWeight: 600,
    color: status && status.ok ? '#2f6b43' : 'var(--rust)',
  }

  return (
    <div
      onClick={() => setPanel('importOpen', false)}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(33,29,27,0.42)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px', zIndex: 80,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '560px', maxWidth: '100%', maxHeight: '86vh', overflow: 'auto',
          background: 'var(--surface)', border: '1px solid var(--line)',
          borderRadius: '18px', boxShadow: '0 30px 60px -20px rgba(40,35,25,0.5)',
          padding: '26px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
          <h2 style={{ margin: 0, fontFamily: "'Newsreader',serif", fontWeight: 500, fontSize: '22px' }}>
            {t.importTitle}
          </h2>
          <button
            onClick={() => setPanel('importOpen', false)}
            style={{ border: 'none', background: 'transparent', fontSize: '20px', color: 'var(--muted)', cursor: 'pointer', lineHeight: 1 }}
          >✕</button>
        </div>
        <p style={{ margin: '0 0 14px', color: 'var(--muted)', fontSize: '14px', lineHeight: 1.5 }}>
          {t.importInstructionsPre} <span style={{ fontFamily: 'monospace' }}>.json</span> {t.importInstructionsPost}
        </p>
        <div style={{ fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '8px' }}>
          {t.sampleStructure}
        </div>
        <pre style={{
          margin: '0 0 10px', background: 'var(--paper)', border: '1px solid var(--line)',
          borderRadius: '12px', padding: '14px', fontFamily: 'monospace', fontSize: '12.5px',
          lineHeight: 1.55, color: 'var(--ink)', overflow: 'auto', whiteSpace: 'pre',
        }}>{sampleJson}</pre>
        <button
          onClick={copySample}
          style={{
            border: '1px solid var(--line)', borderRadius: '9px', background: 'var(--surface)',
            color: 'var(--muted)', padding: '7px 13px', fontFamily: "'Hanken Grotesk',sans-serif",
            fontSize: '13px', cursor: 'pointer', marginBottom: '18px',
          }}
        >{t.copySample}</button>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '14px' }}>
          <label style={{
            border: '1px solid var(--accent)', color: '#fff', background: 'var(--accent)',
            borderRadius: '10px', padding: '10px 18px', fontWeight: 600, fontSize: '14px', cursor: 'pointer',
          }}>
            {t.chooseJsonFile}
            <input type="file" accept="application/json,.json" onChange={onFile} style={{ display: 'none' }} />
          </label>
          <span style={{ fontSize: '13px', color: 'var(--muted)' }}>{t.orPasteBelow}</span>
        </div>
        <textarea
          aria-label="json"
          rows={5}
          placeholder={'{ "deck": "...", "cards": [ ... ] }'}
          value={importText}
          onChange={(e) => setImportText(e.target.value)}
          style={{
            width: '100%', border: '1px solid var(--line)', borderRadius: '10px',
            background: 'var(--paper)', padding: '10px 12px', fontFamily: 'monospace',
            fontSize: '12.5px', marginBottom: '12px', color: 'var(--ink)',
            resize: 'vertical', outline: 'none', boxSizing: 'border-box',
          }}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <button
            onClick={submitImport}
            disabled={isPending}
            style={{
              border: 'none', borderRadius: '10px', background: 'var(--ink)',
              color: '#fff', padding: '10px 22px', fontFamily: "'Hanken Grotesk',sans-serif",
              fontWeight: 600, fontSize: '14px', cursor: isPending ? 'default' : 'pointer',
              opacity: isPending ? 0.7 : 1,
            }}
          >{t.importCta}</button>
          {status && <span style={statusStyle}>{status.msg}</span>}
        </div>
      </div>
    </div>
  )
}
