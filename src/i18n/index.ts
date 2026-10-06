import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { loadLocale } from '../storage/locale.ts'
import es from './locales/es/translation.json' with { type: 'json' }
import en from './locales/en/translation.json' with { type: 'json' }

void i18n.use(initReactI18next).init({
  resources: {
    es: { translation: es },
    en: { translation: en },
  },
  lng: loadLocale(),
  fallbackLng: 'es',
  interpolation: { escapeValue: false },
})

if (typeof document !== 'undefined') {
  i18n.on('languageChanged', lng => { document.documentElement.lang = lng })
  document.documentElement.lang = i18n.language ?? loadLocale()
}

export default i18n
