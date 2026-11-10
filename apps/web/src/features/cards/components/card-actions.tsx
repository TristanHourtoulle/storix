import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import {
  cardProgression,
  planStackTake,
  stackSize,
  type CardTier,
  type ConvertStackBody,
  type CopyVariant,
  type OwnedCardDetail,
} from '@storix/shared'
import { foilBlockReason } from '../progression-copy'
import { CardProgressBar, isMainActionDisabled } from './card-progress-bar'
import { ConvertStackSheet } from './convert-stack-sheet'
import { FoilUpgradeSheet } from './foil-upgrade-sheet'
import { MoreActionsSheet, type TagState } from './more-actions-sheet'
import { PromotionSheet } from './promotion-sheet'
import { RecycleSheet } from './recycle-sheet'

interface CardActionsProps {
  card: OwnedCardDetail
  dust: number | null
  isBusy: boolean
  promoteError: string | null
  convertError: string | null
  foilError: string | null
  onRecycle: (variant: CopyVariant) => void
  onUpgrade: (callbacks: SubmitCallbacks) => void
  onPromote: (from: CardTier, callbacks: SubmitCallbacks) => void
  onConvert: (body: ConvertStackBody, callbacks: SubmitCallbacks) => void
  tagState: TagState
  onToggleTag: () => void
  onSheetOpen: () => void
}

export interface SubmitCallbacks {
  onSuccess: () => void
  onSettled: () => void
}

type Sheet = 'promote' | 'convert' | 'more' | 'foil' | 'recycle' | null
type Origin = 'main' | 'more'
type RecycleOption = OwnedCardDetail['actions']['recycle'][number]

export function CardActions({
  card,
  dust,
  isBusy,
  promoteError,
  convertError,
  foilError,
  onRecycle,
  onUpgrade,
  onPromote,
  onConvert,
  tagState,
  onToggleTag,
  onSheetOpen,
}: CardActionsProps) {
  const { actions } = card
  const [pending, setPending] = useState<RecycleOption | null>(null)
  const [sheet, setSheet] = useState<Sheet>(null)
  const [origin, setOrigin] = useState<Origin>('main')
  const [session, setSession] = useState(0)
  const [convertStartsAtMax, setConvertStartsAtMax] = useState(false)
  const isSubmitting = useRef(false)
  const previousSheet = useRef<Sheet>(null)
  const mainRef = useRef<HTMLButtonElement>(null)
  const moreRef = useRef<HTMLButtonElement>(null)
  const progression = useMemo(
    () => cardProgression({ promotion: actions.promotion, stack: actions.stack, dust }),
    [actions.promotion, actions.stack, dust],
  )
  const convertAllDust = useMemo(
    () => planStackTake(actions.stack, stackSize(actions.stack), 'richest')?.dust ?? 0,
    [actions.stack],
  )
  const close = () => setSheet(null)
  const closeSheet = (which: Exclude<Sheet, null>) => () =>
    setSheet((current) => (current === which ? null : current))

  const isMainDisabled = isMainActionDisabled(progression, isBusy)

  useEffect(() => {
    if (previousSheet.current !== null && sheet === null) {
      const target = origin === 'more' || isMainDisabled ? moreRef : mainRef
      target.current?.focus()
    }
    previousSheet.current = sheet
  }, [sheet, origin, isMainDisabled])

  useLayoutEffect(() => {
    if (isMainDisabled && document.activeElement === mainRef.current) moreRef.current?.focus()
  }, [isMainDisabled])

  function submit(run: (callbacks: SubmitCallbacks) => void) {
    if (isSubmitting.current) return
    isSubmitting.current = true
    run({
      onSuccess: close,
      onSettled: () => {
        isSubmitting.current = false
      },
    })
  }

  function openSheet(next: Exclude<Sheet, null>, from?: Origin) {
    onSheetOpen()
    setSession((value) => value + 1)
    if (from) setOrigin(from)
    setSheet(next)
  }

  function openMain() {
    if (progression.kind === 'max') {
      setConvertStartsAtMax(true)
      openSheet('convert', 'main')
    } else {
      openSheet('promote', 'main')
    }
  }

  function confirmRecycle() {
    if (pending) onRecycle(pending.variant)
    close()
  }

  return (
    <>
      <CardProgressBar
        progression={progression}
        isBusy={isBusy}
        mainRef={mainRef}
        moreRef={moreRef}
        onMain={openMain}
        onMore={() => openSheet('more', 'more')}
      />
      <MoreActionsSheet
        open={sheet === 'more'}
        actions={actions}
        dust={dust}
        isBusy={isBusy}
        convertAllDust={convertAllDust}
        onConvert={() => {
          setConvertStartsAtMax(false)
          openSheet('convert')
        }}
        onFoil={() => openSheet('foil')}
        onRecycle={(option) => {
          setPending(option)
          openSheet('recycle')
        }}
        tagState={tagState}
        onToggleTag={onToggleTag}
        onClose={closeSheet('more')}
      />
      <FoilUpgradeSheet
        open={sheet === 'foil'}
        cost={actions.foilUpgrade.cost}
        normalValue={actions.recycle.find((option) => option.variant === 'normal')?.dust ?? 0}
        canConfirm={dust !== null && foilBlockReason(actions.foilUpgrade, dust) === null}
        isBusy={isBusy}
        error={foilError}
        onConfirm={() => submit(onUpgrade)}
        onClose={closeSheet('foil')}
      />
      <RecycleSheet
        open={sheet === 'recycle'}
        option={pending}
        isBusy={isBusy}
        onConfirm={confirmRecycle}
        onClose={closeSheet('recycle')}
      />
      <PromotionSheet
        open={sheet === 'promote'}
        card={card}
        progression={progression}
        isBusy={isBusy}
        error={promoteError}
        onConfirm={(from) => submit((callbacks) => onPromote(from, callbacks))}
        onClose={closeSheet('promote')}
      />
      <ConvertStackSheet
        key={session}
        open={sheet === 'convert'}
        stack={actions.stack}
        isBusy={isBusy}
        error={convertError}
        startsAtMax={convertStartsAtMax}
        promotionTarget={
          progression.kind === 'max'
            ? null
            : { to: progression.to, copiesRequired: progression.copiesRequired }
        }
        onConfirm={(body) => submit((callbacks) => onConvert(body, callbacks))}
        onClose={closeSheet('convert')}
      />
    </>
  )
}
