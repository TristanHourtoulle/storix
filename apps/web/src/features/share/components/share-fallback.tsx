import { useState } from 'react'
import { Button, buttonClassName } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
import { hasFinePointer } from '../share-actions'
import { useCopyText } from '../use-copy-text'
import type { ShareImage } from '../use-share-images'

interface ShareFallbackProps {
  image: Extract<ShareImage, { status: 'ready' }>
  text: string
  onBack: () => void
}

/** Shown when the browser cannot share a file: the image to long-press, the text to copy, a desktop download. */
export function ShareFallback({ image, text, onBack }: ShareFallbackProps) {
  const [isDesktop] = useState(hasFinePointer)
  const { label, copy } = useCopyText(text)

  return (
    <div className="share-body share-fallback">
      <div className="share-fallback-head">
        <button type="button" className="icon-btn" aria-label="Retour" onClick={onBack}>
          <Icon name="back" className="size-5" />
        </button>
        <h2 className="share-title">Ton image</h2>
        <span className="share-fallback-spacer" aria-hidden="true" />
      </div>
      <img className="share-fallback-image" src={image.url} alt="Image de la carte à envoyer" />
      <p className="share-fallback-text">
        Ce navigateur ne sait pas partager un fichier. Appuie longuement sur l'image pour
        l'enregistrer, puis envoie-la depuis ta galerie.
      </p>
      <Button variant="primary" block sound="none" onClick={copy}>
        <Icon name="copy" className="size-5" />
        {label}
      </Button>
      {isDesktop ? (
        <a
          href={image.url}
          download={image.file.name}
          className={buttonClassName({ variant: 'ghost', block: true })}
        >
          <Icon name="download" className="size-5" />
          Télécharger l'image (ordinateur)
        </a>
      ) : null}
    </div>
  )
}
