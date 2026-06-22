import { useT } from '../../i18n/useT'
import { AddCardForm } from './AddCardForm'

export default function AddScreen() {
  const t = useT()
  return (
    <div className="space-y-5">
      <h1 className="text-xl font-semibold text-ink">{t.addTitle}</h1>
      <AddCardForm />
    </div>
  )
}
