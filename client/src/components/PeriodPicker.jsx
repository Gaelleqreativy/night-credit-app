import { useState } from 'react'

const MONTHS_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
]
const CURRENT_YEAR = new Date().getFullYear()
const YEARS = Array.from({ length: 5 }, (_, i) => CURRENT_YEAR - i)

// Retourne { year } ou { dateFrom, dateTo } selon le type sélectionné
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
    const dt = new Date(date)
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

  return (
    <div className="flex flex-wrap gap-2 items-center">

      {/* Sélecteur de type */}
      <div className="flex rounded-xl border border-gray-200 overflow-hidden text-xs font-medium">
        {[['day', 'Jour'], ['week', 'Sem.'], ['month', 'Mois'], ['year', 'Année']].map(([t, label]) => (
          <button
            key={t}
            type="button"
            onClick={() => { setType(t); emit(t, year, month, date) }}
            className={`px-3 py-2 transition-colors ${
              type === t ? 'bg-blue-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Sélecteur d'année (modes Année et Mois) */}
      {(type === 'year' || type === 'month') && (
        <select
          className="input w-auto text-sm"
          value={year}
          onChange={(e) => { const y = Number(e.target.value); setYear(y); emit(type, y, month, date) }}
        >
          {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
      )}

      {/* Sélecteur de mois */}
      {type === 'month' && (
        <select
          className="input w-auto text-sm"
          value={month}
          onChange={(e) => { const m = Number(e.target.value); setMonth(m); emit(type, year, m, date) }}
        >
          {MONTHS_FR.map((label, i) => (
            <option key={i + 1} value={i + 1}>{label}</option>
          ))}
        </select>
      )}

      {/* Sélecteur de date (modes Jour et Semaine) */}
      {(type === 'day' || type === 'week') && (
        <input
          type="date"
          className="input w-auto text-sm"
          value={date}
          onChange={(e) => { setDate(e.target.value); emit(type, year, month, e.target.value) }}
        />
      )}
    </div>
  )
}
