import type { ReactNode } from 'react'

interface ScaledBoxProps {
  width: number
  height: number
  scale: number
  children: ReactNode
}

/** Shows content drawn at its natural size scaled down, reserving the scaled footprint in the layout. */
export function ScaledBox({ width, height, scale, children }: ScaledBoxProps) {
  return (
    <div className="shop-scaled" style={{ width: width * scale, height: height * scale }}>
      <div style={{ width, height, transform: `scale(${scale})` }}>{children}</div>
    </div>
  )
}
