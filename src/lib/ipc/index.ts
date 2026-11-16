import { tauriIpc } from './tauri'
import { mockIpc } from './mock'

export const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
const useMock = !isTauri || import.meta.env.VITE_MOCK_IPC === '1'

export class IpcException extends Error {
  code: string
  constructor(code: string, message: string) {
    super(message)
    this.name = 'IpcException'
    this.code = code
  }
}

export const ipc = useMock ? mockIpc : tauriIpc
export * from './types'
