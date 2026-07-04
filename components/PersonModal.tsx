'use client'

import { useState } from 'react'
import { Person, Relationship } from '@/lib/types'
import { DESCENDANT_LABELS, formatPhone, countDescendants } from '@/lib/tree-utils'

interface Props {
  person: Person | null
  persons: Person[]
  relationships: Relationship[]
  visibleLevels: Set<string>
  onVisibleLevelsChange: (levels: Set<string>) => void
  onClose: () => void
}

export default function PersonModal({
  person,
  persons,
  relationships,
  visibleLevels,
  onVisibleLevelsChange,
  onClose,
}: Props) {
  const [expandedLevel, setExpandedLevel] = useState<string | null>(null)
  const [filterOpen, setFilterOpen] = useState(false)

  if (!person) return null

  const icon = person.gender === 'male' ? '👨' : '🧕'
  const descendants = countDescendants(person.id, relationships)
  const firstHiddenIndex = descendants.findIndex(
    (d, index) =>
      !visibleLevels.has(
        DESCENDANT_LABELS[Math.min(index, DESCENDANT_LABELS.length - 1)] ?? d.label
      )
  )
  const visibleDescendants = firstHiddenIndex === -1
    ? descendants
    : descendants.slice(0, firstHiddenIndex)
  const personMap = new Map(persons.map((p) => [p.id, p]))

  const toggleLevel = (label: string) => {
    setExpandedLevel((prev) => (prev === label ? null : label))
  }

  const toggleVisibleLevel = (label: string) => {
    const index = DESCENDANT_LABELS.indexOf(label)
    if (index === -1) return

    const next = new Set(visibleLevels)
    if (next.has(label)) {
      for (let i = index; i < DESCENDANT_LABELS.length; i++) {
        next.delete(DESCENDANT_LABELS[i])
      }
    } else {
      for (let i = 0; i <= index; i++) {
        next.add(DESCENDANT_LABELS[i])
      }
    }
    onVisibleLevelsChange(next)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-sm rounded-3xl shadow-2xl p-6 space-y-4 animate-slide-up max-h-[85vh] overflow-y-auto"
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

        {/* Descendants */}
        {descendants.length > 0 && (
          <>
            <hr className="border-slate-100" />
            <div className="space-y-1 text-sm">
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Keturunan</p>
                <button
                  type="button"
                  onClick={() => setFilterOpen((prev) => !prev)}
                  className="flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-200"
                >
                  <span
                    className="text-[10px] transition-transform"
                    style={{ transform: filterOpen ? 'rotate(90deg)' : undefined }}
                  >
                    ▶
                  </span>
                  {filterOpen ? 'Hide' : 'Show'} filter
                </button>
              </div>
              {filterOpen && (
                <div className="grid grid-cols-2 gap-2 pb-3 sm:grid-cols-3">
                  {DESCENDANT_LABELS.map((label) => (
                    <label
                      key={label}
                      className="flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600"
                    >
                      <input
                        type="checkbox"
                        checked={visibleLevels.has(label)}
                        onChange={() => toggleVisibleLevel(label)}
                        className="h-4 w-4 rounded border-slate-300 accent-blue-600"
                      />
                      {label}
                    </label>
                  ))}
                </div>
              )}
              {visibleDescendants.length === 0 && (
                <p className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-400">
                  Semua kategori keturunan disembunyikan.
                </p>
              )}
              {visibleDescendants.map((d) => {
                const isExpanded = expandedLevel === d.label
                return (
                  <div key={d.label}>
                    <button
                      onClick={() => toggleLevel(d.label)}
                      className="flex items-center gap-2 w-full py-1.5 hover:bg-slate-50 rounded-lg px-1 -mx-1 transition-colors"
                    >
                      <span className="text-xs text-slate-400 transition-transform" style={{ transform: isExpanded ? 'rotate(90deg)' : undefined }}>
                        ▶
                      </span>
                      <span className="text-slate-400 w-24 shrink-0 text-left">{d.label}</span>
                      <span className="text-slate-700 font-medium">{d.count} orang</span>
                    </button>
                    {isExpanded && (
                      <div className="ml-6 mt-1 mb-2 space-y-1 max-h-48 overflow-y-auto">
                        {d.personIds.map((id) => {
                          const p = personMap.get(id)
                          if (!p) return null
                          return (
                            <div key={id} className="flex items-center gap-2 text-sm py-0.5">
                              <span className="text-base">{p.gender === 'male' ? '👨' : '🧕'}</span>
                              <span className="text-slate-700">{p.name}</span>
                              {!p.is_alive && <span className="text-xs text-slate-400">†</span>}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </>
        )}

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
