import { useEffect, useState } from 'react'
import { Alert, AlertDescription, AlertTitle } from '@conar/ui/components/alert'
import { Button } from '@conar/ui/components/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@conar/ui/components/dialog'
import { Label } from '@conar/ui/components/label'
import { LoadingContent } from '@conar/ui/components/custom/loading-content'
import { RadioGroup, RadioGroupItem } from '@conar/ui/components/radio-group'
import { ScrollArea } from '@conar/ui/components/scroll-area'
import { Switch } from '@conar/ui/components/switch'
import { RiCheckLine, RiCloseLine, RiDeleteBin6Line, RiDownloadLine, RiFlashlightLine, RiInformationLine, RiPlayLine, RiRocketLine, RiScales3Line, RiStopLine } from '@remixicon/react'
import type { OllamaModel, OllamaStatus } from '../../../../../electron/preload'
import { aiSettingsStore } from '~/lib/ai/settings-store'
import { useStore } from '@tanstack/react-store'

const MODEL_PROFILES = {
  performant: {
    name: 'qwen2.5-coder:14b-instruct-q4_K_M',
    label: 'Performant',
    description: 'Meilleure qualité, génération plus précise',
    size: '~8.5 GB',
    icon: RiRocketLine,
    recommended: 'RAM ≥ 16 GB',
  },
  balanced: {
    name: 'qwen2.5-coder:7b-instruct-q4_K_M',
    label: 'Équilibré',
    description: 'Bon équilibre qualité/vitesse',
    size: '~4.7 GB',
    icon: RiScales3Line,
    recommended: 'RAM ≥ 8 GB (Recommandé)',
  },
  fast: {
    name: 'qwen2.5-coder:3b-instruct-q4_K_M',
    label: 'Rapide',
    description: 'Plus rapide, consomme moins de ressources',
    size: '~2.0 GB',
    icon: RiFlashlightLine,
    recommended: 'RAM ≥ 4 GB',
  },
} as const

