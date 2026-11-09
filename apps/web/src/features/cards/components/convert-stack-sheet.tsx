import { useState } from 'react'
import {
  planStackTake,
  stackSize,
  type ConvertStackBody,
  type CopyVariant,
  type StackEntryView,
} from '@storix/shared'
import { Button } from '@/components/ui/button'
import { Chip } from '@/components/ui/chip'
import { Dialog } from '@/components/ui/dialog'
import { Notice } from '@/components/ui/notice'
import { Segmented } from '@/components/ui/segmented'

interface ConvertStackSheetProps {
  open: boolean
  stack: StackEntryView[]
  isBusy: boolean
  error: string | null
  onConfirm: (body: ConvertStackBody) => void
  onClose: () => void
}

const MAX_QUANTITY = 999

function clamp(value: number, max: number): number {
  return Math.min(Math.max(value, 1), Math.max(max, 1))
}

export function ConvertStackSheet({
  open,
  stack,
  isBusy,
  error,
  onConfirm,
  onClose,
}: ConvertStackSheetProps) {
  const normalCount = stackSize(stack, 'normal')
  const foilCount = stackSize(stack, 'foil')
  const [picked, setPicked] = useState<CopyVariant | null>(null)
  const [wanted, setWanted] = useState(1)
  const variant: CopyVariant =
    picked === 'foil' && foilCount > 0 ? 'foil' : normalCount > 0 ? 'normal' : 'foil'
  const count = variant === 'foil' ? foilCount : normalCount
  const max = Math.min(count, MAX_QUANTITY)
  const quantity = clamp(wanted, max)
  const dust = planStackTake(stack, quantity, 'richest', variant)?.dust ?? 0
  const options = [
    { id: 'normal', label: `Normales (${normalCount})` },
    { id: 'foil', label: `Foils (${foilCount})` },
  ] as const

  return (
    <Dialog open={open} title="Convertir ta pile" isDismissible={!isBusy} onClose={onClose}>
      {normalCount > 0 && foilCount > 0 ? (
        <Segmented
          options={options}
          value={variant}
          onChange={(id) => {
            setPicked(id)
            setWanted(1)
          }}
        />
      ) : null}
      <div className="stepper">
        <button
          type="button"
          className="stepper-btn"
          aria-label="Moins"
          disabled={quantity <= 1}
          onClick={() => setWanted(quantity - 1)}
        >
          −
        </button>
        <output className="stepper-value" aria-live="polite">
          {quantity}
        </output>
        <button
          type="button"
          className="stepper-btn"
          aria-label="Plus"
          disabled={quantity >= max}
          onClick={() => setWanted(quantity + 1)}
        >
          +
        </button>
        <Chip label="Tout" isOn={quantity === max} onToggle={() => setWanted(max)} />
      </div>
      <p className="sheet-step">+{dust} paillettes</p>
      {error ? <Notice tone="error">{error}</Notice> : null}
      <Button
        variant="primary"
        block
        disabled={count === 0}
        isLoading={isBusy}
        onClick={() => onConfirm({ variant, quantity, expectedCount: count })}
      >
        Convertir ×{quantity} · +{dust}
      </Button>
    </Dialog>
  )
}
