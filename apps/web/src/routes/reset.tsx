import { createFileRoute } from '@tanstack/react-router'
import { BrandLogo } from '@/components/ui/brand-logo'
import { RedeemForm } from '@/features/reset-codes/components/redeem-form'

export const Route = createFileRoute('/reset')({
  component: ResetScreen,
})

function ResetScreen() {
  return (
    <main className="screen">
      <BrandLogo size="lg" />
      <h1>Réinitialiser le mot de passe</h1>
      <p className="m-0 text-sm leading-snug text-muted">
        Demande un code au propriétaire de ta première ligue.
      </p>
      <RedeemForm />
    </main>
  )
}
