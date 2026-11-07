interface StockPipsProps {
  stock: number
  max: number
}

export function StockPips({ stock, max }: StockPipsProps) {
  return (
    <div className="pips" role="img" aria-label={`${stock} sur ${max}`}>
      {Array.from({ length: max }, (_, index) => (
        <span key={index} className={index < stock ? 'pip on' : 'pip'} />
      ))}
    </div>
  )
}
