import { createFileRoute } from '@tanstack/react-router'
import { BrandMark } from '@/components/ui/brand-mark'
import { RedeemForm } from '@/features/reset-codes/components/redeem-form'

export const Route = createFileRoute('/reset')({
  component: ResetScreen,
})

function ResetScreen() {
  return (
    <main className="screen">
      <BrandMark />
      <h1>Réinitialiser le mot de passe</h1>
      <p className="m-0 text-sm leading-snug text-muted">
        Demande un code au propriétaire de ta première ligue.
      </p>
      <RedeemForm />
    </main>
  )
}
