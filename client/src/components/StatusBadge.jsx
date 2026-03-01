export default function StatusBadge({ status }) {
  const map = {
    EN_COURS: { label: 'En cours', cls: 'badge-yellow' },
    SOLDE: { label: 'Soldé', cls: 'badge-green' },
    EN_RETARD: { label: 'En retard', cls: 'badge-red' },
  }
  const { label, cls } = map[status] || { label: status, cls: 'badge-blue' }
  return <span className={`badge ${cls}`}>{label}</span>
}
