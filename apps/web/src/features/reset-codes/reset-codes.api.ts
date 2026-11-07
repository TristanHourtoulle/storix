import {
  issueResetCodeResponseSchema,
  type IssueResetCodeResponse,
  type RedeemResetCodeBody,
} from '@storix/shared'
import { apiRequest, apiRequestVoid } from '@/lib/http'

/** Redeems an admin-issued reset code to set a new password. */
export function redeemResetCode(body: RedeemResetCodeBody): Promise<void> {
  return apiRequestVoid('/api/reset-codes/redeem', { method: 'POST', body })
}

/** Issues a one-time reset code for a league member. */
export function issueResetCode(leagueId: string, userId: string): Promise<IssueResetCodeResponse> {
  return apiRequest(
    `/api/leagues/${encodeURIComponent(leagueId)}/members/${encodeURIComponent(userId)}/reset-code`,
    { method: 'POST', schema: issueResetCodeResponseSchema },
  )
}
