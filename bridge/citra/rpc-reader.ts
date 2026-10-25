import { createSocket } from 'node:dgram'
import type { Socket } from 'node:dgram'
import { randomInt } from 'node:crypto'

export interface CitraRpcOptions { host?: string; port?: number; timeoutMs?: number }
// Deliberately no generic packet/command API, writes, breakpoints or execution control.
export class CitraRpcReader {
  private socket: Socket | null = null
  private opening: Promise<void> | null = null
  private pending: { id: number; size: number; resolve: (data: Buffer) => void; reject: (error: Error) => void; timer: ReturnType<typeof setTimeout> } | null = null
  private queue: Promise<unknown> = Promise.resolve()
  private closed = false
  private nextId = randomInt(0x100000000)
  private readonly port: number
  private readonly timeoutMs: number
  constructor({ host = '127.0.0.1', port = 45987, timeoutMs = 1000 }: CitraRpcOptions = {}) {
    if (host !== '127.0.0.1') throw new Error('RPC requires loopback')
    if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Invalid RPC port')
    if (!Number.isInteger(timeoutMs) || timeoutMs < 50 || timeoutMs > 5000) throw new Error('Invalid RPC timeout')
    this.port = port
    this.timeoutMs = timeoutMs
  }
  private fail(error: Error) {
    const request = this.pending
    if (!request) return
    this.pending = null
    clearTimeout(request.timer)
    request.reject(error)
  }
  private open(): Promise<void> {
    if (this.closed) return Promise.reject(new Error('RPC reader closed'))
    if (this.opening) return this.opening
    const socket = createSocket('udp4')
    this.socket = socket
    socket.on('message', (data, peer) => {
      const request = this.pending
      if (!request || peer.address !== '127.0.0.1' || peer.port !== this.port || data.length < 16) return
      if (data.readUInt32LE(0) !== 1 || data.readUInt32LE(4) !== request.id || data.readUInt32LE(8) !== 1) return
      const length = data.readUInt32LE(12)
      if (length !== request.size || data.length !== 16 + length) { this.fail(new Error('Invalid RPC reply size')); return }
      this.pending = null
      clearTimeout(request.timer)
      request.resolve(Buffer.from(data.subarray(16)))
    })
    socket.on('error', error => this.fail(error))
    this.opening = new Promise<void>((resolve, reject) => {
      const cleanup = () => { socket.off('error', onError); socket.off('close', onClose) }
      const onError = (error: Error) => { cleanup(); reject(error) }
      const onClose = () => { cleanup(); reject(new Error('RPC reader closed')) }
      socket.once('error', onError)
      socket.once('close', onClose)
      socket.bind(0, '127.0.0.1', () => {
        if (this.closed) { cleanup(); reject(new Error('RPC reader closed')); return }
        socket.connect(this.port, '127.0.0.1', () => { cleanup(); resolve() })
      })
    })
    return this.opening
  }
  read(address: number, size: number): Promise<Buffer> {
    if (!Number.isInteger(address) || address < 0 || address > 0xffffffff || !Number.isInteger(size) || size < 1 || size > 4096 || address + size > 0x100000000) return Promise.reject(new Error('Invalid RPC range'))
    const result = this.queue.then(async () => {
      await this.open()
      const output: Buffer[] = []
      for (let offset = 0; offset < size; offset += 32) {
        if (this.closed) throw new Error('RPC reader closed')
        const length = Math.min(32, size - offset)
        const id = this.nextId = (this.nextId + 1) >>> 0
        const packet = Buffer.alloc(24)
        const fields = [1, id, 1, 8, address + offset, length]
        fields.forEach((value, i) => packet.writeUInt32LE(value, i * 4))
        output.push(await new Promise<Buffer>((resolve, reject) => {
          const timer = setTimeout(() => this.fail(new Error('RPC read timeout')), this.timeoutMs)
          this.pending = { id, size: length, resolve, reject, timer }
          this.socket!.send(packet, error => { if (error && this.pending?.id === id) this.fail(error) })
        }))
      }
      return Buffer.concat(output)
    })
    this.queue = result.catch(() => {})
    return result
  }
  close() {
    if (this.closed) return
    this.closed = true
    this.fail(new Error('RPC reader closed'))
    this.socket?.close()
  }
}
