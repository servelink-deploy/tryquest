import { Button } from '@conar/ui/components/button'
import { useStore } from '@tanstack/react-store'
import { RiKey2Line, RiQuestionAnswerLine, RiRobotLine } from '@remixicon/react'
import { useState } from 'react'
import { aiSettingsStore } from '~/lib/ai/settings-store'
import { LocalAIDialog } from '~/routes/(protected)/_protected/-components/local-ai-dialog'
import { ApiKeysDialog } from '~/routes/(protected)/_protected/-components/api-keys-dialog'


export function ChatPlaceholder() {
  const useLocalAI = useStore(aiSettingsStore, state => state.useLocalAI)
  const [localAIDialogOpen, setLocalAIDialogOpen] = useState(false)
  const [apiKeysDialogOpen, setApiKeysDialogOpen] = useState(false)

  return (
    <>
      <div className="pointer-events-none absolute z-10 inset-0 flex justify-center items-center px-6 pb-[15vh]">
        <div className="pointer-events-auto text-center text-balance max-w-md">
          <RiQuestionAnswerLine className="mx-auto mb-2 size-8" />
          <p className="text-sm mb-4">Ask AI to generate SQL queries</p>
          
          {!useLocalAI && (
            <div className="mb-4 p-4 bg-muted/50 rounded-lg border border-border">
              <p className="text-xs text-muted-foreground mb-3">
                Pour utiliser l'IA, configurez :
              </p>
              <div className="flex gap-2 justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setLocalAIDialogOpen(true)}
                >
                  <RiRobotLine className="size-4" />
                  Local AI (Ollama)
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setApiKeysDialogOpen(true)}
                >
                  <RiKey2Line className="size-4" />
                  Clés API
                </Button>
              </div>
            </div>
          )}

          <p className="mt-2 text-xs text-muted-foreground">
            Try asking for
            {' '}
            <span className="font-mono">SELECT</span>
            {' '}
            queries to fetch data,
            {' '}
            <span className="font-mono">INSERT</span>
            {' '}
            statements to add records,
            {' '}
            <span className="font-mono">UPDATE</span>
            {' '}
            to modify existing data, or complex
            {' '}
            <span className="font-mono">JOIN</span>
            s across multiple tables.
          </p>
        </div>
      </div>

      <LocalAIDialog
        open={localAIDialogOpen}
        onOpenChange={setLocalAIDialogOpen}
      />
      <ApiKeysDialog
        open={apiKeysDialogOpen}
        onOpenChange={setApiKeysDialogOpen}
      />
    </>
  )
}
