function compatibleSnapshot(value) {
  return value && typeof value === 'object' &&
    ['waiting', 'ready', 'missing', 'error'].includes(value.status) &&
    typeof value.message === 'string' && typeof value.backup === 'boolean' &&
    (value.updatedAt === null || typeof value.updatedAt === 'string') &&
    (value.party === null || Array.isArray(value.party)) &&
    (value.boxes === null || Array.isArray(value.boxes)) &&
    (value.pokedex === null || (Array.isArray(value.pokedex?.caughtSpeciesIds) && Array.isArray(value.pokedex?.seenSpeciesIds)))
}

export async function bridgeRunning(port, service, workspace = process.cwd()) {
  if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error(`Puerto del servicio ${service} inválido.`)
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 2000)
  const url = `http://127.0.0.1:${port}/${service}-api`
  try {
    const health = await fetch(`${url}/health`, { signal: controller.signal, headers: { Connection: 'close' } })
    if (health.ok) {
      const identity = await health.json()
      if (identity.application === 'poke-chose' && identity.service === service && identity.workspace === workspace) return true
      throw new Error('Servicio de otra aplicación o carpeta.')
    }
    if (health.status !== 404) throw new Error('Respuesta no compatible.')
    // Older bridges expose only SSE. Read the initial snapshot without starting GDB.
    const response = await fetch(`${url}/events`, { signal: controller.signal, headers: { Connection: 'close' } })
    if (!response.ok || !response.headers.get('content-type')?.includes('text/event-stream')) throw new Error('No es un servicio compatible.')
    const reader = response.body.getReader()
    let text = ''
    while (text.length < 65536) {
      const chunk = await reader.read()
      if (chunk.done) break
      text += Buffer.from(chunk.value).toString('utf8')
      const match = /(?:^|\n)data: ([^\n]+)\n/.exec(text)
      if (match) {
        if (compatibleSnapshot(JSON.parse(match[1]))) return true
        break
      }
    }
    throw new Error('El servicio no entrega datos compatibles.')
  } catch (error) {
    if (error.cause?.code === 'ECONNREFUSED') return false
    throw new Error(`El puerto ${port} está ocupado y no se pudo verificar el servicio ${service} de PokéChose. ${error.message}`)
  } finally {
    clearTimeout(timer)
    controller.abort()
  }
}
