import test from 'node:test'
import assert from 'node:assert/strict'
import { connectionStatusColor } from '../src/domain/connection-status.ts'
import { blackConnectionStatus } from '../src/games/black/connection-status.ts'
import { xConnectionStatus } from '../src/games/x/connection-status.ts'
import { initialSaveTeam } from '../src/sources/team.ts'
import { emptyPokedexSnapshot } from '../src/sources/pokedex-snapshot.ts'
import { emptyLivePartySnapshot } from '../src/sources/live-party-snapshot.ts'
import type { ReaderStatus } from '../src/domain/reader-status.ts'

const labels = { manualHint: 'Manual data', saveLabel: 'Saved game', liveLabel: 'Live', boxesLabel: 'Boxes', saveMessage: 'Save message', liveMessage: 'Live message', boxesMessage: 'Boxes message' }
const save = emptyPokedexSnapshot('x-save')
const live = emptyLivePartySnapshot()
const color = (statuses: ReaderStatus[]) => connectionStatusColor({ manual: false, readers: statuses.map((status, index) => ({ id: String(index), label: String(index), status })) })

test('connection summary aggregates an arbitrary set of declared readers', () => {
  assert.equal(color([]), 'waiting')
  assert.equal(color(['connected']), 'connected')
  assert.equal(color(['connected', 'connected', 'connected']), 'connected')
  assert.equal(color(['connected', 'disconnected']), 'partial')
  assert.equal(color(['connected', 'connecting']), 'partial')
  assert.equal(color(['connecting', 'waiting']), 'waiting')
  assert.equal(color(['disconnected', 'waiting']), 'disconnected')
  assert.equal(color(['paused']), 'disconnected')
  assert.equal(connectionStatusColor({ manual: true, readers: [{ id: 'old', label: 'Old', status: 'disconnected' }] }), 'manual')
  assert.equal(connectionStatusColor({ manual: false, readers: [{ id: 'primary', label: 'Primary', status: 'connected' }, { id: 'cache', label: 'Cache', status: 'disconnected', affectsSummary: false }] }), 'connected')
})

test('X manual and save modes never inherit the status of the live source', () => {
  assert.deepEqual(xConnectionStatus('manual', save, live, labels), { manual: true, readers: [], message: labels.manualHint })
  assert.equal(connectionStatusColor(xConnectionStatus('save', save, { ...live, status: 'error' }, labels)), 'waiting')
  const data = xConnectionStatus('save', { ...save, status: 'ready', updatedAt: '2026-10-25T10:00:00Z' }, live, labels)
  assert.deepEqual(data.readers.map(reader => reader.id), ['save'])
  assert.equal(connectionStatusColor(data), 'connected')
  const missing = xConnectionStatus('save', { ...save, status: 'missing' }, live, labels)
  assert.equal(connectionStatusColor(missing), 'disconnected')
})

test('X live reports boxes separately without letting their refresh affect the connection color', () => {
  assert.equal(connectionStatusColor(xConnectionStatus('live', save, live, labels)), 'waiting')
  assert.equal(connectionStatusColor(xConnectionStatus('live', save, { ...live, enabled: true, message: 'connecting' }, labels)), 'waiting')
  const ready = { ...live, status: 'ready' as const, boxesStatus: 'ready' as const, updatedAt: '2026-10-25T10:05:00Z', boxesUpdatedAt: '2026-10-25T10:00:00Z' }
  const data = xConnectionStatus('live', save, ready, labels)
  assert.equal(connectionStatusColor(data), 'connected')
  assert.deepEqual(data.readers.map(reader => reader.id), ['live', 'boxes'])
  assert.deepEqual(data.readers.map(reader => reader.updatedAt), [ready.updatedAt, ready.boxesUpdatedAt])
  const failedBoxes = xConnectionStatus('live', save, { ...ready, boxesStatus: 'error' }, labels)
  assert.equal(failedBoxes.readers[1].status, 'disconnected')
  assert.equal(connectionStatusColor(failedBoxes), 'connected')
  assert.equal(connectionStatusColor(xConnectionStatus('live', save, { ...ready, boxesStatus: 'reading' }, labels)), 'connected')
  const disconnected = xConnectionStatus('live', save, { ...ready, status: 'waiting', message: 'disconnected' }, labels)
  assert.ok(disconnected.readers.every(reader => reader.status === 'disconnected'))
  assert.equal(connectionStatusColor(disconnected), 'disconnected')
  assert.equal(connectionStatusColor(xConnectionStatus('live', save, live, { ...labels, controlError: true })), 'disconnected')
})

test('Black preserves its independent general/battle readers using the same contract', () => {
  const input = { ...labels, generalLabel: 'General', battleLabel: 'Battle', generalStatus: 'connected' as const, battleStatus: 'disconnected' as const, generalMessage: 'General message', battleMessage: 'Battle message' }
  const data = blackConnectionStatus('live', initialSaveTeam, input)
  assert.deepEqual(data.readers.map(reader => reader.id), ['general', 'battle'])
  assert.equal(connectionStatusColor(data), 'partial')
  assert.equal(connectionStatusColor(blackConnectionStatus('live', initialSaveTeam, { ...input, battleStatus: 'connected' })), 'connected')
  assert.equal(connectionStatusColor(blackConnectionStatus('manual', initialSaveTeam, input)), 'manual')
  assert.equal(connectionStatusColor(blackConnectionStatus('save', { ...initialSaveTeam, connected: true }, input)), 'connected')
})
