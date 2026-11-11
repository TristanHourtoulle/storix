import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { z } from 'zod'
import { ShopCatalogue } from '@/features/cosmetics/components/shop-catalogue'
import { SHOP_CATEGORY_SLUGS } from '@/features/cosmetics/shop-categories'

export const Route = createFileRoute('/_authed/l/$leagueId/shop/')({
  validateSearch: z.object({ category: z.enum(SHOP_CATEGORY_SLUGS).optional() }),
  component: ShopScreen,
})

function ShopScreen() {
  const { leagueId } = Route.useParams()
  const { category = 'boosters' } = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })

  return (
    <ShopCatalogue
      leagueId={leagueId}
      category={category}
      onCategoryChange={(slug) => void navigate({ search: { category: slug }, replace: true })}
    />
  )
}
