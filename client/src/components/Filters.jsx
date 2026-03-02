const MONTHS_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
]

export default function Filters({
  year, setYear,
  month, setMonth,
  establishmentId, setEstablishmentId, establishments = [],
  type, setType,
}) {
  const years = []
  const current = new Date().getFullYear()
  for (let y = current; y >= current - 5; y--) years.push(y)

  function handleYearChange(val) {
    setYear(val)
    if (!val && setMonth) setMonth('') // réinitialise le mois si on efface l'année
  }

  return (
    <div className="flex flex-wrap gap-2 items-center">

      {/* Année */}
      <select
        className="input w-auto text-sm"
        value={year}
        onChange={(e) => handleYearChange(e.target.value)}
      >
        <option value="">Toutes les années</option>
        {years.map((y) => (
          <option key={y} value={y}>{y}</option>
        ))}
      </select>

      {/* Mois (visible uniquement si une année est sélectionnée) */}
      {year && setMonth && (
        <select
          className="input w-auto text-sm"
          value={month || ''}
          onChange={(e) => setMonth(e.target.value)}
        >
          <option value="">Tous les mois</option>
          {MONTHS_FR.map((label, i) => (
            <option key={i + 1} value={i + 1}>{label}</option>
          ))}
        </select>
      )}

      {/* Établissement */}
      {establishments.length > 0 && (
        <select
          className="input w-auto text-sm"
          value={establishmentId}
          onChange={(e) => setEstablishmentId(e.target.value)}
        >
          <option value="">Tous les établissements</option>
          {establishments.map((e) => (
            <option key={e.id} value={e.id}>{e.name}</option>
          ))}
        </select>
      )}

      {/* Type */}
      {setType && (
        <select
          className="input w-auto text-sm"
          value={type}
          onChange={(e) => setType(e.target.value)}
        >
          <option value="">Tous les types</option>
          <option value="CONSOMMATION">Consommations</option>
          <option value="PAIEMENT">Paiements</option>
        </select>
      )}
    </div>
  )
}
