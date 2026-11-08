import type { BoosterFullPushPayload } from '@storix/shared'

export type PushSendResult = 'sent' | 'gone' | 'refused' | 'failed'

export interface PushTarget {
  endpoint: string
  p256dh: string
  auth: string
}

export interface PushSender {
  send(target: PushTarget, payload: BoosterFullPushPayload): Promise<PushSendResult>
}

export interface VapidConfig {
  publicKey: string
  privateKey: string
  subject: string
}
