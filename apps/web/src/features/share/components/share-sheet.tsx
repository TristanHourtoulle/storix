import { useId, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { shareText } from '@storix/shared'
import { useModalLayer } from '@/components/crop/use-modal-layer'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
import '@/styles/share-sheet.css'
import { canShareFiles, downloadImage, hasFinePointer, shareFile } from '../share-actions'
import { readShareStyle, writeShareStyle } from '../share-style'
import { availableStyles, type ShareStyle, type ShareSubject } from '../share-subject'
import { useCopyText } from '../use-copy-text'
import { useShareImages, type ShareImage } from '../use-share-images'
import { ShareFallback } from './share-fallback'

interface ShareSheetProps {
  subject: ShareSubject
  onClose: () => void
}

const PENDING: ShareImage = { status: 'pending' }
const PRIMARY_LABEL: Readonly<Record<ShareImage['status'], string>> = {
  pending: 'Préparation…',
  ready: 'Partager',
  failed: 'Image indisponible',
}

function tileCopy(style: ShareStyle, subject: ShareSubject): { title: string; sub: string } {
  if (style === 'card') return { title: 'Carte', sub: '4:5' }
  if (style === 'flex') return { title: 'Flex', sub: '4:5' }
  return { title: 'Booster entier', sub: `${subject.pack?.length ?? 0} cartes` }
}

function logoBoxData(image: Extract<ShareImage, { status: 'ready' }>): string {
  const { left, top, width, height } = image.logoBox
  return `${left},${top},${width},${height}`
}

/** Storix options sheet: pick the image style, then hand the PNG to the system share sheet. */
export function ShareSheet({ subject, onClose }: ShareSheetProps) {
  const { container, layerRef } = useModalLayer(onClose)
  const styles = useMemo(() => availableStyles(subject), [subject])
  const [chosen, setChosen] = useState<ShareStyle>(() => readShareStyle(styles))
  const style = styles.includes(chosen) ? chosen : readShareStyle(styles)
  const images = useShareImages(subject, styles, style)
  const [hasMessage, setHasMessage] = useState(true)
  const [isFallback, setIsFallback] = useState(false)
  const text = shareText(subject.card.facts, subject.origin)
  const { label: copyLabel, copy } = useCopyText(text)
  const switchLabelId = useId()
  const selected = images[style] ?? PENDING
  const isShareInFlight = useRef(false)

  function runShare(file: File, message: string | null, onShared: () => void): void {
    if (isShareInFlight.current) return
    isShareInFlight.current = true
    void shareFile(file, message).then((outcome) => {
      isShareInFlight.current = false
      if (outcome === 'shared') onShared()
      else if (outcome === 'failed') setIsFallback(true)
    })
  }

  function choose(next: ShareStyle): void {
    setChosen(next)
    writeShareStyle(next)
  }

  function share(): void {
    if (selected.status !== 'ready') return
    if (!canShareFiles(selected.file)) {
      setIsFallback(true)
      return
    }
    runShare(selected.file, hasMessage ? text : null, onClose)
  }

  function save(): void {
    if (selected.status !== 'ready') return
    if (hasFinePointer()) {
      downloadImage(selected.url, selected.file.name)
      return
    }
    if (!canShareFiles(selected.file)) {
      setIsFallback(true)
      return
    }
    runShare(selected.file, null, () => undefined)
  }

  return createPortal(
    <div
      ref={layerRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label="Partager"
      className="share-layer"
    >
      <button
        type="button"
        className="share-scrim"
        aria-label="Fermer"
        tabIndex={-1}
        onClick={onClose}
      />
      <div className="share-sheet">
        <span className="share-grab" aria-hidden="true" />
        {isFallback && selected.status === 'ready' ? (
          <ShareFallback image={selected} text={text} onBack={() => setIsFallback(false)} />
        ) : (
          <div className="share-body">
            <div className="share-head">
              <h2 className="share-title">Partager</h2>
              <span className="share-faint">Image PNG</span>
            </div>
            <div className="share-tiles">
              {styles.map((tileStyle) => {
                const image = images[tileStyle] ?? PENDING
                const { title, sub } = tileCopy(tileStyle, subject)
                return (
                  <button
                    key={tileStyle}
                    type="button"
                    className="share-tile"
                    aria-pressed={tileStyle === style}
                    onClick={() => choose(tileStyle)}
                  >
                    {image.status === 'ready' ? (
                      <img src={image.url} alt="" data-logo-box={logoBoxData(image)} />
                    ) : (
                      <span
                        className={`share-skeleton${image.status === 'failed' ? ' is-failed' : ''}`}
                      />
                    )}
                    <b>{title}</b>
                    <span>{sub}</span>
                  </button>
                )
              })}
            </div>
            <div className="share-toggle">
              <span id={switchLabelId}>Ajouter un message</span>
              <button
                type="button"
                role="switch"
                className="share-switch"
                aria-checked={hasMessage}
                aria-labelledby={switchLabelId}
                onClick={() => setHasMessage((value) => !value)}
              />
            </div>
            {hasMessage ? <p className="share-message">{text}</p> : null}
            <Button
              variant="primary"
              block
              sound="none"
              disabled={selected.status !== 'ready'}
              onClick={share}
            >
              <Icon name="share" className="size-5" />
              {PRIMARY_LABEL[selected.status]}
            </Button>
            <div className="share-row">
              <Button
                variant="ghost"
                sound="none"
                disabled={selected.status !== 'ready'}
                onClick={save}
              >
                <Icon name="download" className="size-4" />
                Enregistrer l'image
              </Button>
              <Button variant="ghost" sound="none" onClick={copy}>
                <Icon name="copy" className="size-4" />
                {copyLabel}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>,
    container,
  )
}
