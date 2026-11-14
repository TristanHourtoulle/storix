import { sql } from 'drizzle-orm'
import { cardSealsSchema, type CardSeal } from '@storix/shared'

/** Selects the series seals of a card as a json array, oldest series first. */
export const cardSealsColumn = sql<unknown>`(
  select coalesce(json_agg(json_build_object(
    'seriesId', s.id, 'title', s.title, 'icon', s.icon, 'color', s.color
  ) order by s.starts_at), '[]'::json)
  from card_series_cards sc join card_series s on s.id = sc.series_id
  where sc.card_id = "cards"."id"
)`

/** Parses the seals column; an unreadable value becomes no seal. */
export function toCardSeals(raw: unknown): CardSeal[] {
  return cardSealsSchema.parse(raw)
}
