import { CARD_TITLE_MAX_LENGTH, type MemberSummary } from '@storix/shared'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Icon } from '@/components/ui/icon'
import { Input } from '@/components/ui/input'
import { Notice } from '@/components/ui/notice'
import { CardFace } from '@/features/cards/components/card-face'
import type { PhotoDraft } from '../use-photo-drafts'
import { MemberTagChips } from './member-tag-chips'

interface DraftEditorProps {
  draft: PhotoDraft
  position: number
  total: number
  members: readonly MemberSummary[]
  isLocked: boolean
  onTitleChange: (title: string) => void
  onToggleTag: (userId: string) => void
  onRemove: () => void
}

const dateFormat = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' })

function captureLine(capturedAt: string | null): string {
  return capturedAt
    ? `Prise le ${dateFormat.format(new Date(capturedAt))}`
    : 'Date de prise inconnue'
}

export function DraftEditor({
  draft,
  position,
  total,
  members,
  isLocked,
  onTitleChange,
  onToggleTag,
  onRemove,
}: DraftEditorProps) {
  const isEditable = !isLocked && draft.phase === 'ready'

  return (
    <section className="flex flex-col gap-4">
      {draft.phase === 'error' && draft.errorMessage ? (
        <Notice tone="error">{draft.errorMessage}</Notice>
      ) : null}
      <div className="flex items-start gap-3.5">
        <CardFace
          size="md"
          title={draft.title.trim() || 'Sans titre'}
          tier="common"
          isProvisional={false}
        >
          {draft.photo ? (
            <img src={draft.photo.previewUrl} alt="" className="size-full object-cover" />
          ) : null}
        </CardFace>
        <div className="flex min-w-0 flex-1 flex-col">
          <Field
            label={`Titre de la carte · ${position} / ${total}`}
            hint={`${draft.title.length} / ${CARD_TITLE_MAX_LENGTH}`}
          >
            <Input
              type="text"
              value={draft.title}
              maxLength={CARD_TITLE_MAX_LENGTH}
              placeholder="Raclette chez Tom"
              disabled={!isEditable}
              onChange={(event) => onTitleChange(event.currentTarget.value)}
            />
          </Field>
          <div className="mt-2 flex items-center gap-2 rounded-input bg-tier-rare/12 px-3 py-2.5 font-display text-[13px] font-semibold text-info">
            <Icon name="dust" className="size-4 flex-none" />
            Rareté calculée à la création
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-xs uppercase tracking-[0.06em] text-muted">
          Qui est sur la photo ?
        </span>
        <MemberTagChips
          members={members}
          selectedIds={draft.taggedUserIds}
          isDisabled={!isEditable}
          onToggle={onToggleTag}
        />
      </div>
      <div className="flex flex-col gap-2.5">
        <p className="m-0 flex items-center gap-2.5 text-[13px] text-ink-3">
          <Icon name="calendar" className="size-[18px] flex-none text-muted" />
          {captureLine(draft.photo?.capturedAt ?? null)}
        </p>
        <p className="m-0 flex items-center gap-2.5 text-[13px] text-ink-3">
          <Icon name="shield" className="size-[18px] flex-none text-muted" />
          Position GPS supprimée avant l'envoi
        </p>
      </div>
      {!isLocked ? (
        <Button
          variant="ghost"
          className="!h-10 self-start !px-3 !text-sm"
          disabled={draft.phase === 'preparing'}
          onClick={onRemove}
        >
          Retirer cette photo
        </Button>
      ) : null}
    </section>
  )
}
