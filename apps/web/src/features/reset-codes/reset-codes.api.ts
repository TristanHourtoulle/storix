import type { RedeemResetCodeBody } from '@storix/shared'
import { apiRequestVoid } from '@/lib/http'

/** Redeems an admin-issued reset code to set a new password. */
export function redeemResetCode(body: RedeemResetCodeBody): Promise<void> {
  return apiRequestVoid('/api/reset-codes/redeem', { method: 'POST', body })
}
