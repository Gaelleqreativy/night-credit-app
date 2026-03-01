export function SkeletonRow({ cols = 4 }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 bg-gray-100 rounded animate-pulse" style={{ width: i === 0 ? '60%' : i === cols - 1 ? '40%' : '50%' }} />
        </td>
      ))}
    </tr>
  )
}

export function SkeletonCard({ lines = 3 }) {
  return (
    <div className="card space-y-3 animate-pulse">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="h-4 bg-gray-100 rounded" style={{ width: i === 0 ? '40%' : i === lines - 1 ? '55%' : '80%' }} />
      ))}
    </div>
  )
}

export function SkeletonStat() {
  return (
    <div className="card animate-pulse space-y-2">
      <div className="h-3 w-24 bg-gray-100 rounded" />
      <div className="h-7 w-32 bg-gray-200 rounded" />
    </div>
  )
}
