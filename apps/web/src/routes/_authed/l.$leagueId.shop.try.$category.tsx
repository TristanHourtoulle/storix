import { createFileRoute, redirect } from '@tanstack/react-router'
import { z } from 'zod'
import { COSMETIC_ITEM_IDS } from '@storix/shared'
import { TryOnCabin } from '@/features/cosmetics/components/try-on-cabin'
import { SHOP_CATEGORY_SLUGS, type ShopCategorySlug } from '@/features/cosmetics/shop-categories'

function isCategory(value: string): value is ShopCategorySlug {
  return (SHOP_CATEGORY_SLUGS as readonly string[]).includes(value)
}

export const Route = createFileRoute('/_authed/l/$leagueId/shop/try/$category')({
  validateSearch: z.object({ item: z.enum(COSMETIC_ITEM_IDS).optional() }),
  beforeLoad: ({ params }) => {
    if (!isCategory(params.category)) {
      throw redirect({ to: '/l/$leagueId/shop', params: { leagueId: params.leagueId } })
    }
  },
  component: TryOnScreen,
})

function TryOnScreen() {
  const { leagueId, category } = Route.useParams()
  const { item } = Route.useSearch()
  if (!isCategory(category)) return null

  return <TryOnCabin key={category} leagueId={leagueId} category={category} initialItemId={item} />
}
