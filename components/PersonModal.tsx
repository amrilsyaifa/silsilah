'use client'

import { Person } from '@/lib/types'
import { formatPhone } from '@/lib/tree-utils'

interface Props {
  person: Person | null
  onClose: () => void
}

export default function PersonModal({ person, onClose }: Props) {
  if (!person) return null

  const icon = person.gender === 'male' ? '👨' : '🧕'

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-sm rounded-3xl shadow-2xl p-6 space-y-4 animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3">
          <span className="text-4xl">{icon}</span>
          <div>
            <h2 className="text-xl font-bold text-slate-800">{person.name}</h2>
            <p className="text-sm text-slate-500 capitalize">
              {person.gender === 'male' ? 'Laki-laki' : 'Perempuan'}
              {!person.is_alive && ` · ${person.gender === 'male' ? 'رَحِمَهُ ٱللَّٰهُ' : 'رَحِمَهَا ٱللَّٰهُ'}`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="ml-auto text-slate-400 hover:text-slate-600 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        <hr className="border-slate-100" />

        {/* Details */}
        <div className="space-y-2 text-sm">
          {person.birth_date && (
            <Row label="Lahir">
              {new Date(person.birth_date).toLocaleDateString('id-ID', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </Row>
          )}
          {person.birth_place && <Row label="Tempat Lahir">{person.birth_place}</Row>}
          {person.notes && <Row label="Catatan">{person.notes}</Row>}
        </div>

        {/* WA Button */}
        {person.phone && (
          <a
            href={`https://wa.me/${formatPhone(person.phone)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-3 rounded-2xl transition-colors"
          >
            <span>💬</span>
            Chat WhatsApp
          </a>
        )}
      </div>
    </div>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-2">
      <span className="text-slate-400 w-28 shrink-0">{label}</span>
      <span className="text-slate-700 font-medium">{children}</span>
    </div>
  )
}
