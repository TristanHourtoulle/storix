import { useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Icon } from '@/components/ui/icon'

interface CloseUploadButtonProps {
  leagueId: string
  isRunning: boolean
}

export function CloseUploadButton({ leagueId, isRunning }: CloseUploadButtonProps) {
  const [isConfirming, setIsConfirming] = useState(false)
  const navigate = useNavigate()

  if (!isRunning) {
    return (
      <Link
        to="/l/$leagueId/collection"
        params={{ leagueId }}
        aria-label="Fermer"
        className="icon-btn"
      >
        <Icon name="close" className="size-5" />
      </Link>
    )
  }

  return (
    <>
      <button
        type="button"
        aria-label="Fermer"
        className="icon-btn"
        onClick={() => setIsConfirming(true)}
      >
        <Icon name="close" className="size-5" />
      </button>
      <Dialog
        open={isConfirming}
        title="Quitter la création ?"
        onClose={() => setIsConfirming(false)}
      >
        <p className="m-0 text-sm leading-snug text-muted">
          Des cartes sont en cours de création. Si tu quittes maintenant, les photos pas encore
          envoyées seront perdues.
        </p>
        <div className="flex gap-2">
          <Button variant="ghost" className="flex-1" onClick={() => setIsConfirming(false)}>
            Rester
          </Button>
          <Button
            variant="primary"
            className="flex-1"
            onClick={() => void navigate({ to: '/l/$leagueId/collection', params: { leagueId } })}
          >
            Quitter
          </Button>
        </div>
      </Dialog>
    </>
  )
}
