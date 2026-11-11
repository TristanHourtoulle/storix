import {
  CARD_TIERS,
  LEAGUE_ROLES,
  findCosmetic,
  formatMomentLateness,
  type AuditAction,
  type AuditCategory,
  type AuditEntry,
  type AuditPerson,
  type CardTier,
} from '@storix/shared'
import type { IconName } from '@/components/ui/icon'
import { TIER_LABELS } from '@/features/cards/tier-labels'
import { cosmeticFullName, formatDustPrice } from '@/features/cosmetics/cosmetic-copy'
import { ROLE_LABELS } from '@/features/leagues/role-labels'
import { parisClock } from '@/lib/paris-dates'

export type SentencePart = string | { strong: string; tier?: CardTier; isWarning?: boolean }

export interface AuditSentence {
  parts: SentencePart[]
  details: string[]
  isWarning: boolean
}

type Metadata = Record<string, unknown>

const DATE_FORMAT = new Intl.DateTimeFormat('fr-FR', {
  timeZone: 'Europe/Paris',
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
})

const SETTING_LABELS: Readonly<Record<string, string>> = {
  'booster.intervalMinutes': 'Cadence des boosters',
  'booster.maxStock': 'Stock maximum',
  'booster.joinGift': "Boosters offerts à l'arrivée",
  uploadQuotaPerDay: 'Photos par jour',
  newCardDelayMinutes: 'Délai avant la pioche',
  'rarityWeights.uploaderScarcity': 'Poids rareté des auteurs',
  'rarityWeights.photoAge': 'Poids ancienneté',
  'rarityWeights.reactions': 'Poids réactions',
}

const MINUTE_SETTINGS = new Set(['booster.intervalMinutes', 'newCardDelayMinutes'])

const ICON_BY_CATEGORY: Readonly<Record<AuditCategory, IconName>> = {
  members: 'user',
  cards: 'photo',
  settings: 'gear',
  security: 'key',
  economy: 'dust',
  accounts: 'profile',
}

const ICON_BY_ACTION: Partial<Readonly<Record<AuditAction, IconName>>> = {
  'member.left': 'door',
  'member.removed': 'door',
  'card.hidden': 'eye-off',
  'card.tier_pinned': 'pin',
  'card.bounds_set': 'pin',
  'card.deleted': 'trash',
  'card.removed': 'trash',
  'league.deleted': 'trash',
}

export const CATEGORY_CLASS: Readonly<Record<AuditCategory, string>> = {
  members: 'j-mem',
  cards: 'j-card',
  settings: 'j-set',
  security: 'j-sec',
  economy: 'j-eco',
  accounts: 'j-acc',
}

function rec(meta: Metadata, key: string): Metadata | null {
  const value = meta[key]
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Metadata)
    : null
}

function str(meta: Metadata | null, key: string): string | null {
  const value = meta?.[key]
  return typeof value === 'string' ? value : null
}

