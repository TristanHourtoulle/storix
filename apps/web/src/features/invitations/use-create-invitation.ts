import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { CreateInvitationBody } from '@storix/shared'
import { userMessage } from '@/features/errors/user-message'
import { createInvitation } from './invitations.api'
import { invitationsQueryOptions } from './invitations.queries'

/** Creates an invitation; its one-time URL lives only in component state. */
export function useCreateInvitation(leagueId: string): {
  create: (body: CreateInvitationBody) => void
  url: string | null
  dismissUrl: () => void
  isPending: boolean
  errorMessage: string | null
} {
  const queryClient = useQueryClient()
  const [url, setUrl] = useState<string | null>(null)
  const mutation = useMutation({
    mutationFn: (body: CreateInvitationBody) => createInvitation(leagueId, body),
    gcTime: 0,
    onSuccess: async (response) => {
      setUrl(response.url)
      await queryClient.invalidateQueries({ queryKey: invitationsQueryOptions(leagueId).queryKey })
    },
  })

  return {
    create: mutation.mutate,
    url,
    dismissUrl: () => setUrl(null),
    isPending: mutation.isPending,
    errorMessage: mutation.error ? userMessage(mutation.error) : null,
  }
}
