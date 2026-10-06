import { useTranslation } from 'react-i18next'
import { TYPES, TYPE_LABELS, type Pokemon } from '../models/pokemon'
import { collectionTags, normalizeTag } from '../domain/collection-search'

export function CollectionSearch({ collection, query, onChange }: { collection: Pokemon[]; query: string; onChange: (query: string) => void }) {
  const { t } = useTranslation()
  const tags = collectionTags(query)
  const availableTypes = TYPES.filter(type => collection.some(pokemon => pokemon.types.includes(type)))
  return <div className="collection-search">
    <label className="search"><span aria-hidden="true">⌕</span><input type="search" aria-label={t('collectionSearch.searchAria')} placeholder={t('collectionSearch.placeholder')} value={query} onChange={event => onChange(event.target.value)} /></label>
    <p className="hint">{t('collectionSearch.hint')}</p>
    {tags.length > 0 && <div className="collection-tags" aria-label={t('collectionSearch.activeTagsAria')}>{tags.map((tag, index) => {
      const type = TYPES.find(type => [type, normalizeTag(TYPE_LABELS[type])].includes(normalizeTag(tag)))
      return <button key={`${index}:${tag}`} className={type ? `active type type-${type}` : 'active'} aria-label={t('collectionSearch.removeTagAria', { tag })} onClick={() => onChange(tags.filter((_, position) => position !== index).join(' '))}>{tag} <span aria-hidden="true">×</span></button>})}<button onClick={() => onChange('')}>{t('collectionSearch.clear')}</button></div>}
    <div className="collection-tags" aria-label={t('collectionSearch.filterByTypeAria')}>{availableTypes.map(type => {
      const selected = tags.some(tag => [type, normalizeTag(TYPE_LABELS[type])].includes(normalizeTag(tag)))
      return <button key={type} className={`type type-${type}`} aria-pressed={selected} onClick={() => onChange(selected ? tags.filter(tag => ![type, normalizeTag(TYPE_LABELS[type])].includes(normalizeTag(tag))).join(' ') : [...tags, TYPE_LABELS[type]].join(' '))}>{TYPE_LABELS[type]}</button>
    })}</div>
  </div>
}