function num(meta: Metadata | null, key: string): number | null {
  const value = meta?.[key]
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function tierOf(value: string | null): CardTier | null {
  return CARD_TIERS.find((tier) => tier === value) ?? null
}

function roleOf(value: string | null): string | null {
  const role = LEAGUE_ROLES.find((candidate) => candidate === value)
  return role === undefined ? null : ROLE_LABELS[role]
}

/** A person's name in the Journal: "(parti)" once they left, "Ancien membre" once deleted. */
export function personLabel(person: AuditPerson | null): string {
  if (person?.displayUsername == null) return 'Ancien membre'
  return person.isFormer ? `${person.displayUsername} (parti)` : person.displayUsername
}

function cardLabel(meta: Metadata): string {
  const number = num(meta, 'number')
  return number === null ? 'une carte' : `la carte #${number}`
}

function duration(minutes: number): string {
  if (minutes % 1440 === 0) return `${minutes / 1440} j`
  if (minutes % 60 === 0) return `${minutes / 60} h`
  return minutes > 60 ? `${Math.floor(minutes / 60)} h ${minutes % 60}` : `${minutes} min`
}

function flatten(meta: Metadata | null, prefix = ''): Map<string, unknown> {
  if (meta === null) return new Map()
  return new Map(
    Object.entries(meta).flatMap(([key, value]) => {
      const path = prefix === '' ? key : `${prefix}.${key}`
      const nested = typeof value === 'object' && value !== null ? (value as Metadata) : null
      return nested !== null && !Array.isArray(value)
        ? [...flatten(nested, path)]
        : [[path, value] as const]
    }),
  )
}

function settingValue(path: string, value: unknown): string {
  if (typeof value === 'number' && MINUTE_SETTINGS.has(path)) return duration(value)
  return String(value)
}

function settingsChanges(meta: Metadata): { labels: string[]; details: string[] } {
  const from = flatten(rec(meta, 'from'))
  const to = flatten(rec(meta, 'to'))
  const changed = [...to.entries()].filter(
    ([path, value]) => path in SETTING_LABELS && from.get(path) !== value,
  )
  return {
    labels: changed.map(([path]) => (SETTING_LABELS[path] ?? path).toLowerCase()),
    details: changed.map(
      ([path, value]) =>
        `${SETTING_LABELS[path] ?? path} : ${settingValue(path, from.get(path))} → ${settingValue(path, value)}`,
    ),
  }
}

function photosChoice(meta: Metadata): string {
  return str(meta, 'photos') === 'delete' ? 'photos supprimées' : 'photos gardées'
}

function memberExitDetails(meta: Metadata): string[] {
  const kept = num(meta, 'keptCards')
  const removed = num(meta, 'removedCards')
  return [
    ...(kept !== null && kept > 0
      ? [`${kept} photo${kept > 1 ? 's' : ''} gardée${kept > 1 ? 's' : ''} avec « ancien membre ».`]
      : []),
    ...(removed !== null && removed > 0
      ? [`${removed} photo${removed > 1 ? 's' : ''} supprimée${removed > 1 ? 's' : ''}.`]
      : []),
  ]
}

function tierStateLabel(state: Metadata | null): string | null {
  const tier = tierOf(str(state, 'tier'))
  if (tier === null) return null
  const source = str(state, 'tierSource')
  return source === 'pinned' ? `${TIER_LABELS[tier]} (épinglée)` : `${TIER_LABELS[tier]} (calculée)`
}

function sentence(parts: SentencePart[], details: string[] = []): AuditSentence {
  return { parts, details, isWarning: false }
}

function cardSentence(actor: SentencePart, entry: AuditEntry): AuditSentence {
  const meta = entry.metadata
  const card = cardLabel(meta)
  const author = entry.target === null ? [] : [`Photo de ${personLabel(entry.target)}.`]
  switch (entry.action) {
    case 'card.created':
      return sentence([actor, ` a ajouté ${card}`])
    case 'card.hidden':
      return sentence([actor, ` a masqué ${card}`], [...author, 'Retirée de la pioche.'])
    case 'card.unhidden':
      return sentence([actor, ` a réaffiché ${card}`], author)
    case 'card.deleted':
    case 'card.removed': {
      const owners = num(meta, 'compensatedOwners')
      const dust = num(meta, 'dust')
      return sentence(
        [actor, ` a supprimé ${card}`],
        [
          ...author,
          ...(owners !== null && owners > 0 && dust !== null
            ? [
                `${owners} propriétaire${owners > 1 ? 's' : ''} dédommagé${owners > 1 ? 's' : ''} · ${dust} paillettes`,
              ]
            : []),
        ],
      )
    }
    case 'card.withdrawn':
      return sentence([actor, ` a retiré sa photo de la ligue (${card})`])
    case 'card.tier_pinned': {
      const pinned = tierOf(str(rec(meta, 'after'), 'pinnedTier'))
      const before = tierStateLabel(rec(meta, 'before'))
      const details = before === null ? [] : [`Avant : ${before}`]
      return pinned === null
        ? sentence([actor, ` a retiré l'épingle de ${card}`], details)
        : sentence(
            [actor, ` a épinglé ${card} en `, { strong: TIER_LABELS[pinned], tier: pinned }],
            details,
          )
    }
    case 'card.bounds_set': {
      const after = rec(meta, 'after')
      const min = tierOf(str(after, 'minTier'))
      const max = tierOf(str(after, 'maxTier'))
      return sentence(
        [actor, ` a réglé les bornes de ${card}`],
        [
          `Min : ${min === null ? 'aucune' : TIER_LABELS[min]} · Max : ${max === null ? 'aucune' : TIER_LABELS[max]}`,
        ],
      )
    }
    case 'card.capture_date_validated': {
      const isValidated = rec(meta, 'after')?.isCaptureDateValidated === true
      return sentence([
        actor,
        ` a ${isValidated ? 'validé' : 'invalidé'} la date de prise de vue de ${card}`,
      ])
    }
    default:
      return sentence([actor, ` a modifié ${card}`])
  }
}

function economySentence(actor: SentencePart, entry: AuditEntry): AuditSentence {
  const meta = entry.metadata
  const cost = num(meta, 'cost')
  const costDetail = cost === null ? [] : [`${cost} paillettes`]
  switch (entry.action) {
    case 'copy.recycled':
      return sentence([actor, ' a recyclé une copie'])
    case 'copy.crafted':
      return sentence([actor, ' a fabriqué une copie'], costDetail)
    case 'copy.foil_upgraded':
      return sentence([actor, ' a passé une copie en foil'], costDetail)
    case 'copy.promoted': {
      const from = tierOf(str(meta, 'from'))
      const to = tierOf(str(meta, 'to'))
      return sentence(
        to === null
          ? [actor, ' a amélioré une carte']
          : [actor, ' a fait passer une carte ', { strong: `${TIER_LABELS[to]} ★`, tier: to }],
        [
          ...(from !== null && to !== null ? [`${TIER_LABELS[from]} → ${TIER_LABELS[to]} ★`] : []),
          ...costDetail,
        ],
      )
    }
    case 'mission.claimed': {
      const dust = num(meta, 'dust') ?? 0
      const boosters = num(meta, 'boosters') ?? 0
      return sentence(
        [actor, ` a récupéré la mission « ${str(meta, 'label') ?? ''} »`],
        [
          ...(dust > 0 ? [`+${dust} paillettes`] : []),
          ...(boosters > 0 ? [`+${boosters} booster${boosters > 1 ? 's' : ''}`] : []),
          ...(meta?.autoClaimed === true ? ['Créditée automatiquement à la remise à zéro.'] : []),
        ],
      )
    }
    case 'moment.posted': {
      const dust = num(meta, 'dust') ?? 0
      const late = num(meta, 'lateMinutes') ?? 0
      return sentence(
        [actor, ' a posté son Moment'],
        [
          late === 0 ? 'À l’heure' : `En retard de ${formatMomentLateness(late)}`,
          ...(dust > 0 ? [`+${dust} paillettes`] : []),
        ],
      )
    }
    case 'cosmetic.purchased': {
      const item = findCosmetic(str(meta, 'itemId') ?? '')
      const price = num(meta, 'price')
      return sentence(
        item === undefined
          ? [actor, ' a acheté un cosmétique']
          : [actor, ' a acheté ', { strong: cosmeticFullName(item) }],
        price === null ? [] : [formatDustPrice(price)],
      )
    }
    case 'league_goal.reward_granted': {
      const boosters = num(meta, 'boosters') ?? 0
      const gifts = num(meta, 'premiumGifts') ?? 0
      const members = num(meta, 'members')
      return sentence(
        [
          gifts > 0
            ? 'Palier bonus de l’objectif de la ligue atteint'
            : 'Objectif de la ligue atteint',
        ],
        [
          ...(boosters > 0 ? [`+${boosters} boosters pour chaque membre`] : []),
          ...(gifts > 0 ? [`+${gifts} booster premium pour chaque membre`] : []),
          ...(members === null ? [] : [`${members} membres récompensés`]),
        ],
      )
    }
    default:
      return sentence([actor, ' a converti des doublons en paillettes'])
  }
}

/** Builds the French Journal sentence and its detail lines for an audit entry. */
export function auditSentence(entry: AuditEntry): AuditSentence {
  const meta = entry.metadata
  const actor: SentencePart = { strong: personLabel(entry.actor) }
  const target: SentencePart = { strong: personLabel(entry.target) }
  switch (entry.action) {
    case 'league.created':
      return sentence([actor, ' a créé la ligue'])
    case 'league.renamed':
      return sentence(
        [actor, ` a renommé la ligue « ${str(meta, 'to') ?? ''} »`],
        str(meta, 'from') === null ? [] : [`Avant : « ${str(meta, 'from')} »`],
      )
    case 'league.deleted':
      return sentence([actor, ' a supprimé la ligue'])
    case 'league.settings_updated': {
      const { labels, details } = settingsChanges(meta)
      return sentence(
        [
          actor,
          labels.length > 0
            ? ` a modifié les réglages : ${labels.join(', ')}`
            : ' a modifié les réglages',
        ],
        details,
      )
    }
    case 'league.photo_changed':
      return sentence([actor, ' a changé la photo de la ligue'])
    case 'league.photo_removed':
      return sentence([actor, ' a retiré la photo de la ligue'])
    case 'league.ownership_transferred':
      return sentence([actor, ' a transmis la propriété de la ligue à ', target])
    case 'invitation.created': {
      const days = num(meta, 'expiresInDays')
      const uses = num(meta, 'maxUses')
      return sentence(
        [actor, ' a créé une invitation'],
        [
          ...(days === null ? [] : [`Valable ${days} jour${days > 1 ? 's' : ''}`]),
          ...(uses === null ? [] : [`${uses} utilisation${uses > 1 ? 's' : ''} au maximum`]),
        ],
      )
    }
    case 'invitation.revoked':
      return sentence([actor, ' a révoqué une invitation'])
    case 'member.joined':
      return sentence(
        [actor, ' a rejoint la ligue'],
        [str(meta, 'via') === 'signup' ? 'Avec un nouveau compte.' : 'Avec un compte existant.'],
      )
    case 'member.role_changed': {
      const to = roleOf(str(meta, 'to'))
      const from = roleOf(str(meta, 'from'))
      return sentence(
        [actor, ' a passé ', target, to === null ? ' dans un autre rôle' : ` ${to}`],
        from === null ? [] : [`Avant : ${from}`],
      )
    }
    case 'member.removed':
      return sentence(
        [actor, ' a retiré ', target, ` de la ligue, ${photosChoice(meta)}`],
        memberExitDetails(meta),
      )
    case 'member.left':
      return sentence([actor, ` a quitté la ligue, ${photosChoice(meta)}`], memberExitDetails(meta))
    case 'reset_code.issued': {
      const expiresAt = str(meta, 'expiresAt')
      return sentence(
        [actor, ' a créé un code de réinitialisation pour ', target],
        [
          'À usage unique.',
          ...(expiresAt === null
            ? []
            : [`Valable jusqu'au ${DATE_FORMAT.format(new Date(expiresAt))}.`]),
        ],
      )
    }
    case 'reset_code.redeemed':
      return sentence([
        entry.target === null ? actor : target,
        ' a utilisé son code de réinitialisation',
      ])
    case 'reset_code.failed': {
      const attempts = entry.count === 1 ? '1 essai raté' : `${entry.count} essais ratés`
      return {
        parts: [
          { strong: attempts, isWarning: true },
          ' de code de réinitialisation pour ',
          target,
        ],
        details: [entry.times.map(parisClock).join(', ')],
        isWarning: true,
      }
    }
    case 'account.deleted':
      return sentence([actor, ' a supprimé son compte'])
    case 'account.display_name_changed':
      return sentence(
        [actor, ` a changé son pseudo en « ${str(meta, 'to') ?? ''} »`],
        str(meta, 'from') === null ? [] : [`Avant : « ${str(meta, 'from')} »`],
      )
    case 'account.avatar_changed':
      return sentence([actor, ' a changé sa photo de profil'])
    case 'account.avatar_removed':
      return sentence([actor, ' a retiré sa photo de profil'])
    case 'copy.recycled':
    case 'copy.crafted':
    case 'copy.foil_upgraded':
    case 'copy.promoted':
    case 'stack.converted':
    case 'mission.claimed':
    case 'league_goal.reward_granted':
    case 'moment.posted':
    case 'cosmetic.purchased':
      return economySentence(actor, entry)
    case 'card.created':
    case 'card.hidden':
    case 'card.unhidden':
    case 'card.deleted':
    case 'card.removed':
    case 'card.withdrawn':
    case 'card.tier_pinned':
    case 'card.bounds_set':
    case 'card.capture_date_validated':
      return cardSentence(actor, entry)
  }
}

/** The line icon of a Journal entry, by action when it has its own, by category otherwise. */
export function auditIcon(entry: AuditEntry): IconName {
  return ICON_BY_ACTION[entry.action] ?? ICON_BY_CATEGORY[entry.category]
}
