'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CardPreview, type PreviewData } from './CardPreview'
import { apiPost } from '../../lib/api'
import type { CardCreate, CardOut, DeckOut } from '../../lib/api-types'

const TYPES = ['Từ vựng', 'Cụm từ', 'Ngữ pháp', 'Câu mẫu', 'Ghi chú', 'Lỗi']

const empty: PreviewData = { word: '', phonetic: '', pos: '', meaning: '', example: '', deck: '', tags: '' }

const fieldStyle: React.CSSProperties = {
  width: '100%', border: '1px solid var(--line)', borderRadius: 10,
  padding: '11px 13px', fontFamily: "'Hanken Grotesk', sans-serif",
  fontSize: 15, color: 'var(--ink)', background: 'var(--paper)', outline: 'none',
}

export function AddCardForm({ decks }: { decks: DeckOut[] }) {
  const router = useRouter()
  const [type, setType] = useState(TYPES[0])
  const [data, setData] = useState<PreviewData>(empty)
  const [saved, setSaved] = useState<string[]>([])
  const [deckId, setDeckId] = useState<string>('')
  const [saveError, setSaveError] = useState(false)
  const selectedDeckId = deckId || decks[0]?.id || ''

  const set = (k: keyof PreviewData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setData((d) => ({ ...d, [k]: e.target.value }))

  const handleSave = async () => {
    const word = data.word.trim()
    if (!word || !selectedDeckId) return
    const card: CardCreate = { word, phonetic: data.phonetic, pos: data.pos, meaning: data.meaning, example: data.example }
    setSaveError(false)
    try {
      await apiPost<CardOut>(`/decks/${selectedDeckId}/cards`, card)
      setSaved((prev) => [word, ...prev].slice(0, 10))
      setData(empty)
      router.refresh()
    } catch { setSaveError(true) }
  }

  const onNewDeck = async () => {
    const name = window.prompt('Tên bộ thẻ mới')?.trim()
    if (!name) return
    try {
      const deck = await apiPost<DeckOut>('/decks', { name })
      setDeckId(deck.id)
      router.refresh()
    } catch { /* creation failed — do not refresh */ }
  }

  const canSave = !!selectedDeckId && data.word.trim().length > 0

  return (
    <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', flexWrap: 'wrap' }}>
      {/* ── LEFT: form ── */}
      <section style={{
        flex: '1.4', minWidth: 400,
        border: '1px solid var(--line)', borderRadius: 18,
        background: 'var(--surface)', padding: 26,
        boxShadow: '0 1px 2px rgba(40,35,25,0.03)',
      }}>
        {/* Type selector */}
        <div style={{ fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 10 }}>
          Loại
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 22 }}>
          {TYPES.map((tp) => (
            <button
              key={tp}
              onClick={() => setType(tp)}
              style={{
                fontSize: 13,
                border: tp === type ? '1px solid var(--accent)' : '1px solid var(--line)',
                color: tp === type ? 'var(--accent)' : 'var(--muted)',
                background: tp === type ? 'var(--accent-soft)' : 'transparent',
                borderRadius: 999, padding: '6px 14px', fontWeight: tp === type ? 600 : 400,
                fontFamily: "'Hanken Grotesk', sans-serif", cursor: 'pointer',
              }}
            >
              {tp}
            </button>
          ))}
        </div>

        {/* Word + Phonetic row */}
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 14 }}>
          <div style={{ flex: 1, minWidth: 180 }}>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 6 }}>Từ / cụm từ</div>
            <input aria-label="word" className="field" style={fieldStyle} placeholder="resilient" value={data.word} onChange={set('word')} />
          </div>
          <div style={{ width: 170 }}>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 6 }}>Phiên âm</div>
            <input aria-label="phonetic" className="field" style={{ ...fieldStyle, fontFamily: 'monospace', fontSize: 13 }} placeholder="/rɪˈzɪl.i.ənt/" value={data.phonetic} onChange={set('phonetic')} />
          </div>
        </div>

        {/* Meaning */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 6 }}>Nghĩa</div>
          <input aria-label="meaning" className="field" style={fieldStyle} placeholder="có khả năng phục hồi nhanh; kiên cường" value={data.meaning} onChange={set('meaning')} />
        </div>

        {/* Example */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 6 }}>Ví dụ</div>
          <textarea aria-label="example" className="field" rows={2} style={{ ...fieldStyle, resize: 'vertical' }} placeholder="She is so resilient — she bounced back within a week." value={data.example} onChange={set('example')} />
        </div>

        {/* Deck picker + Tags row */}
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 24 }}>
          <div style={{ flex: 1, minWidth: 160 }}>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 6 }}>Bộ thẻ</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <select
                aria-label="deck"
                className="field"
                style={{ ...fieldStyle, flex: 1 }}
                value={selectedDeckId}
                onChange={(e) => setDeckId(e.target.value)}
              >
                {decks.length === 0 && <option value="">(chưa có bộ thẻ)</option>}
                {decks.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
              <button
                onClick={onNewDeck}
                style={{
                  border: '1px solid var(--line)', borderRadius: 10, background: 'var(--surface)',
                  padding: '0 14px', fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 600,
                  fontSize: 14, color: 'var(--muted)', cursor: 'pointer', whiteSpace: 'nowrap',
                }}
              >+ Bộ mới</button>
            </div>
          </div>
          <div style={{ flex: 1, minWidth: 160 }}>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 6 }}>Tags</div>
            <input aria-label="tags" className="field" style={fieldStyle} placeholder="#adjective  #work" value={data.tags} onChange={set('tags')} />
          </div>
        </div>

        {/* Action buttons */}
        {saveError && (
          <div role="alert" style={{ marginBottom: 10, padding: '8px 14px', borderRadius: 10, background: '#f6e6e2', border: '1px solid var(--rust)', color: 'var(--rust)', fontSize: 13, fontWeight: 600 }}>
            Lưu thất bại — kiểm tra kết nối và thử lại.
          </div>
        )}
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={handleSave}
            disabled={!canSave}
            style={{
              border: 'none', borderRadius: 11, background: 'var(--accent)',
              color: '#fff', padding: '12px 26px',
              fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 600, fontSize: 15,
              cursor: canSave ? 'pointer' : 'not-allowed', opacity: canSave ? 1 : 0.5,
              transition: 'transform .18s ease, box-shadow .18s ease',
            }}
            className="cta"
          >
            Lưu thẻ
          </button>
          <button
            onClick={handleSave}
            disabled={!canSave}
            style={{
              border: '1px solid var(--line)', borderRadius: 11, background: 'var(--surface)',
              padding: '12px 22px',
              fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 600, fontSize: 15,
              color: 'var(--muted)', cursor: canSave ? 'pointer' : 'not-allowed', opacity: canSave ? 1 : 0.5,
              transition: 'background .15s ease',
            }}
            className="ghost"
          >
            Lưu &amp; thêm tiếp
          </button>
        </div>
      </section>

      {/* ── RIGHT: preview + recent ── */}
      <div style={{ width: 330, flex: 'none', display: 'flex', flexDirection: 'column', gap: 18 }}>
        <CardPreview data={data} />
        {/* Recent strip */}
        <section style={{
          border: '1px solid var(--line)', borderRadius: 16,
          background: 'var(--paper)', padding: '18px 20px',
        }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
            Đã lưu hôm nay · {saved.length}
          </div>
          <div style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.7 }}>
            {saved.length > 0
              ? saved.join(' · ')
              : 'resilient · to beat around the bush · much vs many'}
          </div>
        </section>
      </div>
    </div>
  )
}
