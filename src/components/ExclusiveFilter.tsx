import { useTranslation } from 'react-i18next'
import './ExclusiveFilter.css'

export function ExclusiveFilter({ checked, onChange }: { checked: boolean; onChange: (checked: boolean) => void }) {
  const { t } = useTranslation()
  return <label className="exclusive-filter"><input type="checkbox" checked={checked} onChange={event => onChange(event.target.checked)} />{t('acquisitionAvailability.onlyExclusive')}</label>
}
