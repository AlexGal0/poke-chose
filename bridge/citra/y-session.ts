import { createXYSessionReader } from './x-session.ts'

export function createYSessionReader() { return createXYSessionReader(25, { port: Number(process.env.CITRA_Y_RPC_PORT ?? 45987) }) }
