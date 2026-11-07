import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Notice } from '@/components/ui/notice'
import { usePasskeys } from '../use-passkeys'

const DEFAULT_PASSKEY_NAME = 'Cet appareil'
const dateFormatter = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' })

export function PasskeyList() {
  const { passkeys, addPasskey, deletePasskey, isLoading } = usePasskeys()
  const [error, setError] = useState<string | null>(null)
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [isAdding, setIsAdding] = useState(false)

  async function run(action: () => Promise<void>): Promise<void> {
    setError(null)
    try {
      await action()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Une erreur est survenue.')
    }
  }

  async function handleAdd(): Promise<void> {
    setIsAdding(true)
    await run(() => addPasskey(DEFAULT_PASSKEY_NAME))
    setIsAdding(false)
  }

  async function handleDelete(id: string): Promise<void> {
    setPendingId(id)
    await run(() => deletePasskey(id))
    setPendingId(null)
  }

  return (
    <section aria-labelledby="passkeys-title" className="flex flex-col gap-3">
      <h2 id="passkeys-title">Passkeys</h2>
      {error ? <Notice tone="error">{error}</Notice> : null}
      {isLoading ? (
        <p className="m-0 text-sm text-muted">Chargement…</p>
      ) : passkeys.length === 0 ? (
        <p className="m-0 text-sm text-muted">Aucune passkey pour le moment.</p>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {passkeys.map((passkey) => (
            <li
              key={passkey.id}
              className="flex items-center justify-between gap-3 rounded-input bg-surface px-3 py-2 shadow-hairline"
            >
              <div className="min-w-0">
                <p className="m-0 truncate text-sm font-medium">{passkey.name ?? 'Passkey'}</p>
                <p className="m-0 text-xs text-muted">
                  Ajoutée le {dateFormatter.format(new Date(passkey.createdAt))}
                </p>
              </div>
              <Button
                variant="ghost"
                isLoading={pendingId === passkey.id}
                onClick={() => handleDelete(passkey.id)}
                aria-label={`Supprimer la passkey ${passkey.name ?? ''}`.trim()}
              >
                Supprimer
              </Button>
            </li>
          ))}
        </ul>
      )}
      <Button variant="primary" block isLoading={isAdding} onClick={handleAdd}>
        Ajouter une passkey
      </Button>
    </section>
  )
}