type ModelProfile = keyof typeof MODEL_PROFILES

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function LocalAIDialog({ open, onOpenChange }: Props) {
  const [status, setStatus] = useState<OllamaStatus | null>(null)
  const [models, setModels] = useState<OllamaModel[]>([])
  const [loading, setLoading] = useState(false)
  const [pulling, setPulling] = useState(false)
  const [installing, setInstalling] = useState(false)
  const [installProgress, setInstallProgress] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [selectedProfile, setSelectedProfile] = useState<ModelProfile>('balanced')

  const useLocalAI = useStore(aiSettingsStore, state => state.useLocalAI)
  const savedProfile = useStore(aiSettingsStore, state => state.selectedModelProfile)

  useEffect(() => {
    setSelectedProfile(savedProfile)
  }, [savedProfile])

  const refreshStatus = async () => {
    if (!window.electron) return

    try {
      setLoading(true)
      const newStatus = await window.electron.ollama.status()
      setStatus(newStatus)

      if (newStatus.running) {
        const modelsList = await window.electron.ollama.listModels()
        setModels(modelsList)
      }
    }
    catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check Ollama status')
    }
    finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open) {
      refreshStatus()
    }
  }, [open])

  const handleStart = async () => {
    if (!window.electron) return

    try {
      setLoading(true)
      setError(null)
      await window.electron.ollama.start()
      await refreshStatus()
    }
    catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start Ollama')
    }
    finally {
      setLoading(false)
    }
  }

  const handleStop = async () => {
    if (!window.electron) return

    try {
      setLoading(true)
      setError(null)
      await window.electron.ollama.stop()
      await refreshStatus()
    }
    catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to stop Ollama')
    }
    finally {
      setLoading(false)
    }
  }

  const handlePullModel = async () => {
    if (!window.electron) return

    try {
      setPulling(true)
      setError(null)

      // S'assurer qu'Ollama tourne
      if (!status?.running) {
        await window.electron.ollama.start()
      }

      const modelName = MODEL_PROFILES[selectedProfile].name
      await window.electron.ollama.pullModel({ modelName })

      // Sauvegarder le profil sélectionné
      aiSettingsStore.setState(state => ({
        ...state,
        selectedModelProfile: selectedProfile,
        defaultLocalModel: modelName,
      }))

      await refreshStatus()
    }
    catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to pull model')
    }
    finally {
      setPulling(false)
    }
  }

  const handleDeleteModel = async (modelName: string) => {
    if (!window.electron) return

    try {
      setLoading(true)
      setError(null)
      await window.electron.ollama.deleteModel({ modelName })
      await refreshStatus()
    }
    catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete model')
    }
    finally {
      setLoading(false)
    }
  }

  const handleToggleLocalAI = (enabled: boolean) => {
    aiSettingsStore.setState(state => ({
      ...state,
      useLocalAI: enabled,
      aiProvider: enabled ? 'local-ollama' : 'user-keys',
    }))
  }

  const handleAutoInstall = async () => {
    if (!window.electron) return

    try {
      setInstalling(true)
      setInstallProgress('Initialisation...')
      setError(null)

      // Lancer l'installation
      await window.electron.ollama.autoInstall()

      setInstallProgress('Vérification de l\'installation...')

      // Rafraîchir le statut plusieurs fois pour être sûr
      await new Promise(resolve => setTimeout(resolve, 1000))
      await refreshStatus()

      // Si toujours pas détecté, réessayer
      const newStatus = await window.electron.ollama.status()
      if (!newStatus.installed) {
        await new Promise(resolve => setTimeout(resolve, 2000))
        await refreshStatus()
      }

      setInstallProgress('Terminé!')

      // Afficher un toast de succès
      setTimeout(() => {
        setInstallProgress('')
      }, 2000)
    }
    catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to install Ollama')
    }
    finally {
      setInstalling(false)
    }
  }

  const selectedModel = MODEL_PROFILES[selectedProfile]
  const hasSelectedModel = models.some(m => m.name === selectedModel.name)
  const installedModels = Object.entries(MODEL_PROFILES).filter(([_, profile]) =>
    models.some(m => m.name === profile.name),
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Local AI (Ollama)</DialogTitle>
          <DialogDescription>
            Gérer l'inférence locale avec Ollama et le modèle Qwen2.5-Coder
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-6 p-1">
            {error && (
              <Alert variant="destructive">
                <RiCloseLine className="size-4" />
                <AlertTitle>Erreur</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Status Section */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium">État du service</h3>
              <div className="rounded-lg border p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Ollama installé</span>
                  <div className="flex items-center gap-2">
                    {status?.installed ? (
                      <>
                        <RiCheckLine className="size-4 text-green-500" />
                        <span className="text-sm">{status.version || 'Oui'}</span>
                      </>
                    ) : (
                      <>
                        <RiCloseLine className="size-4 text-destructive" />
                        <span className="text-sm">Non installé</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Service actif</span>
                  <div className="flex items-center gap-2">
                    {status?.running ? (
                      <>
                        <RiCheckLine className="size-4 text-green-500" />
                        <span className="text-sm">En cours</span>
                      </>
                    ) : (
                      <>
                        <RiCloseLine className="size-4 text-muted-foreground" />
                        <span className="text-sm">Arrêté</span>
                      </>
                    )}
                  </div>
                </div>

                {!status?.installed && (
                  <Alert>
                    <RiInformationLine className="size-4" />
                    <AlertTitle>Installation requise</AlertTitle>
                    <AlertDescription className="space-y-3">
                      <p>
                        Ollama n'est pas installé sur votre système.
                      </p>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={handleAutoInstall}
                          disabled={installing}
                        >
                          <LoadingContent loading={installing}>
                            <RiDownloadLine className="size-4" />
                            Installation auto
                          </LoadingContent>
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open('https://ollama.com/download', '_blank')}
                        >
                          Installation manuelle
                        </Button>
                      </div>
                      {installing && (
                        <Alert>
                          <RiDownloadLine className="size-4 animate-pulse" />
                          <AlertDescription>
                            <div className="space-y-2">
                              <p className="font-medium">Installation en cours...</p>
                              {installProgress && (
                                <p className="text-xs text-muted-foreground">
                                  {installProgress}
                                </p>
                              )}
                              <p className="text-xs text-muted-foreground">
                                Cela peut prendre 2-3 minutes. Consultez les logs dans la console Electron pour plus de détails.
                              </p>
                            </div>
                          </AlertDescription>
                        </Alert>
                      )}
                    </AlertDescription>
                  </Alert>
                )}

                {status?.installed && (
                  <div className="flex gap-2 pt-2">
                    {!status.running ? (
                      <Button
                        size="sm"
                        onClick={handleStart}
                        disabled={loading}
                      >
                        <LoadingContent loading={loading}>
                          <RiPlayLine className="size-4" />
                          Démarrer
                        </LoadingContent>
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleStop}
                        disabled={loading}
                      >
                        <LoadingContent loading={loading}>
                          <RiStopLine className="size-4" />
                          Arrêter
                        </LoadingContent>
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Model Selection & Management */}
            {status?.installed && (
              <div className="space-y-3">
                <h3 className="text-sm font-medium">Sélection du modèle</h3>

                <RadioGroup
                  value={selectedProfile}
                  onValueChange={(value: ModelProfile) => setSelectedProfile(value)}
                  className="space-y-2"
                >
                  {Object.entries(MODEL_PROFILES).map(([key, profile]) => {
                    const Icon = profile.icon
                    const isInstalled = models.some(m => m.name === profile.name)

                    return (
                      <div
                        key={key}
                        className="flex items-start space-x-3 rounded-lg border p-4 hover:bg-accent/50 transition-colors"
                      >
                        <RadioGroupItem value={key} id={key} className="mt-1" />
                        <div className="flex-1 space-y-1">
                          <Label
                            htmlFor={key}
                            className="flex items-center gap-2 font-medium cursor-pointer"
                          >
                            <Icon className="size-4" />
                            {profile.label}
                            {isInstalled && (
                              <RiCheckLine className="size-4 text-green-500" />
                            )}
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            {profile.description}
                          </p>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>Taille: {profile.size}</span>
                            <span>•</span>
                            <span>{profile.recommended}</span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </RadioGroup>

                <div className="rounded-lg border p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{selectedModel.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {selectedModel.description}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {hasSelectedModel ? (
                        <>
                          <RiCheckLine className="size-4 text-green-500" />
                          <span className="text-xs text-muted-foreground">Installé</span>
                        </>
                      ) : (
                        <>
                          <RiCloseLine className="size-4 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">Non installé</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {!hasSelectedModel ? (
                      <Button
                        size="sm"
                        onClick={handlePullModel}
                        disabled={pulling || loading}
                      >
                        <LoadingContent loading={pulling}>
                          <RiDownloadLine className="size-4" />
                          Télécharger {selectedModel.label}
                        </LoadingContent>
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeleteModel(selectedModel.name)}
                        disabled={loading}
                      >
                        <LoadingContent loading={loading}>
                          <RiDeleteBin6Line className="size-4" />
                          Supprimer
                        </LoadingContent>
                      </Button>
                    )}
                  </div>

                  {pulling && (
                    <Alert>
                      <RiDownloadLine className="size-4 animate-pulse" />
                      <AlertDescription>
                        Téléchargement de {selectedModel.label} ({selectedModel.size})... Cela peut prendre plusieurs minutes.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </div>
            )}

            {/* Other Models */}
            {models.length > 0 && installedModels.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-medium">Modèles installés ({installedModels.length})</h3>
                <div className="rounded-lg border divide-y">
                  {installedModels.map(([_key, profile]) => {
                    const model = models.find(m => m.name === profile.name)
                    if (!model) return null

                    return (
                      <div key={model.name} className="flex items-center justify-between p-3">
                        <div className="flex items-center gap-2">
                          <profile.icon className="size-4" />
                          <div>
                            <p className="text-sm font-medium">{profile.label}</p>
                            <p className="text-xs text-muted-foreground">
                              {(model.size / 1024 / 1024 / 1024).toFixed(2)} GB
                            </p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteModel(model.name)}
                          disabled={loading}
                        >
                          <RiDeleteBin6Line className="size-4" />
                        </Button>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Enable Local AI */}
            {status?.installed && installedModels.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-medium">Activation</h3>
                <div className="rounded-lg border p-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="use-local-ai">Utiliser l'IA locale</Label>
                      <p className="text-xs text-muted-foreground">
                        Basculer vers l'inférence locale avec Ollama ({selectedModel.label})
                      </p>
                    </div>
                    <Switch
                      id="use-local-ai"
                      checked={useLocalAI}
                      onCheckedChange={handleToggleLocalAI}
                      disabled={!hasSelectedModel}
                    />
                  </div>
                  {!hasSelectedModel && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Téléchargez d'abord le modèle sélectionné pour activer l'IA locale
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}

