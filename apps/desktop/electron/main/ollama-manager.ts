import type { ChildProcess } from 'node:child_process'
import { spawn, execFile, exec } from 'node:child_process'
import { promisify } from 'node:util'
import { platform } from 'node:os'

const execFileAsync = promisify(execFile)
const execAsync = promisify(exec)

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

export interface PullProgress {
  status: string
  digest?: string
  total?: number
  completed?: number
}

class OllamaManager {
  private ollamaProcess: ChildProcess | null = null
  private readonly port = 11434
  private readonly baseUrl = `http://127.0.0.1:${this.port}`

  async checkInstalled(): Promise<boolean> {
    try {
      const { stdout } = await execFileAsync('ollama', ['--version'])
      console.log(`[Ollama] Installed: ${stdout.trim()}`)
      return true
    }
    catch (error) {
      console.warn('[Ollama] Not found')
      return false
    }
  }

  async getVersion(): Promise<string | null> {
    try {
      const { stdout } = await execFileAsync('ollama', ['--version'])
      return stdout.trim()
    }
    catch {
      return null
    }
  }

  async isRunning(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        method: 'GET',
        signal: AbortSignal.timeout(2000),
      })
      return response.ok
    }
    catch {
      return false
    }
  }

  async start(): Promise<void> {
    if (this.ollamaProcess) {
      console.warn('[Ollama] Process already running')
      return
    }

    const installed = await this.checkInstalled()
    if (!installed) {
      throw new Error('Ollama is not installed')
    }

    console.log('[Ollama] Starting server...')

    this.ollamaProcess = spawn('ollama', ['serve'], {
      stdio: 'pipe',
      detached: false,
    })

    this.ollamaProcess.on('error', (error) => {
      console.error('[Ollama] Process error:', error)
      this.ollamaProcess = null
    })

    this.ollamaProcess.on('exit', (code) => {
      console.log(`[Ollama] Process exited with code ${code}`)
      this.ollamaProcess = null
    })

    // Attendre que le serveur soit prêt
    let retries = 0
    const maxRetries = 20
    while (retries < maxRetries) {
      await new Promise(resolve => setTimeout(resolve, 500))
      if (await this.isRunning()) {
        console.log('[Ollama] Server started successfully')
        return
      }
      retries++
    }

    throw new Error('Failed to start Ollama server')
  }

  async stop(): Promise<void> {
    if (!this.ollamaProcess) {
      console.warn('[Ollama] No process to stop')
      return
    }

    console.log('[Ollama] Stopping server...')
    this.ollamaProcess.kill('SIGTERM')
    this.ollamaProcess = null
  }

  async getStatus(): Promise<OllamaStatus> {
    const installed = await this.checkInstalled()
    if (!installed) {
      return {
        installed: false,
        running: false,
      }
    }

    const version = await this.getVersion()
    const running = await this.isRunning()

    return {
      installed: true,
      running,
      version: version ?? undefined,
    }
  }

  async listModels(): Promise<OllamaModel[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      })

      if (!response.ok) {
        throw new Error(`Failed to list models: ${response.statusText}`)
      }

      const data = await response.json() as { models: OllamaModel[] }
      return data.models || []
    }
    catch (error) {
      console.error('[Ollama] Failed to list models:', error)
      throw error
    }
  }

  async pullModel(
    modelName: string,
    onProgress?: (progress: PullProgress) => void,
  ): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/api/pull`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: modelName }),
      })

      if (!response.ok) {
        throw new Error(`Failed to pull model: ${response.statusText}`)
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('No response body')
      }

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done)
          break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.trim()) {
            try {
              const progress = JSON.parse(line) as PullProgress
              onProgress?.(progress)
              console.log(`[Ollama] Pull progress: ${progress.status}`)
            }
            catch (e) {
              console.warn('[Ollama] Failed to parse progress line:', line)
            }
          }
        }
      }

      console.log(`[Ollama] Model ${modelName} pulled successfully`)
    }
    catch (error) {
      console.error('[Ollama] Failed to pull model:', error)
      throw error
    }
  }

  async deleteModel(modelName: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/api/delete`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: modelName }),
      })

      if (!response.ok) {
        throw new Error(`Failed to delete model: ${response.statusText}`)
      }

      console.log(`[Ollama] Model ${modelName} deleted successfully`)
    }
    catch (error) {
      console.error('[Ollama] Failed to delete model:', error)
      throw error
    }
  }

  async ensureRunning(): Promise<void> {
    const running = await this.isRunning()
    if (!running) {
      await this.start()
    }
  }

  async autoInstall(onProgress?: (message: string) => void): Promise<void> {
    const os = platform()

    try {
      if (os === 'linux') {
        onProgress?.('Téléchargement du script d\'installation...')
        console.log('[Ollama] Installing on Linux...')
        
        // Utiliser spawn pour avoir les logs en temps réel
        return new Promise<void>((resolve, reject) => {
          const installProcess = spawn('sh', ['-c', 'curl -fsSL https://ollama.com/install.sh | sh'], {
            stdio: ['ignore', 'pipe', 'pipe'],
          })

          installProcess.stdout?.on('data', (data) => {
            const output = data.toString()
            console.log('[Ollama Install]', output)
            
            // Extraire les messages importants
            if (output.includes('Downloading')) {
              onProgress?.('Téléchargement en cours...')
            }
            else if (output.includes('Installing')) {
              onProgress?.('Installation en cours...')
            }
            else if (output.includes('Starting')) {
              onProgress?.('Démarrage du service...')
            }
          })

          installProcess.stderr?.on('data', (data) => {
            const output = data.toString()
            console.log('[Ollama Install]', output)
            
            if (output.includes('Downloading')) {
              onProgress?.('Téléchargement en cours...')
            }
            else if (output.includes('Installing')) {
              onProgress?.('Installation en cours...')
            }
          })

          installProcess.on('close', async (code) => {
            if (code === 0) {
              console.log('[Ollama] Installation completed successfully')
              onProgress?.('Installation terminée!')
              
              // Attendre un peu que le binaire soit bien disponible
              await new Promise(r => setTimeout(r, 2000))
              
              // Vérifier que l'installation a vraiment réussi
              const installed = await this.checkInstalled()
              if (installed) {
                console.log('[Ollama] Installation verified')
                resolve()
              }
              else {
                console.warn('[Ollama] Installation completed but binary not found, retrying check...')
                // Réessayer après un délai
                await new Promise(r => setTimeout(r, 3000))
                const retryInstalled = await this.checkInstalled()
                if (retryInstalled) {
                  console.log('[Ollama] Installation verified on retry')
                  resolve()
                }
                else {
                  reject(new Error('Installation completed but Ollama binary not found'))
                }
              }
            }
            else {
              const error = new Error(`Installation failed with code ${code}`)
              console.error('[Ollama] Installation failed:', error)
              reject(error)
            }
          })

          installProcess.on('error', (error) => {
            console.error('[Ollama] Installation process error:', error)
            reject(error)
          })
        })
      }
      else if (os === 'darwin') {
        onProgress?.('Ouverture du site de téléchargement...')
        console.log('[Ollama] Opening download page for macOS...')
        
        // Ouvrir la page de téléchargement pour macOS
        await execAsync('open https://ollama.com/download/mac')
        
        throw new Error('Veuillez installer Ollama manuellement depuis le fichier téléchargé')
      }
      else if (os === 'win32') {
        onProgress?.('Ouverture du site de téléchargement...')
        console.log('[Ollama] Opening download page for Windows...')
        
        // Ouvrir la page de téléchargement pour Windows
        await execAsync('start https://ollama.com/download/windows')
        
        throw new Error('Veuillez installer Ollama manuellement depuis le fichier téléchargé')
      }
      else {
        throw new Error(`Système d'exploitation non supporté: ${os}`)
      }

      // Vérifier que l'installation a réussi
      const installed = await this.checkInstalled()
      if (!installed) {
        throw new Error('L\'installation a échoué. Veuillez installer manuellement.')
      }

      console.log('[Ollama] Auto-installation completed successfully')
    }
    catch (error) {
      console.error('[Ollama] Auto-installation failed:', error)
      throw error
    }
  }
}

export const ollamaManager = new OllamaManager()

