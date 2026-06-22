import { useState } from 'react'
import { Button } from '../../components/ui/Button'
import { CardPreview, type PreviewData } from './CardPreview'

const TYPES = ['Từ vựng', 'Cụm từ', 'Ngữ pháp', 'Câu mẫu', 'Ghi chú', 'Lỗi']

const empty: PreviewData = { word: '', phonetic: '', pos: '', meaning: '', example: '' }

export function AddCardForm() {
  const [type, setType] = useState(TYPES[0])
  const [data, setData] = useState<PreviewData>(empty)

  const set = (k: keyof PreviewData) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setData((d) => ({ ...d, [k]: e.target.value }))

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {TYPES.map((tp) => (
            <button
              key={tp}
              onClick={() => setType(tp)}
              className={`rounded-lg px-3 py-1.5 text-sm ${
                type === tp ? 'bg-accent-soft text-accent font-semibold' : 'text-muted'
              }`}
            >
              {tp}
            </button>
          ))}
        </div>

        <input
          aria-label="word"
          placeholder="Từ / cụm từ"
          value={data.word}
          onChange={set('word')}
          className="w-full rounded-xl border border-line bg-paper px-3 py-2 text-ink"
        />

        <input
          aria-label="phonetic"
          placeholder="Phiên âm"
          value={data.phonetic}
          onChange={set('phonetic')}
          className="w-full rounded-xl border border-line bg-paper px-3 py-2 text-ink"
        />

        <input
          aria-label="meaning"
          placeholder="Nghĩa"
          value={data.meaning}
          onChange={set('meaning')}
          className="w-full rounded-xl border border-line bg-paper px-3 py-2 text-ink"
        />

        <input
          aria-label="example"
          placeholder="Ví dụ"
          value={data.example}
          onChange={set('example')}
          className="w-full rounded-xl border border-line bg-paper px-3 py-2 text-ink"
        />

        <div className="flex gap-2">
          <Button onClick={() => setData(empty)}>Lưu thẻ</Button>
          <Button variant="ghost" onClick={() => setData(empty)}>
            Lưu thêm tiếp
          </Button>
        </div>
      </div>

      <CardPreview data={data} />
    </div>
  )
}
