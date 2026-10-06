export function bridgeSnapshotMessageKey(sourceId: string, code: string): string {
  return `sources.${sourceId === 'live' ? 'live' : 'save'}.messages.${code}`
}
