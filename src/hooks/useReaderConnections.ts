import { useRef, useState } from 'react'
import { connectReaders } from '../sources/reader-control'
import { toNotice } from '../i18n/notice'
import type { Notice } from '../i18n/notice'

type Attempt = { connecting: boolean; error: Notice }
const idle: Attempt = { connecting: false, error: null }

export function useReaderConnections() {
  const [general, setGeneral] = useState(idle)
  const [battle, setBattle] = useState(idle)
  const pending = useRef<Promise<unknown> | null>(null)
  function connect() {
    if (pending.current) return pending.current
    setGeneral({ connecting: true, error: null })
    setBattle({ connecting: true, error: null })
    const request = connectReaders(result => {
      const update = result.reader === 'general' ? setGeneral : setBattle
      update({ connecting: false, error: result.error ? toNotice(result.error, 'saveSync.connectError') : null })
    }).finally(() => { pending.current = null })
    pending.current = request
    return request
  }
  return { general, battle, connect, busy: general.connecting || battle.connecting }
}
