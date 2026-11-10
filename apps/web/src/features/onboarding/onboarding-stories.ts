import {
  type InAppBrowser,
  type InstallContext,
  MYTHIC_MIN_CARDS,
  PITY_EPIC_AFTER,
  QUOTA_LOWER_BOUNDS,
  resolveLeagueSettings,
  type WalletState,
} from '@storix/shared'
import { formatDurationFr, formatEveryFr } from './format-duration'

export type StoryKey = 'goal' | 'rarity' | 'add' | 'boosters' | 'stacks' | 'install'

export type StoryTint = 'legendary' | 'epic' | 'uncommon' | 'rare' | 'cyan' | 'accent'

export interface Story {
  key: StoryKey
  tint: StoryTint
  title: string
  text: string
}

interface LeagueFacts {
  joinGift: number
  intervalMinutes: number
  maxStock: number
  newCardDelayMinutes: number
}

const SECONDS_PER_MINUTE = 60

const LEGENDARY_TOP_PERCENT = Math.round((1 - QUOTA_LOWER_BOUNDS.legendary) * 100)

export const MYTHIC_LINE = `La Mythique est la meilleure carte de la ligue, dès ${MYTHIC_MIN_CARDS} cartes.`

function leagueFactsOf(wallet: WalletState | undefined): LeagueFacts {
  if (wallet !== undefined) {
    return {
      joinGift: wallet.booster.joinGift,
      intervalMinutes: Math.round(wallet.booster.intervalSeconds / SECONDS_PER_MINUTE),
      maxStock: wallet.booster.maxStock,
      newCardDelayMinutes: wallet.pool.newCardDelayMinutes,
    }
  }
  const defaults = resolveLeagueSettings({})
  return {
    joinGift: defaults.booster.joinGift,
    intervalMinutes: defaults.booster.intervalMinutes,
    maxStock: defaults.booster.maxStock,
    newCardDelayMinutes: defaults.newCardDelayMinutes,
  }
}

function addText(newCardDelayMinutes: number): string {
  const lead = 'Viseur ou galerie, un cadrage, un titre.'
  if (newCardDelayMinutes === 0) return `${lead} Ta carte entre tout de suite dans les boosters.`
  return `${lead} Ta carte entre dans les boosters ${formatDurationFr(newCardDelayMinutes)} plus tard.`
}

function boostersTitle(joinGift: number, intervalMinutes: number): string {
  const every = formatEveryFr(intervalMinutes)
  if (joinGift === 0) return `1 booster ${every}`
  return `${joinGift} ${joinGift === 1 ? 'offert' : 'offerts'}, puis 1 ${every}`
}

/** Builds the five game stories that precede the install story, from the league's real settings. */
export function buildGameStories(wallet: WalletState | undefined): readonly Story[] {
  const facts = leagueFactsOf(wallet)
  return [
    {
      key: 'goal',
      tint: 'legendary',
      title: 'Tes photos deviennent des cartes',
      text: 'Chaque photo du groupe se collectionne. Ouvre des boosters pour les gagner.',
    },
    {
      key: 'rarity',
      tint: 'epic',
      title: 'La ligue décide de la rareté',
      text: `Top ${LEGENDARY_TOP_PERCENT} % = Légendaire. ${MYTHIC_LINE}`,
    },
    {
      key: 'add',
      tint: 'uncommon',
      title: 'Le + au centre',
      text: addText(facts.newCardDelayMinutes),
    },
    {
      key: 'boosters',
      tint: 'rare',
      title: boostersTitle(facts.joinGift, facts.intervalMinutes),
      text: `${facts.maxStock} en stock max. Épique garantie au ${PITY_EPIC_AFTER}e booster sans Épique.`,
    },
    {
      key: 'stacks',
      tint: 'cyan',
      title: "Tes doublons s'empilent",
      text: "À ×10, ta copie peut monter d'une rareté. Ou convertis tes doublons en paillettes.",
    },
  ]
}

export type PlatformFamily = 'ios' | 'android'

export interface InstallCopy {
  title: string
  text: string
  rows: readonly string[]
  pill: string | null
  hasCopyLink: boolean
}

const IN_APP_NAMES: Readonly<Record<InAppBrowser, string>> = {
  messenger: 'Messenger',
  facebook: 'Facebook',
  instagram: 'Instagram',
  whatsapp: 'WhatsApp',
  snapchat: 'Snapchat',
  tiktok: 'TikTok',
  linkedin: 'LinkedIn',
  line: 'LINE',
}

const INSTALL_TITLE = 'Installe Storix'
const APP_LIKE_TEXT = "Storix s'ouvrira comme une vraie app, en plein écran."
const ANDROID_TEXT = "Storix s'ajoute à ton écran d'accueil comme une app."
const PUSH_TEXT = 'On te prévient quand ton stock de boosters est plein.'

function inAppCopy(inAppBrowser: InAppBrowser | null, family: PlatformFamily): InstallCopy {
  const app = inAppBrowser === null ? 'une app' : IN_APP_NAMES[inAppBrowser]
  const isAndroid = family === 'android'
  return {
    title: 'Ouvre Storix dans ton navigateur',
    text: `Tu es dans ${app} : impossible d'installer Storix d'ici. Copie le lien et colle-le dans Safari (iPhone) ou Chrome (Android). Tu devras te reconnecter une fois.`,
    rows: [
      `Touche ${isAndroid ? '⋮' : '⋯'} ou le bouton du navigateur`,
      '« Ouvrir dans le navigateur »',
      `Sinon, colle le lien dans ${isAndroid ? 'Chrome' : 'Safari'}`,
    ],
    pill: `Ouvert dans ${app}`,
    hasCopyLink: true,
  }
}

/** Builds the install story copy for the detected install context. */
export function installStoryCopy(input: {
  context: InstallContext
  inAppBrowser: InAppBrowser | null
  family: PlatformFamily
  canEnablePush: boolean
}): InstallCopy {
  const base = { title: INSTALL_TITLE, pill: null, hasCopyLink: false }
  const withPush = (text: string): string => (input.canEnablePush ? `${text} ${PUSH_TEXT}` : text)
  switch (input.context) {
    case 'installed':
      return {
        ...base,
        text: withPush("Tu es dans l'app, rien à faire."),
        rows: ["✓ Storix est déjà sur ton écran d'accueil"],
      }
    case 'ios-safari':
      return {
        ...base,
        text: APP_LIKE_TEXT,
        rows: ['Ouvre Storix dans Safari', 'Touche Partager', "« Sur l'écran d'accueil »"],
      }
    case 'ios-other':
      return {
        ...base,
        text: APP_LIKE_TEXT,
        rows: [
          "Touche Partager dans la barre d'adresse",
          "« Sur l'écran d'accueil »",
          'Si tu ne le vois pas, ouvre le lien dans Safari',
        ],
        hasCopyLink: true,
      }
    case 'android-prompt':
      return { ...base, text: withPush(ANDROID_TEXT), rows: [] }
    case 'android-manual':
      return {
        ...base,
        text: withPush(ANDROID_TEXT),
        rows: [
          'Ouvre le menu ⋮ de Chrome',
          "« Installer l'application » ou « Ajouter à l'écran d'accueil »",
        ],
      }
    case 'in-app':
      return inAppCopy(input.inAppBrowser, input.family)
    case 'desktop':
      return {
        ...base,
        text: withPush('Storix se joue sur ton téléphone, comme une vraie app.'),
        rows: ['Ouvre ce lien sur ton téléphone', "Ajoute Storix à ton écran d'accueil"],
        hasCopyLink: true,
      }
  }
}
