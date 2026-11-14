import { useState, type FormEvent } from 'react'
import {
  isSingleEmoji,
  SERIES_EMOJI_MAX_LENGTH,
  SERIES_TITLE_MAX_LENGTH,
  THEME_ROTATION,
  type NextTheme,
} from '@storix/shared'
import { BottomSheet } from '@/components/ui/bottom-sheet'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { useSetNextTheme } from '../use-series-mutations'

interface NextThemeSheetProps {
  leagueId: string
  current: NextTheme
  open: boolean
  onClose: () => void
}

const SUGGESTIONS = 8

/** Admin sheet replacing next week's theme with a name and an emoji, or a suggestion from the rotation. */
export function NextThemeSheet({ leagueId, current, open, onClose }: NextThemeSheetProps) {
  const [title, setTitle] = useState(current.title)
  const [emoji, setEmoji] = useState(current.emoji)
  const mutation = useSetNextTheme(leagueId, onClose)
  const suggestions = THEME_ROTATION.filter((idea) => idea.title !== current.title).slice(
    0,
    SUGGESTIONS,
  )
  const isEmojiValid = isSingleEmoji(emoji.trim())
  const canSave = title.trim() !== '' && isEmojiValid && !mutation.isPending

  function submit(event: FormEvent): void {
    event.preventDefault()
    if (!canSave) return
    mutation.mutate({ title: title.trim(), emoji: emoji.trim() })
  }

  return (
    <BottomSheet open={open} title="Thème de la semaine prochaine" onClose={onClose}>
      <form className="flex flex-col gap-4" onSubmit={submit}>
        <div className="flex gap-3">
          <div className="w-20 flex-none">
            <Field label="Emoji" error={emoji.trim() === '' || isEmojiValid ? undefined : 'Un seul emoji'}>
              <Input
                value={emoji}
                maxLength={SERIES_EMOJI_MAX_LENGTH}
                onChange={(event) => setEmoji(event.target.value)}
                className="text-center text-xl"
              />
            </Field>
          </div>
          <Field label="Thème">
            <Input
              value={title}
              maxLength={SERIES_TITLE_MAX_LENGTH}
              onChange={(event) => setTitle(event.target.value)}
            />
          </Field>
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
                  setEmoji(idea.emoji)
                }}
              >
                <span aria-hidden="true">{idea.emoji}</span> {idea.title}
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
