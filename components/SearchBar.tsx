'use client'

import { useState, useCallback } from 'react'

interface Props {
  onSearch: (query: string) => void
  matchCount?: number
  matchIndex?: number
  onNext?: () => void
  onPrev?: () => void
}

export default function SearchBar({ onSearch, matchCount, matchIndex, onNext, onPrev }: Props) {
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

  const hasMatches = value && matchCount !== undefined && matchCount > 0

  return (
    <div className="space-y-0">
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
      </div>

      {value && matchCount !== undefined && (
        <div className="flex items-center justify-between mt-1.5 px-1">
          <span className="text-xs text-slate-500">
            {matchCount > 0
              ? `${(matchIndex ?? 0) + 1} / ${matchCount} ditemukan`
              : 'Tidak ditemukan'}
          </span>
          {hasMatches && matchCount > 1 && (
            <div className="flex gap-1">
              <button
                onClick={onPrev}
                className="w-6 h-6 flex items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 text-xs"
              >
                ◀
              </button>
              <button
                onClick={onNext}
                className="w-6 h-6 flex items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 text-xs"
              >
                ▶
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
