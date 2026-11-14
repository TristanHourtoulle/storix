import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { EquippedCosmetics } from '@storix/shared'
import { myCosmeticsQueryOptions } from './cosmetics.queries'

const ORIGINAL_STYLE: EquippedCosmetics = {
  booster: null,
  cardBack: null,
  raritySet: null,
  avatarFrame: null,
  revealAura: null,
  banner: null,
  nameStyle: null,
  momentStamp: null,
  openingTear: null,
}

const StyleContext = createContext<EquippedCosmetics>(ORIGINAL_STYLE)

interface StyleProviderProps {
  children: ReactNode
}

/** Provides the cosmetics the viewer wears, so every skinned surface of their screens follows them. */
export function StyleProvider({ children }: StyleProviderProps) {
  const { data } = useQuery(myCosmeticsQueryOptions)
  return (
    <StyleContext.Provider value={data?.equipped ?? ORIGINAL_STYLE}>
      {children}
    </StyleContext.Provider>
  )
}

interface StylePreviewProps {
  override: Partial<EquippedCosmetics>
  children: ReactNode
}

/** Overrides some worn cosmetics for its subtree only, as the try-on cabin does for its preview. */
export function StylePreview({ override, children }: StylePreviewProps) {
  const worn = useContext(StyleContext)
  const value = useMemo(() => ({ ...worn, ...override }), [worn, override])
  return <StyleContext.Provider value={value}>{children}</StyleContext.Provider>
}

/** The cosmetics worn on this subtree: the viewer's, or the try-on cabin's preview. */
export function useEquippedStyle(): EquippedCosmetics {
  return useContext(StyleContext)
}
