import { useState } from 'react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@conar/ui/components/dropdown-menu'
import { RiKey2Line, RiLogoutCircleRLine, RiRobotLine } from '@remixicon/react'
import { ApiKeysDialog } from '~/routes/(protected)/_protected/-components/api-keys-dialog'
import { LocalAIDialog } from '~/routes/(protected)/_protected/-components/local-ai-dialog'
import { useSignOut } from '../hooks/use-sign-out'
import { UserAvatar } from './user-avatar'

export function UserButton() {
  const { data, signOut, isSigningOut } = useSignOut()
  const [apiKeysDialogOpen, setApiKeysDialogOpen] = useState(false)
  const [localAIDialogOpen, setLocalAIDialogOpen] = useState(false)

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger className="cursor-pointer rounded-md size-8">
          <UserAvatar className="size-full" />
        </DropdownMenuTrigger>
        <DropdownMenuContent className="min-w-56" side="right" align="end">
          <div className="flex items-center gap-2 h-10 px-2 mt-1 mb-2">
            <UserAvatar className="size-8" />
            <div className="flex flex-col leading-0">
              <span className="text-sm font-medium">
                {data?.user.name}
              </span>
              <span className="text-xs text-muted-foreground">
                {data?.user.email}
              </span>
            </div>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setLocalAIDialogOpen(true)}>
            <RiRobotLine />
            Local AI
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setApiKeysDialogOpen(true)}>
            <RiKey2Line />
            API Keys
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={isSigningOut}
            onClick={() => signOut()}
          >
            <RiLogoutCircleRLine />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

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
