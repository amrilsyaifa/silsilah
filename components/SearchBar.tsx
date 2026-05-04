'use client'

import { useState, useCallback } from 'react'

interface Props {
  onSearch: (query: string) => void
  matchCount?: number
}

export default function SearchBar({ onSearch, matchCount }: Props) {
  const [value, setValue] = useState('')

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setValue(e.target.value)
      onSearch(e.target.value)
    },
    [onSearch]
  )

  const handleClear = () => {
    setValue('')
    onSearch('')
  }

  return (
    <div className="relative flex items-center">
      <span className="absolute left-3 text-slate-400 text-sm">🔍</span>
      <input
        type="text"
        placeholder="Cari anggota keluarga..."
        value={value}
        onChange={handleChange}
        className="w-full pl-9 pr-9 py-2.5 rounded-2xl border border-slate-200 bg-white shadow-sm text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-300"
      />
      {value && (
        <button
          onClick={handleClear}
          className="absolute right-3 text-slate-400 hover:text-slate-600 text-lg leading-none"
        >
          ×
        </button>
      )}
      {value && matchCount !== undefined && (
        <div className="absolute -bottom-6 left-0 text-xs text-slate-500">
          {matchCount > 0 ? `${matchCount} ditemukan` : 'Tidak ditemukan'}
        </div>
      )}
    </div>
  )
}
