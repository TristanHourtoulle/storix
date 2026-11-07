import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { authClient } from '@/lib/auth-client'
import { authErrorMessage } from './auth-errors'

export const PASSKEYS_QUERY_KEY = ['passkeys'] as const

/** Default passkey label for a user. */
export function defaultPasskeyName(displayUsername: string): string {
  return `Passkey de ${displayUsername}`
}

export interface PasskeySummary {
  id: string
  name: string | null
  createdAt: string | null
}

const passkeyListSchema = z.array(
  z.object({
    id: z.string(),
    name: z.string().nullish(),
    createdAt: z.coerce.date().nullish(),
  }),
)

async function fetchPasskeys(): Promise<PasskeySummary[]> {
  const { data, error } = await authClient.passkey.listUserPasskeys()
  if (error) throw new Error(authErrorMessage(error, 'Impossible de charger tes passkeys.'))
  return passkeyListSchema.parse(data).map((passkey) => ({
    id: passkey.id,
    name: passkey.name ?? null,
    createdAt: passkey.createdAt?.toISOString() ?? null,
  }))
}

/** Lists, adds and deletes the current user's passkeys. */
export function usePasskeys(): {
  passkeys: PasskeySummary[]
  addPasskey: (name: string) => Promise<void>
  deletePasskey: (id: string) => Promise<void>
  isLoading: boolean
  isReady: boolean
} {
  const queryClient = useQueryClient()
  const query = useQuery({ queryKey: PASSKEYS_QUERY_KEY, queryFn: fetchPasskeys })

  const add = useMutation({
    mutationFn: async (name: string): Promise<void> => {
      const result = await authClient.passkey.addPasskey({ name })
      if (result?.error) {
        throw new Error(authErrorMessage(result.error, "Impossible d'ajouter la passkey."))
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PASSKEYS_QUERY_KEY }),
  })

  const remove = useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await authClient.passkey.deletePasskey({ id })
      if (error) throw new Error(authErrorMessage(error, 'Impossible de supprimer la passkey.'))
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PASSKEYS_QUERY_KEY }),
  })

  return {
    passkeys: query.data ?? [],
    addPasskey: add.mutateAsync,
    deletePasskey: remove.mutateAsync,
    isLoading: query.isLoading,
    isReady: query.isSuccess,
  }
}
