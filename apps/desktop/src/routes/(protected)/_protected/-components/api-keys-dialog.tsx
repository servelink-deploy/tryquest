import { Button } from '@conar/ui/components/button'
import { LoadingContent } from '@conar/ui/components/custom/loading-content'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@conar/ui/components/dialog'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@conar/ui/components/form'
import { Input } from '@conar/ui/components/input'
import { Separator } from '@conar/ui/components/separator'
import { zodResolver } from '@hookform/resolvers/zod'
import { RiDeleteBin6Line, RiKey2Line, RiSave3Line } from '@remixicon/react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { orpc } from '~/lib/orpc'

const apiKeysSchema = z.object({
  openaiApiKey: z.string().optional(),
  anthropicApiKey: z.string().optional(),
  googleApiKey: z.string().optional(),
  xaiApiKey: z.string().optional(),
})

type ApiKeysFormData = z.infer<typeof apiKeysSchema>

interface ApiKeysDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ApiKeysDialog({ open, onOpenChange }: ApiKeysDialogProps) {
  const { data: apiKeys, isLoading, refetch } = useQuery({
    queryKey: ['userApiKeys'],
    queryFn: () => orpc.userApiKeys.getUserApiKeys({}),
    enabled: open,
  })

  const form = useForm<ApiKeysFormData>({
    resolver: zodResolver(apiKeysSchema),
    values: {
      openaiApiKey: apiKeys?.openaiApiKey || '',
      anthropicApiKey: apiKeys?.anthropicApiKey || '',
      googleApiKey: apiKeys?.googleApiKey || '',
      xaiApiKey: apiKeys?.xaiApiKey || '',
    },
  })

  const { mutate: updateKeys, isPending: isUpdating } = useMutation({
    mutationFn: (data: ApiKeysFormData) => orpc.userApiKeys.updateUserApiKeys(data),
    onSuccess: () => {
      toast.success('API keys updated successfully')
      refetch()
    },
    onError: (error) => {
      toast.error(`Failed to update API keys: ${error.message}`)
    },
  })

  const { mutate: deleteKeys, isPending: isDeleting } = useMutation({
    mutationFn: () => orpc.userApiKeys.deleteUserApiKeys({}),
    onSuccess: () => {
      toast.success('All API keys deleted')
      form.reset({
        openaiApiKey: '',
        anthropicApiKey: '',
        googleApiKey: '',
        xaiApiKey: '',
      })
      refetch()
    },
    onError: (error) => {
      toast.error(`Failed to delete API keys: ${error.message}`)
    },
  })

  const onSubmit = (data: ApiKeysFormData) => {
    // Convertir les champs vides en undefined
    const cleanedData = Object.fromEntries(
      Object.entries(data).map(([key, value]) => [key, value || undefined]),
    ) as ApiKeysFormData

    updateKeys(cleanedData)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RiKey2Line className="size-5" />
            Configure AI API Keys
          </DialogTitle>
          <DialogDescription>
            Add your own API keys to use specific AI providers. By default, the system will use Gemini for all features if no keys are configured.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="openaiApiKey"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>OpenAI API Key</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="password"
                        placeholder="sk-..."
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormDescription>
                      Used for GPT models (gpt-4o-mini, etc.). Leave empty to fallback to Gemini.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="anthropicApiKey"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Anthropic API Key</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="password"
                        placeholder="sk-ant-..."
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormDescription>
                      Used for Claude models (claude-sonnet-4-5, claude-opus-4-1, etc.). Leave empty to fallback to Gemini.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="googleApiKey"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Google AI API Key</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="password"
                        placeholder="AIza..."
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormDescription>
                      Used for Gemini models (gemini-2.0-flash, etc.). Leave empty to use system key.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="xaiApiKey"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>xAI API Key</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="password"
                        placeholder="xai-..."
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormDescription>
                      Used for Grok models (grok-3-mini, etc.). Leave empty to fallback to Gemini.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator />

            <DialogFooter className="flex justify-between items-center gap-2">
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => deleteKeys()}
                disabled={isDeleting || isLoading}
              >
                <LoadingContent loading={isDeleting}>
                  <RiDeleteBin6Line />
                  Delete All Keys
                </LoadingContent>
              </Button>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isUpdating || isLoading}
                >
                  <LoadingContent loading={isUpdating}>
                    <RiSave3Line />
                    Save Keys
                  </LoadingContent>
                </Button>
              </div>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

