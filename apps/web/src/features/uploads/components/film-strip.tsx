import { useEffect, useRef } from 'react'
import type { UploadDraft } from '@storix/shared'
import { CARD_CROP_FRAME } from '@storix/shared/domain'
import { CroppedImage } from '@/components/crop/cropped-image'
import { Icon } from '@/components/ui/icon'
import type { Shot } from '../camera/use-shot-strip'

interface FilmStripProps {
  drafts: readonly UploadDraft[]
  shots: readonly Shot[]
  onRemove: (id: string) => void
}

const TILE = 'relative block aspect-[63/88] w-11 flex-none rounded-thumb'

function DraftTile({ draft, index }: { draft: UploadDraft; index: number }) {
  const { media } = draft
  const src = media?.image.webp[0]?.url
  return (
    <span
      role="img"
      aria-label={`Brouillon, carte ${index}`}
      className={`${TILE} overflow-hidden bg-surface-2 ring-2 ring-tier-legendary`}
    >
      {media && src ? (
        <CroppedImage
          src={src}
          image={media.image}
          imageSize={{ width: media.width, height: media.height }}
          crop={draft.crop}
          frame={CARD_CROP_FRAME}
          sizes="44px"
          className="absolute inset-0 size-full"
        />
      ) : null}
    </span>
  )
}

function ShotTile({ shot, index, onRemove }: { shot: Shot; index: number; onRemove: () => void }) {
  const placeholder = shot.hasThumbFailed ? 'bg-surface-2' : 'animate-pulse bg-surface-2'
  return (
    <span className={TILE}>
      <span
        role="img"
        aria-label={`Prise ${index}`}
        className="absolute inset-0 overflow-hidden rounded-thumb"
      >
        {shot.thumbUrl ? (
          <img src={shot.thumbUrl} alt="" className="size-full object-cover" />
        ) : (
          <span className={`block size-full ${placeholder}`} />
        )}
      </span>
      <button
        type="button"
        aria-label={`Retirer la prise ${index}`}
        onClick={onRemove}
        className="absolute right-0 top-0 -mr-3 -mt-3 grid cursor-pointer appearance-none place-items-center border-0 bg-transparent p-1.5 text-ink"
      >
        <span className="grid size-5 place-items-center rounded-full bg-bg/85 shadow-hairline-strong">
          <Icon name="close" className="size-3" />
        </span>
      </button>
    </span>
  )
}

/** "Pellicule": the drafts first, with a gold ring, then the shots in shot order. */
export function FilmStrip({ drafts, shots, onRemove }: FilmStripProps) {
  const lastRef = useRef<HTMLDivElement>(null)
  const countRef = useRef(shots.length)

  useEffect(() => {
    if (shots.length > countRef.current) {
      lastRef.current?.scrollIntoView({ inline: 'end', block: 'nearest' })
    }
    countRef.current = shots.length
  }, [shots.length])

  const isEmpty = drafts.length === 0 && shots.length === 0

  return (
    <section
      aria-label="Pellicule"
      className="-mx-4 flex min-h-[84px] flex-none items-center gap-2 overflow-x-auto px-4 py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {isEmpty ? (
        <span className="text-xs text-faint">Tes prises s&apos;aligneront ici.</span>
      ) : null}
      {drafts.map((draft, index) => (
        <DraftTile key={draft.uploadId} draft={draft} index={index + 1} />
      ))}
      {shots.map((shot, index) => (
        <div
          key={shot.id}
          ref={index === shots.length - 1 ? lastRef : undefined}
          className="flex-none"
        >
          <ShotTile shot={shot} index={index + 1} onRemove={() => onRemove(shot.id)} />
        </div>
      ))}
    </section>
  )
}
