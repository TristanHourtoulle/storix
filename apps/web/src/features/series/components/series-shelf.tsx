import { useQuery } from '@tanstack/react-query'
import { seriesShelfQueryOptions } from '../series.queries'
import { SeriesTile } from './series-tile'

interface SeriesShelfProps {
  leagueId: string
}

/** The « Séries » shelf at the top of the collection; renders nothing while there is no series with cards. */
export function SeriesShelf({ leagueId }: SeriesShelfProps) {
  const { data } = useQuery(seriesShelfQueryOptions(leagueId))
  if (data === undefined || data.series.length === 0) return null
  return (
    <section className="series-shelf-wrap" aria-label="Séries">
      <div className="series-sec-h">
        <span>Séries</span>
        <small>{data.series.length}</small>
      </div>
      <div className="series-shelf">
        {data.series.map((series) => (
          <SeriesTile key={series.id} leagueId={leagueId} series={series} />
        ))}
      </div>
    </section>
  )
}
