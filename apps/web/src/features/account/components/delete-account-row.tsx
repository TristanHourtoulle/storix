import { useState } from 'react'
import type { AccountDeletionPreview, PhotosChoice } from '@storix/shared'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Notice } from '@/components/ui/notice'
import { SettingsButtonRow } from '@/components/ui/settings-list'
import { useAccountDeletion } from '../use-account-deletion'
import { DeletionSummary } from './deletion-summary'

const LIST_FORMAT = new Intl.ListFormat('fr-FR', { type: 'conjunction' })

interface DeleteAccountRowProps {
  userId: string
  username: string
}

interface DeleteAccountDialogProps extends DeleteAccountRowProps {
  onClose: () => void
}

function canSubmit(
  preview: AccountDeletionPreview | null,
  form: { confirmation: string; password: string; photos: PhotosChoice | null },
  username: string,
): preview is AccountDeletionPreview {
  if (!preview || preview.blocking.length > 0) return false
  if (form.confirmation.trim().toLowerCase() !== username.toLowerCase()) return false
  if (preview.choiceLeagues.length > 0 && form.photos === null) return false
  return !preview.requiresPassword || form.password.length > 0
}

function DeleteAccountDialog({ userId, username, onClose }: DeleteAccountDialogProps) {
  const deletion = useAccountDeletion(userId, true)
  const [confirmation, setConfirmation] = useState('')
  const [password, setPassword] = useState('')
  const [photos, setPhotos] = useState<PhotosChoice | null>(null)
  const { preview, isPending } = deletion
  const isBlocked = preview !== null && preview.blocking.length > 0
  const isReady = canSubmit(preview, { confirmation, password, photos }, username)

  const submit = () => {
    if (!canSubmit(preview, { confirmation, password, photos }, username)) return
    deletion.deleteAccount({
      confirmUsername: confirmation.trim(),
      photos: photos ?? 'keep',
      ...(preview.requiresPassword ? { password } : {}),
    })
  }

  return (
    <Dialog open title="Supprimer mon compte ?" onClose={onClose} isDismissible={!isPending}>
      {deletion.isPreviewLoading ? <p className="m-0 text-sm text-muted">Chargement…</p> : null}
      {isBlocked ? (
        <Notice tone="error">
          Transfère d'abord : {LIST_FORMAT.format(preview.blocking.map((league) => league.name))}
        </Notice>
      ) : null}
      {preview && !isBlocked ? (
        <>
          <DeletionSummary
            preview={preview}
            photos={photos}
            onPhotosChange={setPhotos}
            isDisabled={isPending}
          />
          <Field label={`Tape ${username} pour confirmer`}>
            <Input
              type="text"
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              value={confirmation}
              disabled={isPending}
              onChange={(event) => setConfirmation(event.target.value)}
            />
          </Field>
          {preview.requiresPassword ? (
            <>
              <Field label="Mot de passe">
                <Input
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  disabled={isPending}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </Field>
              <Button
                variant="ghost"
                block
                disabled={isPending}
                onClick={deletion.reauthWithPasskey}
              >
                Confirmer avec une passkey
              </Button>
            </>
          ) : null}
        </>
      ) : null}
      {deletion.error ? <Notice tone="error">{deletion.error}</Notice> : null}
      <div className="flex gap-2">
        <Button variant="ghost" block disabled={isPending} onClick={onClose}>
          Annuler
        </Button>
        <Button variant="danger" block disabled={!isReady} isLoading={isPending} onClick={submit}>
          Supprimer définitivement
        </Button>
      </div>
    </Dialog>
  )
}

/** "Supprimer mon compte" row of the danger zone, with its confirmation dialog. */
export function DeleteAccountRow({ userId, username }: DeleteAccountRowProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <SettingsButtonRow
      icon="trash"
      label="Supprimer mon compte"
      hint="Toutes tes ligues"
      tone="danger"
      onClick={() => setIsOpen(true)}
    >
      {isOpen ? (
        <DeleteAccountDialog userId={userId} username={username} onClose={() => setIsOpen(false)} />
      ) : null}
    </SettingsButtonRow>
  )
}
