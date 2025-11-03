import type { electron } from '../main/events'
import type { UpdatesStatus } from '~/updates-observer'
import { contextBridge, ipcRenderer } from 'electron'

// eslint-disable-next-line ts/no-explicit-any
export type PromisifyElectron<T extends Record<string, any>> = {
  [K in keyof T]: {
    // eslint-disable-next-line ts/no-explicit-any
    [K2 in keyof T[K]]: (...args: Parameters<T[K][K2]>) => ReturnType<T[K][K2]> extends Promise<any> ? ReturnType<T[K][K2]> : Promise<ReturnType<T[K][K2]>>
  }
}

export interface OllamaStatus {
  installed: boolean
  running: boolean
  version?: string
  error?: string
}

export interface OllamaModel {
  name: string
  size: number
  modified_at: string
}

export type ElectronPreload = PromisifyElectron<typeof electron> & {
  app: {
    onDeepLink: (callback: (url: string) => void) => () => void
    onUpdatesStatus: (callback: (params: { status: UpdatesStatus, message?: string }) => void) => () => void
    onNavigate: (callback: (path: string) => void) => () => void
  }
  versions: {
    node: () => string
    chrome: () => string
    electron: () => string
  }
  ollama: {
    status: () => Promise<OllamaStatus>
    start: () => Promise<void>
    stop: () => Promise<void>
    ensureRunning: () => Promise<void>
    listModels: () => Promise<OllamaModel[]>
    pullModel: (args: { modelName: string }) => Promise<void>
    deleteModel: (args: { modelName: string }) => Promise<void>
    autoInstall: () => Promise<void>
  }
}

// eslint-disable-next-line ts/no-explicit-any
async function handleError(func: () => any, log?: () => any) {
  try {
    const result = await func()

    return result
  }
  catch (error) {
    if (import.meta.env.DEV && log) {
      // eslint-disable-next-line no-console
      console.debug('preload error', log())
    }

    if (error instanceof Error) {
      const message = error.message.replace(/^Error invoking remote method '[^']+': /, '')
      const errorMessage = message.toLowerCase().startsWith('error: ') ? message.slice(7) : message

      throw new TypeError(errorMessage.charAt(0).toUpperCase() + errorMessage.slice(1))
    }
    throw error
  }
}

contextBridge.exposeInMainWorld('electron', {
  databases: {
    test: arg => handleError(() => ipcRenderer.invoke('databases.test', arg), () => arg),
    query: arg => handleError(() => ipcRenderer.invoke('databases.query', arg), () => arg),
  },
  encryption: {
    encrypt: arg => handleError(() => ipcRenderer.invoke('encryption.encrypt', arg), () => arg),
    decrypt: arg => handleError(() => ipcRenderer.invoke('encryption.decrypt', arg), () => arg),
  },
  app: {
    onDeepLink: (callback) => {
      const listener = (_event: Electron.IpcRendererEvent, url: string) => callback(url)
      ipcRenderer.on('deep-link', listener)
      return () => ipcRenderer.off('deep-link', listener)
    },
    onUpdatesStatus: (callback) => {
      const listener = (_event: Electron.IpcRendererEvent, { status, message }: { status: UpdatesStatus, message?: string }) => callback({ status, message })
      ipcRenderer.on('updates-status', listener)
      return () => ipcRenderer.off('updates-status', listener)
    },
    onNavigate: (callback) => {
      const listener = (_event: Electron.IpcRendererEvent, path: string) => callback(path)
      ipcRenderer.on('app.navigate', listener)
      return () => ipcRenderer.off('app.navigate', listener)
    },
    checkForUpdates: () => handleError(() => ipcRenderer.invoke('app.checkForUpdates')),
    quitAndInstall: () => handleError(() => ipcRenderer.invoke('app.quitAndInstall')),
    channelUpdates: type => handleError(() => ipcRenderer.invoke('app.channelUpdates', type)),
  },
  versions: {
    node: () => process.versions.node,
    chrome: () => process.versions.chrome,
    electron: () => process.versions.electron,
    app: () => ipcRenderer.invoke('versions.app'),
  },
  ollama: {
    status: () => handleError(() => ipcRenderer.invoke('ollama.status')),
    start: () => handleError(() => ipcRenderer.invoke('ollama.start')),
    stop: () => handleError(() => ipcRenderer.invoke('ollama.stop')),
    ensureRunning: () => handleError(() => ipcRenderer.invoke('ollama.ensureRunning')),
    listModels: () => handleError(() => ipcRenderer.invoke('ollama.listModels')),
    pullModel: (args: { modelName: string }) => handleError(() => ipcRenderer.invoke('ollama.pullModel', args)),
    deleteModel: (args: { modelName: string }) => handleError(() => ipcRenderer.invoke('ollama.deleteModel', args)),
    autoInstall: () => handleError(() => ipcRenderer.invoke('ollama.autoInstall')),
  },
} satisfies ElectronPreload)
