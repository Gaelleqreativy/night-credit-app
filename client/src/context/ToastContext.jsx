import { createContext, useContext, useState, useCallback } from 'react'

const ToastContext = createContext(null)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const addToast = useCallback((message, type = 'success', duration = 3500) => {
    const id = Date.now() + Math.random()
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), duration)
  }, [])

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  )
}

export function useToast() {
  return useContext(ToastContext)
}

const STYLES = {
  success: 'bg-white border-emerald-200 text-emerald-800 shadow-lg',
  error: 'bg-white border-red-200 text-red-800 shadow-lg',
  info: 'bg-white border-blue-200 text-blue-800 shadow-lg',
  warning: 'bg-white border-amber-200 text-amber-800 shadow-lg',
}

const ICONS = {
  success: '✓',
  error: '✕',
  info: 'ℹ',
  warning: '⚠️',
}

function ToastContainer({ toasts, onRemove }) {
  if (toasts.length === 0) return null
  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`flex items-start gap-3 px-4 py-3 rounded-xl border shadow-xl pointer-events-auto animate-slide-in ${STYLES[t.type] || STYLES.info}`}
        >
          <span className="text-sm font-bold shrink-0 mt-0.5">{ICONS[t.type]}</span>
          <p className="text-sm flex-1">{t.message}</p>
          <button
            onClick={() => onRemove(t.id)}
            className="text-current opacity-50 hover:opacity-100 text-lg leading-none shrink-0"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  )
}
