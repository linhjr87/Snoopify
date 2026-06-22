import { useAppStore } from '../../store/useAppStore'
import { useT } from '../../i18n/useT'
import { Modal } from '../ui/Modal'
import { Toggle } from '../ui/Toggle'
import { Button } from '../ui/Button'
export function SettingsPanel() {
  const t = useT()
  const { settingsOpen, dark, confirmReset } = useAppStore((s) => ({ settingsOpen: s.settingsOpen, dark: s.dark, confirmReset: s.confirmReset }))
  const { setPanel, toggleDark, resetProgress } = useAppStore.getState()
  return (
    <Modal open={settingsOpen} onClose={() => setPanel('settingsOpen', false)} title={t.settings}>
      <div className="flex items-center justify-between py-2">
        <span className="text-sm text-ink">{t.darkMode}</span>
        <Toggle checked={dark} onChange={() => toggleDark()} label={t.darkMode} />
      </div>
      <div className="border-t border-line pt-3">
        {!confirmReset ? (
          <Button variant="ghost" onClick={() => setPanel('confirmReset', true)}>{t.resetProgress}</Button>
        ) : (
          <div className="space-y-2">
            <div className="text-sm text-ink">{t.resetConfirm}</div>
            <div className="flex gap-2">
              <Button variant="danger" onClick={() => resetProgress()}>{t.deleteAll}</Button>
              <Button variant="ghost" onClick={() => setPanel('confirmReset', false)}>{t.cancel}</Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
