import type { MemberSummary } from '@storix/shared'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Notice } from '@/components/ui/notice'
import { CopyButton } from '@/components/ui/copy-button'
import { useIssueResetCode } from '../use-issue-reset-code'

interface ResetCodeDialogProps {
  leagueId: string
  member: MemberSummary
  onClose: () => void
}

function formatExpiry(iso: string): string {
  return new Date(iso).toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short' })
}

export function ResetCodeDialog({ leagueId, member, onClose }: ResetCodeDialogProps) {
  const { issue, result, isPending, errorMessage } = useIssueResetCode(leagueId, member.userId)

  return (
    <Dialog
      open
      title={`Code pour ${member.displayUsername}`}
      onClose={onClose}
      isDismissible={!isPending}
    >
      <div role="status" className="text-center empty:-mb-4">
        {result ? (
          <>
            <span className="sr-only">Code de réinitialisation</span>
            <p className="m-0 font-display text-[28px] font-bold tabular-nums tracking-wider">
              {result.code}
            </p>
          </>
        ) : null}
      </div>
      {result ? (
        <>
          <p className="m-0 text-center text-sm text-muted">
            Expire le {formatExpiry(result.expiresAt)}
          </p>
          <CopyButton value={result.code} label="Copier le code" />
          <Notice tone="info">
            Valable 24 h, une seule fois. Transmets-le en main propre : il ne sera plus affiché.
          </Notice>
        </>
      ) : (
        <>
          <p className="m-0 text-sm leading-snug text-muted">
            Génère un code à usage unique pour que {member.displayUsername} choisisse un nouveau mot
            de passe. Un éventuel code précédent sera invalidé.
          </p>
          {errorMessage ? <Notice tone="error">{errorMessage}</Notice> : null}
          <Button variant="primary" block isLoading={isPending} onClick={issue}>
            Générer le code
          </Button>
        </>
      )}
    </Dialog>
  )
}
