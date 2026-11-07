import { useId } from 'react'

interface WeightSliderProps {
  label: string
  value: number
  onChange: (value: number) => void
}

export function WeightSlider({ label, value, onChange }: WeightSliderProps) {
  const id = useId()

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between">
        <label htmlFor={id} className="font-display text-sm font-semibold text-ink">
          {label}
        </label>
        <output
          htmlFor={id}
          className="font-display text-sm font-semibold text-accent tabular-nums"
        >
          ×{value}
        </output>
      </div>
      <input
        id={id}
        type="range"
        className="weight-range"
        min={0}
        max={5}
        step={0.5}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </div>
  )
}
