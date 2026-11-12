import type { ReactNode } from 'react'
import type { CosmeticItemId } from '@storix/shared'
import { nameStyleClass } from '../cosmetic-skins'

interface StyledNameProps {
  styleId: CosmeticItemId | null
  children: ReactNode
  className?: string
}

/** A display name with its owner's reflection; the text after it keeps its normal colour. */
export function StyledName({ styleId, children, className = '' }: StyledNameProps) {
  const skin = nameStyleClass(styleId)
  const classes = [skin === null ? '' : `nm ${skin}`, className].filter(Boolean).join(' ')
  return <span className={classes || undefined}>{children}</span>
}
