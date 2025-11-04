import { useState } from 'react'
import { Button } from '@conar/ui/components/button'
import { LoadingContent } from '@conar/ui/components/custom/loading-content'
import { Skeleton } from '@conar/ui/components/skeleton'
import { cn } from '@conar/ui/lib/utils'
import { RiKey2Line, RiLogoutBoxLine, RiRobotLine } from '@remixicon/react'
import { UserAvatar, useSignOut } from '~/entities/user'
import { ApiKeysDialog } from './api-keys-dialog'
import { LocalAIDialog } from './local-ai-dialog'

export function Profile({ className }: { className?: string }) {
  const { data, signOut, isSigningOut } = useSignOut()
  const [apiKeysDialogOpen, setApiKeysDialogOpen] = useState(false)
  const [localAIDialogOpen, setLocalAIDialogOpen] = useState(false)

  return (
    <>
      <div className={cn('flex flex-row items-center justify-between p-6 bg-muted/20 rounded-xl border border-border/50', className)}>
        <div className="flex flex-row items-center gap-6">
          <UserAvatar className="size-20" fallbackClassName="text-2xl" />
          <div>
            {data?.user
              ? (
                <>
                  <h3 className="text-2xl font-semibold">{data.user.name || 'User'}</h3>
                  <p className="text-sm text-muted-foreground">{data.user.email}</p>
                </>
              )
              : (
                <>
                  <div className="space-y-2">
                    <Skeleton className="h-6 w-50 bg-accent/70" />
                    <Skeleton className="h-4 w-32 bg-accent/70" />
                  </div>
                </>
              )}
          </div>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            size="default"
            onClick={() => setLocalAIDialogOpen(true)}
          >
            <RiRobotLine />
            Local AI
          </Button>
          <Button
            variant="outline"
            size="default"
            onClick={() => setApiKeysDialogOpen(true)}
          >
            <RiKey2Line />
            API Keys
          </Button>
          <Button
            variant="outline"
            size="default"
            onClick={() => signOut()}
            disabled={isSigningOut}
          >
            <LoadingContent loading={isSigningOut}>
              <RiLogoutBoxLine />
              Sign out
            </LoadingContent>
          </Button>
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
