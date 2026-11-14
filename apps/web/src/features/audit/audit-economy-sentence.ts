import { findCharm, findCosmetic, formatMomentLateness, type AuditEntry } from '@storix/shared'
import { TIER_LABELS } from '@/features/cards/tier-labels'
import { cosmeticFullName, formatDustPrice } from '@/features/cosmetics/cosmetic-copy'
import {
  num,
  sentence,
  str,
  tierOf,
  type AuditSentence,
  type SentencePart,
} from './audit-sentence-kit'

/** The Journal sentence of an economy entry: copies, missions, Moments, shop and league goal. */
export function economySentence(actor: SentencePart, entry: AuditEntry): AuditSentence {
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
    case 'charm.purchased': {
      const charm = findCharm(str(meta, 'charm') ?? '')
      const price = num(meta, 'price')
      return sentence(
        charm === undefined
          ? [actor, ' a pris un porte-bonheur']
          : [actor, ' a pris le porte-bonheur ', { strong: charm.name }],
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
