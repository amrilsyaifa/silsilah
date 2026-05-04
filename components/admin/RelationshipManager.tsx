'use client'

import { useState } from 'react'
import { Person, Relationship } from '@/lib/types'

interface Props {
  persons: Person[]
  relationships: Relationship[]
  onAdd: (rel: Omit<Relationship, 'id'>) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

export default function RelationshipManager({ persons, relationships, onAdd, onDelete }: Props) {
  const [personId, setPersonId] = useState('')
  const [relatedId, setRelatedId] = useState('')
  const [type, setType] = useState<'father' | 'mother' | 'spouse'>('father')
  const [loading, setLoading] = useState(false)

  const personMap = new Map(persons.map((p) => [p.id, p]))

  const handleAdd = async () => {
    if (!personId || !relatedId || personId === relatedId) return
    setLoading(true)
    try {
      await onAdd({ person_id: personId, related_person_id: relatedId, type })
      setPersonId('')
      setRelatedId('')
    } finally {
      setLoading(false)
    }
  }

  const typeLabel = { father: 'Ayah dari', mother: 'Ibu dari', spouse: 'Pasangan dari' }

  return (
    <div className="space-y-4">
      {/* Add form */}
      <div className="bg-slate-50 rounded-2xl p-4 space-y-3">
        <h3 className="text-sm font-semibold text-slate-600">Tambah Relasi</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <select value={personId} onChange={(e) => setPersonId(e.target.value)} className="input">
            <option value="">-- Pilih orang --</option>
            {persons.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          <select
            value={type}
            onChange={(e) => setType(e.target.value as typeof type)}
            className="input"
          >
            <option value="father">Ayah dari</option>
            <option value="mother">Ibu dari</option>
            <option value="spouse">Pasangan dari</option>
          </select>

          <select value={relatedId} onChange={(e) => setRelatedId(e.target.value)} className="input">
            <option value="">-- Pilih orang --</option>
            {persons.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={handleAdd}
          disabled={loading || !personId || !relatedId}
          className="btn-primary w-full"
        >
          {loading ? 'Menambahkan...' : 'Tambah Relasi'}
        </button>
      </div>

      {/* List */}
      <div className="space-y-2 max-h-80 overflow-y-auto">
        {relationships.length === 0 && (
          <p className="text-sm text-slate-400 text-center py-4">Belum ada relasi</p>
        )}
        {relationships.map((rel) => {
          const p1 = personMap.get(rel.person_id)
          const p2 = personMap.get(rel.related_person_id)
          if (!p1 || !p2) return null
          return (
            <div
              key={rel.id}
              className="flex items-center justify-between bg-white border border-slate-100 rounded-xl px-4 py-2 text-sm"
            >
              <span className="text-slate-700">
                <strong>{p1.name}</strong>{' '}
                <span className="text-slate-400">{typeLabel[rel.type as keyof typeof typeLabel]}</span>{' '}
                <strong>{p2.name}</strong>
              </span>
              <button
                onClick={() => onDelete(rel.id)}
                className="text-red-400 hover:text-red-600 font-bold ml-4"
              >
                ×
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
