import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import type { IssueResetCodeResponse } from '@storix/shared'
import { userMessage } from '@/features/errors/user-message'
import { issueResetCode } from './reset-codes.api'

/** Issues a reset code held only in component state; unmounting discards it. */
export function useIssueResetCode(
  leagueId: string,
  userId: string,
): {
  issue: () => void
  result: IssueResetCodeResponse | null
  isPending: boolean
  errorMessage: string | null
} {
  const [result, setResult] = useState<IssueResetCodeResponse | null>(null)
  const mutation = useMutation({
    mutationFn: () => issueResetCode(leagueId, userId),
    gcTime: 0,
  })

  return {
    issue: () => mutation.mutate(undefined, { onSuccess: setResult }),
    result,
    isPending: mutation.isPending,
    errorMessage: mutation.error ? userMessage(mutation.error) : null,
  }
}
