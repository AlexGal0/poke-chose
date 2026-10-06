import { createConnection } from 'node:net'

export function packet(payload) {
  const checksum = [...Buffer.from(payload)].reduce((sum, byte) => (sum + byte) & 255, 0)
  return `$${payload}#${checksum.toString(16).padStart(2, '0')}`
}

function decode(payload) {
  let result = ''
  for (let index = 0; index < payload.length; index++) {
    if (payload[index] === '}') {
      if (++index >= payload.length) throw new Error('Escape GDB incompleto.')
      result += String.fromCharCode(payload.charCodeAt(index) ^ 32)
    } else if (payload[index] === '*') {
      if (!result.length || ++index >= payload.length) throw new Error('Repetición GDB inválida.')
      const count = payload.charCodeAt(index) - 29
      if (count < 0 || count > 97) throw new Error('Repetición GDB inválida.')
      result += result.at(-1).repeat(count)
    } else result += payload[index]
  }
  return result
}

// No generic command API: capability query, memory reads, resume and detach only.
export class GdbReader {
  constructor({ host = '127.0.0.1', port = 3333, timeoutMs = 5000, chunkSize = 256, onStatus = () => {} } = {}) {
    if (host !== '127.0.0.1') throw new Error('El prototipo solo admite 127.0.0.1.')
    if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Puerto inválido.')
    if (!Number.isInteger(chunkSize) || chunkSize < 1 || chunkSize > 256) throw new Error('chunkSize debe estar entre 1 y 256.')
    if (!Number.isInteger(timeoutMs) || timeoutMs < 100 || timeoutMs > 30000) throw new Error('timeoutMs inválido.')
    this.options = { host, port }
    this.timeoutMs = timeoutMs
    this.chunkSize = chunkSize
    this.buffer = ''
    this.pending = null
    this.socket = null
    this.onStatus = onStatus
    this.receivedAck = false
  }

  async connect() {
    if (this.socket) throw new Error('Ya existe una conexión.')
    const socket = createConnection(this.options)
    this.socket = socket
    socket.setNoDelay(true)
    socket.on('data', data => this.receive(data))
    socket.on('error', error => this.fail(error))
    socket.on('close', () => this.fail(new Error('Conexión GDB cerrada.')))
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => { socket.destroy(); reject(new Error('Tiempo de conexión GDB agotado.')) }, this.timeoutMs)
      socket.once('connect', () => { clearTimeout(timer); resolve() })
      socket.once('error', error => { clearTimeout(timer); reject(error) })
    })
    // melonDS expects an initial ACK. New connections may hold the CPU until 'c'.
    socket.write('+')
    this.onStatus('TCP conectado; esperando respuesta de GDB a qSupported.')
    try {
      const features = await this.#request('qSupported:')
      this.resume()
      return features
    } catch (error) { this.close(); throw error }
  }

  resume() {
    if (!this.socket || this.socket.destroyed) throw new Error('GDB no conectado.')
    this.socket.write(packet('c'))
  }

  fail(error) {
    if (this.pending) {
      const pending = this.pending
      this.pending = null
      clearTimeout(pending.timer)
      pending.reject(error)
    }
  }

  receive(data) {
    this.buffer += data.toString('latin1')
    if (this.buffer.length > 65536) { this.fail(new Error('Respuesta GDB demasiado grande.')); this.close(); return }
    try {
      while (this.buffer.length) {
        if (this.buffer[0] === '+' && !this.receivedAck) {
          this.receivedAck = true
          this.onStatus('GDB respondió con ACK.')
        }
        if (this.buffer[0] === '-') {
          this.buffer = this.buffer.slice(1)
          if (this.pending && this.pending.retries++ < 2) this.socket.write(this.pending.frame)
          else { this.fail(new Error('GDB rechazó el paquete.')); this.close() }
          continue
        }
        if (this.buffer[0] !== '$') { this.buffer = this.buffer.slice(1); continue }
        const end = this.buffer.indexOf('#')
        if (end < 0 || this.buffer.length < end + 3) return
        const payload = this.buffer.slice(1, end)
        const checksum = this.buffer.slice(end + 1, end + 3)
        this.buffer = this.buffer.slice(end + 3)
        const expected = [...Buffer.from(payload, 'latin1')].reduce((sum, byte) => (sum + byte) & 255, 0)
        if (!/^[\da-f]{2}$/i.test(checksum) || parseInt(checksum, 16) !== expected) { this.socket.write('-'); continue }
        this.socket.write('+')
        const response = decode(payload)
        // Stop notifications must never be mistaken for a memory response.
        if (/^[STWX][\da-f]{2}/i.test(response)) {
          this.fail(new Error(`La emulación notificó una parada (${response}). Revisa melonDS y vuelve a conectar.`))
          this.close()
          return
        }
        if (response.startsWith('O') && response !== 'OK') continue
        if (this.pending) {
          const pending = this.pending
          this.pending = null
          clearTimeout(pending.timer)
          pending.resolve(response)
        }
      }
    } catch (error) { this.fail(error); this.close() }
  }

  #request(command) {
    if (this.pending) return Promise.reject(new Error('No se permiten peticiones GDB simultáneas.'))
    if (!this.socket || this.socket.destroyed) return Promise.reject(new Error('GDB no conectado.'))
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.fail(new Error(`GDB no respondió a tiempo a ${command.startsWith('m') ? 'lectura de memoria' : command}. TCP conectado; ${this.receivedAck ? 'se recibió ACK' : 'no se recibió ningún ACK de GDB'}.`))
        this.close()
      }, this.timeoutMs)
      const frame = packet(command)
      this.pending = { resolve, reject, timer, frame, retries: 0 }
      this.socket.write(frame)
    })
  }

  async readMemory(address, length) {
    if (!Number.isSafeInteger(address) || !Number.isSafeInteger(length) || length < 1 || address < 0x02000000 || address + length > 0x02400000) throw new Error('Lectura fuera de la RAM principal de DS (4 MiB).')
    const result = Buffer.alloc(length)
    for (let offset = 0; offset < length; offset += this.chunkSize) {
      const size = Math.min(this.chunkSize, length - offset)
      const response = await this.#request(`m${(address + offset).toString(16)},${size.toString(16)}`)
      if (/^E[\da-f]{2}$/i.test(response)) throw new Error(`GDB rechazó la lectura: ${response}`)
      if (response.length !== size * 2 || !/^[\da-f]+$/i.test(response)) throw new Error('Respuesta de memoria incompleta o inválida.')
      Buffer.from(response, 'hex').copy(result, offset)
      if (length >= 262144 && ((offset + size) % 262144 === 0 || offset + size === length)) {
        this.onStatus(`RAM leída: ${Math.round((offset + size) / length * 100)}% (${offset + size}/${length} bytes).`)
      }
    }
    return result
  }

  async disconnect() {
    if (!this.socket || this.socket.destroyed) return
    try {
      const response = await this.#request('D')
      if (response !== 'OK') throw new Error('GDB no confirmó la desconexión.')
      // Flush the response ACK before closing; destroying immediately can drop it.
      await new Promise(resolve => this.socket.end(resolve))
    } finally { this.close() }
  }

  close() {
    this.fail(new Error('Lector GDB cerrado.'))
    this.socket?.destroy()
  }
}
