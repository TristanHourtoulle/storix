import { Link } from '@tanstack/react-router'
import { Button, buttonClassName } from '@/components/ui/button'
import { Notice } from '@/components/ui/notice'
import { useAcceptInvitation } from '../use-accept-invitation'

interface JoinActionsProps {
  token: string
  isMember: boolean
}

export function JoinActions({ token, isMember }: JoinActionsProps) {
  const { accept, isPending, errorMessage } = useAcceptInvitation(token)

  if (isMember) {
    return (
      <Link to="/" className={buttonClassName({ variant: 'primary', block: true })}>
        Ouvrir la ligue
      </Link>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {errorMessage ? <Notice tone="error">{errorMessage}</Notice> : null}
      <Button variant="primary" block isLoading={isPending} onClick={accept}>
        Rejoindre la ligue
      </Button>
    </div>
  )
}
