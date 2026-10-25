export function bridgeSnapshotMessageKey(sourceId: string, code: string): string {
  return `sources.${sourceId === 'x-live' ? 'xLive' : sourceId === 'x-save' ? 'xSave' : sourceId === 'live' ? 'live' : 'save'}.messages.${code}`
}
