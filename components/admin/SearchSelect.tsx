'use client'

import { useEffect, useRef, useState } from 'react'
import { Person } from '@/lib/types'

interface Props {
  persons: Person[]
  value: string
  onChange: (id: string) => void
  placeholder?: string
}

export default function SearchSelect({ persons, value, onChange, placeholder = '-- Pilih orang --' }: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const selected = persons.find((p) => p.id === value)

  const filtered = query
    ? persons.filter((p) => p.name.toLowerCase().includes(query.toLowerCase()))
    : persons

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelect = (id: string) => {
    onChange(id)
    setQuery('')
    setOpen(false)
  }

  const handleClear = () => {
    onChange('')
    setQuery('')
  }

  return (
    <div ref={ref} className="relative">
      <div
        className="input flex items-center gap-2 cursor-pointer"
        onClick={() => {
          setOpen(true)
          setTimeout(() => inputRef.current?.focus(), 0)
        }}
      >
        {open ? (
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 outline-none bg-transparent text-sm"
            placeholder="Ketik nama..."
          />
        ) : (
          <span className={`flex-1 text-sm truncate ${selected ? 'text-slate-800' : 'text-slate-400'}`}>
            {selected ? selected.name : placeholder}
          </span>
        )}
        {selected && !open && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); handleClear() }}
            className="text-slate-400 hover:text-slate-600 text-lg leading-none"
          >
            ×
          </button>
        )}
        <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {open && (
        <div className="absolute z-30 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
          {filtered.length === 0 && (
            <div className="px-3 py-2 text-sm text-slate-400">Tidak ditemukan</div>
          )}
          {filtered.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => handleSelect(p.id)}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-blue-50 flex items-center gap-2 ${
                p.id === value ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-700'
              }`}
            >
              <span className="shrink-0">{p.gender === 'male' ? '👨' : '🧕'}</span>
              {p.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
