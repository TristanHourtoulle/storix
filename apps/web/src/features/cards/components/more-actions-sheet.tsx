import { stackSize, type OwnedCardDetail } from '@storix/shared'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Icon, type IconName } from '@/components/ui/icon'
import { countLabel, foilBlockReason } from '../progression-copy'
import { TIER_LABELS } from '../tier-labels'

type RecycleOption = OwnedCardDetail['actions']['recycle'][number]

export interface TagState {
  isTagged: boolean
  isBusy: boolean
}

export interface RemovableTag {
  userId: string
  name: string
}

interface MoreActionsSheetProps {
  open: boolean
  actions: OwnedCardDetail['actions']
  dust: number | null
  isBusy: boolean
  convertAllDust: number
  onConvert: () => void
  onFoil: () => void
  onRecycle: (option: RecycleOption) => void
  tagState: TagState
  onToggleTag: () => void
  removableTags: readonly RemovableTag[]
  onRemoveTag: (userId: string) => void
  onClose: () => void
}

interface ActionRowProps {
  icon: IconName
  title: string
  sub: string
  value: string | null
  isBlocked: boolean
  isDanger?: boolean
  onSelect: () => void
}

function ActionRow({
  icon,
  title,
  sub,
  value,
  isBlocked,
  isDanger = false,
  onSelect,
}: ActionRowProps) {
  const className = ['arow', isBlocked ? 'off' : '', isDanger ? 'dng' : ''].join(' ').trim()

  return (
    <button
      type="button"
      className={className}
      aria-disabled={isBlocked || undefined}
      onClick={() => {
        if (!isBlocked) onSelect()
      }}
    >
      <span className="ai">
        <Icon name={icon} className="size-[18px]" />
      </span>
      <span className="at">
        <b>{title}</b>
        <span>{sub}</span>
      </span>
      {value === null ? null : <span className="av2">{value}</span>}
    </button>
  )
}

export function MoreActionsSheet({
  open,
  actions,
  dust,
  isBusy,
  convertAllDust,
  onConvert,
  onFoil,
  onRecycle,
  tagState,
  onToggleTag,
  removableTags,
  onRemoveTag,
  onClose,
}: MoreActionsSheetProps) {
  const stackCount = stackSize(actions.stack)
  const foilReason = foilBlockReason(actions.foilUpgrade, dust)
  const isRecycleBlocked = stackCount > 0 && actions.recycle.length === 1

  return (
    <Dialog open={open} title="Plus d'actions" onClose={onClose}>
      <div className="alist">
        <ActionRow
          icon="stack"
          title="Convertir ta pile"
          sub={
            stackCount > 0
              ? `${countLabel(stackCount, 'doublon', 'doublons')} · jusqu'à +${convertAllDust}`
              : 'Pile vide · les doublons viennent des boosters'
          }
          value={stackCount > 0 ? `×${stackCount}` : null}
          isBlocked={isBusy || stackCount === 0}
          onSelect={onConvert}
        />
        <ActionRow
          icon="dust"
          title="Passer en foil"
          sub={foilReason ?? 'Reflet cyan, valeur doublée'}
          value={`${actions.foilUpgrade.cost} ✦`}
          isBlocked={isBusy || foilReason !== null}
          onSelect={onFoil}
        />
        <ActionRow
          icon="profile"
          title="Je suis sur la photo"
          sub={
            tagState.isTagged ? 'Identifié(e) · Retirer' : 'Ajoute-toi aux personnes sur la photo'
          }
          value={tagState.isTagged ? '✓' : null}
          isBlocked={tagState.isBusy}
          onSelect={onToggleTag}
        />
        {removableTags.map((person) => (
          <ActionRow
            key={person.userId}
            icon="profile"
            title={`Retirer ${person.name}`}
            sub="Identifié(e) sur la photo"
            value={null}
            isBlocked={tagState.isBusy}
            onSelect={() => onRemoveTag(person.userId)}
          />
        ))}
        {actions.recycle.map((option) => (
          <ActionRow
            key={option.variant}
            icon="recycle"
            title={option.variant === 'foil' ? 'Recycler la foil' : 'Recycler'}
            sub={
              isRecycleBlocked
                ? "Convertis d'abord ta pile de doublons"
                : option.promotedTier
                  ? `Ta rareté ${TIER_LABELS[option.promotedTier]} ★ sera perdue`
                  : 'Tu pourras la retrouver dans un booster'
            }
            value={`+${option.dust}`}
            isBlocked={isBusy || isRecycleBlocked}
            isDanger
            onSelect={() => onRecycle(option)}
          />
        ))}
      </div>
      <Button variant="ghost" block onClick={onClose}>
        Fermer
      </Button>
    </Dialog>
  )
}
