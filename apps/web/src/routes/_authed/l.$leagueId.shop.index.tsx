import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { z } from 'zod'
import { ShopCatalogue } from '@/features/cosmetics/components/shop-catalogue'
import {
  SHOP_CATEGORY_SLUGS,
  SHOP_FAMILY_SLUGS,
  familyOfCategory,
} from '@/features/cosmetics/shop-categories'

export const Route = createFileRoute('/_authed/l/$leagueId/shop/')({
  validateSearch: z.object({
    family: z.enum(SHOP_FAMILY_SLUGS).optional().catch(undefined),
    category: z.enum(SHOP_CATEGORY_SLUGS).optional().catch(undefined),
  }),
  component: ShopScreen,
})

function ShopScreen() {
  const { leagueId } = Route.useParams()
  const { family, category } = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const shelf = {
    family: category === undefined ? (family ?? 'cartes') : familyOfCategory(category),
    category: category ?? null,
  }

  return (
    <ShopCatalogue
      leagueId={leagueId}
      shelf={shelf}
      onShelfChange={(next) =>
        void navigate({
          search: { family: next.family, category: next.category ?? undefined },
          replace: true,
        })
      }
    />
  )
}
