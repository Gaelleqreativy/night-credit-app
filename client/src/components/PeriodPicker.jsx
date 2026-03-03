import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

const MONTHS_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
]

function buildParams(type, year, month, date) {
  if (type === 'year') return { year }
  if (type === 'month') {
    const y = year, m = month
    const start = `${y}-${String(m).padStart(2, '0')}-01`
    const lastDay = new Date(y, m, 0).getDate()
    const end = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
    return { dateFrom: start, dateTo: end }
  }
  if (type === 'week') {
    const dt = new Date(date + 'T00:00:00')
    const day = dt.getDay()
    const diffToMonday = day === 0 ? -6 : 1 - day
    const monday = new Date(dt)
    monday.setDate(dt.getDate() + diffToMonday)
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)
    return {
      dateFrom: monday.toISOString().split('T')[0],
      dateTo: sunday.toISOString().split('T')[0],
    }
  }
  if (type === 'day') return { dateFrom: date, dateTo: date }
}

export default function PeriodPicker({ onChange }) {
  const now = new Date()
  const [type, setType] = useState('year')
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [date, setDate] = useState(now.toISOString().split('T')[0])

  function emit(t, y, m, d) {
    onChange(buildParams(t, y, m, d))
  }

  function navigate(delta) {
    let y = year, m = month, d = date
    if (type === 'year') {
      y = year + delta
      setYear(y)
    } else if (type === 'month') {
      m = month + delta
      if (m < 1) { m = 12; y = year - 1 }
      if (m > 12) { m = 1; y = year + 1 }
      setMonth(m); setYear(y)
    } else if (type === 'day') {
      const dt = new Date(date + 'T00:00:00')
      dt.setDate(dt.getDate() + delta)
      d = dt.toISOString().split('T')[0]
      setDate(d)
    } else if (type === 'week') {
      const dt = new Date(date + 'T00:00:00')
      dt.setDate(dt.getDate() + delta * 7)
      d = dt.toISOString().split('T')[0]
      setDate(d)
    }
    emit(type, y, m, d)
  }

  function periodLabel() {
    if (type === 'year') return String(year)
    if (type === 'month') return `${MONTHS_FR[month - 1]} ${year}`
    if (type === 'week') {
      const params = buildParams('week', year, month, date)
      const from = new Date(params.dateFrom + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
      const to = new Date(params.dateTo + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
      return `${from} – ${to}`
    }
    return null // mode jour : affiche le date input
  }

  const label = periodLabel()

  return (
    <div className="flex flex-wrap gap-2 items-center">

      {/* Sélecteur de type */}
      <div className="flex rounded-xl border border-gray-200 overflow-hidden text-xs font-medium">
        {[['day', 'Jour'], ['week', 'Sem.'], ['month', 'Mois'], ['year', 'Année']].map(([t, lbl]) => (
          <button
            key={t}
            type="button"
            onClick={() => { setType(t); emit(t, year, month, date) }}
            className={`px-3 py-2 transition-colors ${
              type === t ? 'bg-blue-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'
            }`}
          >
            {lbl}
          </button>
        ))}
      </div>

      {/* Navigation ‹ label/input › */}
      <div className="flex items-center rounded-xl border border-gray-200 bg-white overflow-hidden">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="px-2 py-2 text-gray-400 hover:bg-gray-50 hover:text-blue-600 transition-colors"
        >
          <ChevronLeft size={15} />
        </button>

        {label !== null ? (
          <span className="px-2 text-xs font-medium text-gray-700 min-w-[90px] text-center select-none">
            {label}
          </span>
        ) : (
          <input
            type="date"
            className="text-xs text-gray-700 bg-transparent border-0 outline-none px-1 py-2 w-auto"
            value={date}
            onChange={(e) => { const d = e.target.value; setDate(d); emit(type, year, month, d) }}
          />
        )}

        <button
          type="button"
          onClick={() => navigate(1)}
          className="px-2 py-2 text-gray-400 hover:bg-gray-50 hover:text-blue-600 transition-colors"
        >
          <ChevronRight size={15} />
        </button>
      </div>
    </div>
  )
}
