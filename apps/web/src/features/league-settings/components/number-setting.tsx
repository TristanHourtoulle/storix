import { useState } from 'react'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'

interface NumberSettingProps {
  label: string
  hint?: string
  error?: string
  value: number
  min: number
  max: number
  unit?: string
  onChange: (value: number) => void
}

function parseInteger(text: string): number {
  return /^\d+$/.test(text.trim()) ? Number(text) : Number.NaN
}

export function NumberSetting({
  label,
  hint,
  error,
  value,
  min,
  max,
  unit,
  onChange,
}: NumberSettingProps) {
  const [text, setText] = useState(String(value))
  const [isFocused, setIsFocused] = useState(false)
  const displayed = isFocused || Number.isNaN(value) ? text : String(value)

  return (
    <Field label={unit ? `${label} (${unit})` : label} hint={hint} error={error}>
      <Input
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        step={1}
        value={displayed}
        onFocus={() => {
          setText(String(value))
          setIsFocused(true)
        }}
        onBlur={() => setIsFocused(false)}
        onChange={(event) => {
          setText(event.target.value)
          onChange(parseInteger(event.target.value))
        }}
      />
    </Field>
  )
}
