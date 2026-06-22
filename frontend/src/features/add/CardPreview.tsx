import { Card } from '../../components/ui/Card'

export interface PreviewData {
  word: string
  phonetic: string
  pos: string
  meaning: string
  example: string
}

export function CardPreview({ data }: { data: PreviewData }) {
  return (
    <Card className="p-5">
      <div className="text-xs uppercase tracking-wide text-muted">Xem trước</div>
      <div className="mt-2 text-2xl font-semibold text-ink">{data.word || 'resilient'}</div>
      <div className="text-muted">
        {data.phonetic || '/rɪˈzɪl.i.ənt/'} · {data.pos || 'adj'}
      </div>
      <div className="mt-2 text-ink">{data.meaning || 'có khả năng phục hồi nhanh; kiên cường'}</div>
      <div className="mt-2 italic text-muted">{data.example || 'She is so resilient…'}</div>
    </Card>
  )
}
