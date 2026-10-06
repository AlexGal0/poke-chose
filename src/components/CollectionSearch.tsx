import { TYPES, TYPE_LABELS, type Pokemon } from '../models/pokemon'
import { collectionTags, normalizeTag } from '../domain/collection-search'

export function CollectionSearch({ collection, query, onChange }: { collection: Pokemon[]; query: string; onChange: (query: string) => void }) {
  const tags = collectionTags(query)
  const availableTypes = TYPES.filter(type => collection.some(pokemon => pokemon.types.includes(type)))
  return <div className="collection-search">
    <label className="search"><span aria-hidden="true">⌕</span><input type="search" aria-label="Buscar en Mi colección por etiquetas" placeholder="Especie, mote, número o tipos" value={query} onChange={event => onChange(event.target.value)} /></label>
    <p className="hint">Combina etiquetas con espacios o comas. Deben coincidir todas. Pulsa un tipo para añadirlo.</p>
    {tags.length > 0 && <div className="collection-tags" aria-label="Etiquetas activas">{tags.map((tag, index) => {
      const type = TYPES.find(type => [type, normalizeTag(TYPE_LABELS[type])].includes(normalizeTag(tag)))
      return <button key={`${index}:${tag}`} className={type ? `active type type-${type}` : 'active'} aria-label={`Quitar etiqueta ${tag}`} onClick={() => onChange(tags.filter((_, position) => position !== index).join(' '))}>{tag} <span aria-hidden="true">×</span></button>})}<button onClick={() => onChange('')}>Limpiar</button></div>}
    <div className="collection-tags" aria-label="Filtrar por tipo">{availableTypes.map(type => {
      const selected = tags.some(tag => [type, normalizeTag(TYPE_LABELS[type])].includes(normalizeTag(tag)))
      return <button key={type} className={`type type-${type}`} aria-pressed={selected} onClick={() => onChange(selected ? tags.filter(tag => ![type, normalizeTag(TYPE_LABELS[type])].includes(normalizeTag(tag))).join(' ') : [...tags, TYPE_LABELS[type]].join(' '))}>{TYPE_LABELS[type]}</button>
    })}</div>
  </div>
}
