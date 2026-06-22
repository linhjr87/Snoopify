import { useAppStore } from '../../store/useAppStore'
import { useT } from '../../i18n/useT'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { sampleJson } from '../../data/seed'
export function ImportJsonModal() {
  const t = useT()
  const importOpen = useAppStore((s) => s.importOpen)
  const importText = useAppStore((s) => s.importText)
  const importStatus = useAppStore((s) => s.importStatus)
  const setPanel = useAppStore((s) => s.setPanel)
  const setImportText = useAppStore((s) => s.setImportText)
  const parseAndImport = useAppStore((s) => s.parseAndImport)
  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return
    const r = new FileReader()
    r.onload = () => setImportText(String(r.result || ''))
    r.onerror = () => parseAndImport('')
    r.readAsText(f)
  }
  return (
    <Modal open={importOpen} onClose={() => setPanel('importOpen', false)} title={t.importJson}>
      <p className="mb-2 text-sm text-muted">Chọn file .json theo cấu trúc mẫu bên dưới, hoặc dán trực tiếp rồi bấm Nhập.</p>
      <input type="file" accept=".json" onChange={onFile} className="mb-2 text-sm" />
      <textarea aria-label="json" value={importText} onChange={(e) => setImportText(e.target.value)}
        className="h-32 w-full rounded-lg border border-line bg-paper p-2 font-mono text-xs text-ink" placeholder="Chọn file .json hoặc dán bên dưới" />
      <pre className="mt-2 max-h-32 overflow-auto rounded-lg bg-paper p-2 text-xs text-muted">{sampleJson}</pre>
      <div className="mt-3 flex items-center gap-3">
        <Button onClick={() => parseAndImport(importText)}>{t.importJson}</Button>
        {importStatus && <span className={`text-sm ${importStatus.ok ? 'text-accent' : 'text-rust'}`}>{importStatus.msg}</span>}
      </div>
    </Modal>
  )
}
