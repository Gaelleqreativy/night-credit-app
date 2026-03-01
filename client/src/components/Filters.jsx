export default function Filters({ year, setYear, establishmentId, setEstablishmentId, establishments = [], type, setType }) {
  const years = []
  const current = new Date().getFullYear()
  for (let y = current; y >= current - 5; y--) years.push(y)

  return (
    <div className="flex flex-wrap gap-3 items-center">
      <div>
        <select
          className="input w-auto text-sm"
          value={year}
          onChange={(e) => setYear(e.target.value)}
        >
          <option value="">Toutes les années</option>
          {years.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>

      {establishments.length > 0 && (
        <div>
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
        </div>
      )}

      {setType && (
        <div>
          <select
            className="input w-auto text-sm"
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            <option value="">Tous les types</option>
            <option value="CONSOMMATION">Consommations</option>
            <option value="PAIEMENT">Paiements</option>
          </select>
        </div>
      )}
    </div>
  )
}
