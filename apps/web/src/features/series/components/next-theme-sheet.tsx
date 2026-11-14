import { useState, type FormEvent } from 'react'
import {
  SERIES_ICONS,
  SERIES_TITLE_MAX_LENGTH,
  THEME_ROTATION,
  type NextTheme,
  type SeriesIcon,
} from '@storix/shared'
import { BottomSheet } from '@/components/ui/bottom-sheet'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Icon } from '@/components/ui/icon'
import { Input } from '@/components/ui/input'
import { seriesIconLabel } from '../series-copy'
import { useSetNextTheme } from '../use-series-mutations'

interface NextThemeSheetProps {
  leagueId: string
  current: NextTheme
  open: boolean
  onClose: () => void
}

const SUGGESTIONS = 8

/** Admin sheet replacing next week's theme with a name and an icon, or a suggestion from the rotation. */
export function NextThemeSheet({ leagueId, current, open, onClose }: NextThemeSheetProps) {
  const [title, setTitle] = useState(current.title)
  const [icon, setIcon] = useState<SeriesIcon>(current.icon)
  const mutation = useSetNextTheme(leagueId, onClose)
  const suggestions = THEME_ROTATION.filter((idea) => idea.title !== current.title).slice(
    0,
    SUGGESTIONS,
  )
  const canSave = title.trim() !== '' && !mutation.isPending

  function submit(event: FormEvent): void {
    event.preventDefault()
    if (!canSave) return
    mutation.mutate({ title: title.trim(), icon })
  }

  return (
    <BottomSheet open={open} title="Thème de la semaine prochaine" onClose={onClose}>
      <form className="flex flex-col gap-4" onSubmit={submit}>
        <Field label="Thème">
          <Input
            value={title}
            maxLength={SERIES_TITLE_MAX_LENGTH}
            onChange={(event) => setTitle(event.target.value)}
          />
        </Field>
        <div className="flex flex-col gap-2">
          <span className="text-xs tracking-[0.06em] text-muted uppercase">Icône</span>
          <div className="series-icons" role="radiogroup" aria-label="Icône du thème">
            {SERIES_ICONS.map((key) => (
              <button
                key={key}
                type="button"
                role="radio"
                aria-checked={key === icon}
                aria-label={seriesIconLabel(key)}
                className="series-icon-pick"
                onClick={() => setIcon(key)}
              >
                <Icon name={key} className="size-5" />
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <span className="text-xs tracking-[0.06em] text-muted uppercase">Idées</span>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((idea) => (
              <button
                key={idea.title}
                type="button"
                className="series-idea"
                aria-pressed={idea.title === title}
                onClick={() => {
                  setTitle(idea.title)
                  setIcon(idea.icon)
                }}
              >
                <Icon name={idea.icon} className="size-4" /> {idea.title}
              </button>
            ))}
          </div>
        </div>
        <div className="bsheet-footer">
          <Button
            type="submit"
            variant="primary"
            block
            disabled={!canSave}
            isLoading={mutation.isPending}
          >
            Valider pour lundi
          </Button>
        </div>
      </form>
    </BottomSheet>
  )
}
