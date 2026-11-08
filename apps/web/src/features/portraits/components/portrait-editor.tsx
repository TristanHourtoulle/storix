import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react'
import { useBlocker, type ShouldBlockFn } from '@tanstack/react-router'
import { AVATAR_CROP_FRAME, type CropRect } from '@storix/shared/domain'
import type { Portrait } from '@storix/shared'
import { CropEditor } from '@/components/crop/crop-editor'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Notice } from '@/components/ui/notice'
import { userMessage } from '@/features/errors/user-message'
import { LeagueAvatar } from '@/features/leagues/components/league-avatar'
import { preparePhoto, type PreparedPhoto } from '@/features/uploads/prepare-photo'
import { logger } from '@/lib/logger'
import { cropToSquareJpeg } from '../crop-to-jpeg'
import type { PortraitTarget } from '../portrait-target'
import { usePortraitUpload } from '../use-portrait-upload'
import { useRemovePortrait } from '../use-remove-portrait'

interface PortraitEditorProps {
  target: PortraitTarget
  current: Portrait | null
  fallbackLabel: string
  shape: 'circle' | 'rounded'
  cropSubtitle: string
  removeTitle: string
  removeBody: string
}

type LastAction = 'upload' | 'remove' | null

const UPLOAD_STATUS = {
  sending: 'Envoi…',
  processing: 'Traitement…',
  done: 'Photo mise à jour.',
} as const

/** Shows a portrait and lets the user pick, crop, replace or remove it. */
export function PortraitEditor({
  target,
  current,
  fallbackLabel,
  shape,
  cropSubtitle,
  removeTitle,
  removeBody,
}: PortraitEditorProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [photo, setPhoto] = useState<PreparedPhoto | null>(null)
  const [isPreparing, setIsPreparing] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const [lastAction, setLastAction] = useState<LastAction>(null)
  const uploader = usePortraitUpload(target, current)
  const remover = useRemovePortrait(target, current)
  const photoRef = useRef(photo)
  const isConfirmingRef = useRef(false)

  useEffect(() => {
    photoRef.current = photo
  })

  const closeEditor = useCallback((): void => {
    const open = photoRef.current
    if (open) URL.revokeObjectURL(open.previewUrl)
    photoRef.current = null
    setPhoto(null)
  }, [])

  useEffect(() => () => closeEditor(), [closeEditor])

  const shouldBlockFn = useCallback<ShouldBlockFn>(() => {
    if (photoRef.current === null) return false
    closeEditor()
    return true
  }, [closeEditor])
  useBlocker({ shouldBlockFn, enableBeforeUnload: false })

  async function handleFile(event: ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setLocalError(null)
    setLastAction(null)
    uploader.reset()
    setIsPreparing(true)
    try {
      setPhoto(await preparePhoto(file))
    } catch (error) {
      logger.warn('Portrait photo could not be prepared', { error })
      setLocalError(userMessage(error))
    } finally {
      setIsPreparing(false)
    }
  }

  async function handleConfirm(rect: CropRect | null): Promise<void> {
    const picked = photoRef.current
    if (!picked || isConfirmingRef.current) return
    isConfirmingRef.current = true
    setLastAction('upload')
    setIsPreparing(true)
    try {
      const blob = await cropToSquareJpeg(picked, rect)
      uploader.upload(blob)
    } catch (error) {
      logger.warn('Portrait crop failed', { error })
      setLocalError(userMessage(error))
    } finally {
      isConfirmingRef.current = false
      setIsPreparing(false)
      closeEditor()
    }
  }

  function confirmRemove(): void {
    setIsConfirmOpen(false)
    setLocalError(null)
    setLastAction('remove')
    uploader.reset()
    remover.remove()
  }

  const isUploading = uploader.phase === 'sending' || uploader.phase === 'processing'
  const isBusy = isPreparing || isUploading || remover.isPending
  const status =
    lastAction === 'upload' && uploader.phase !== 'idle' && uploader.phase !== 'error'
      ? UPLOAD_STATUS[uploader.phase]
      : lastAction === 'upload' && isPreparing
        ? UPLOAD_STATUS.sending
        : lastAction === 'remove' && remover.isSuccess
          ? 'Photo retirée.'
          : null
  const errorMessage =
    localError ??
    (lastAction === 'upload' ? uploader.errorMessage : null) ??
    (lastAction === 'remove' ? remover.errorMessage : null)

  return (
    <section className="flex flex-col items-center gap-4">
      {shape === 'circle' ? (
        <Avatar label={fallbackLabel} portrait={current} size="xl" />
      ) : (
        <LeagueAvatar name={fallbackLabel} photo={current} size="xl" />
      )}
      <p aria-live="polite" className="m-0 min-h-5 text-sm text-muted">
        {status}
      </p>
      {errorMessage ? (
        <div className="w-full">
          <Notice tone="error">{errorMessage}</Notice>
        </div>
      ) : null}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        tabIndex={-1}
        aria-hidden="true"
        className="sr-only"
        onChange={(event) => void handleFile(event)}
      />
      <div className="flex w-full flex-col gap-2">
        <Button
          variant="primary"
          block
          className="!h-11"
          isLoading={isPreparing || isUploading}
          disabled={isBusy}
          onClick={() => inputRef.current?.click()}
        >
          {current ? 'Changer la photo' : 'Choisir une photo'}
        </Button>
        {current ? (
          <Button
            variant="ghost"
            block
            className="!h-11 !text-danger"
            isLoading={remover.isPending}
            disabled={isBusy}
            onClick={() => setIsConfirmOpen(true)}
          >
            Retirer la photo
          </Button>
        ) : null}
      </div>
      <Dialog open={isConfirmOpen} title={removeTitle} onClose={() => setIsConfirmOpen(false)}>
        <p className="m-0 text-sm leading-snug text-muted">{removeBody}</p>
        <div className="flex gap-2">
          <Button variant="ghost" block onClick={() => setIsConfirmOpen(false)}>
            Annuler
          </Button>
          <Button variant="danger" block onClick={confirmRemove}>
            Retirer
          </Button>
        </div>
      </Dialog>
      {photo ? (
        <CropEditor
          imageUrl={photo.previewUrl}
          imageSize={{ width: photo.width, height: photo.height }}
          frame={AVATAR_CROP_FRAME}
          value={null}
          title="Recadrer"
          subtitle={cropSubtitle}
          shape={shape === 'circle' ? 'circle' : 'rect'}
          allowRotate={false}
          confirmLabel="Valider"
          onCancel={closeEditor}
          onConfirm={(rect) => void handleConfirm(rect)}
        />
      ) : null}
    </section>
  )
}
