export type Notice = { key: string; params?: Record<string, unknown> } | { raw: string } | null

export function noticeText(t: (key: string, params?: Record<string, unknown>) => string, notice: Notice): string | null {
  return notice && ('key' in notice ? t(notice.key, notice.params) : notice.raw)
}

export class KeyedError extends Error {
  key: string
  constructor(key: string) {
    super(key)
    this.key = key
  }
}

export function toNotice(cause: unknown, fallbackKey: string): Notice {
  if (cause instanceof KeyedError) return { key: cause.key }
  if (cause instanceof Error) return { raw: cause.message }
  return { key: fallbackKey }
}
