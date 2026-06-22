import { useState } from 'react'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'

const TYPES = ['Từ vựng', 'Cụm từ', 'Ngữ pháp', 'Lỗi']

export function QuickAdd() {
  const [value, setValue] = useState('')
  const [selected, setSelected] = useState('Từ vựng')

  function handleSave() {
    setValue('')
  }

  return (
    <Card className="p-5">
      <div className="text-sm font-semibold text-ink mb-3">Thêm nhanh</div>
      <input
        className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/40"
        placeholder="Thêm nhanh một từ, cụm từ hay câu mẫu…"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      <div className="mt-3 flex flex-wrap gap-2">
        {TYPES.map((t) => (
          <button
            key={t}
            onClick={() => setSelected(t)}
            className={`rounded-md px-3 py-1 text-xs font-semibold uppercase tracking-wide transition-colors ${
              selected === t
                ? 'bg-accent text-white'
                : 'bg-paper text-muted hover:bg-accent/10'
            }`}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="mt-3">
        <Button onClick={handleSave}>Lưu</Button>
      </div>
    </Card>
  )
}
