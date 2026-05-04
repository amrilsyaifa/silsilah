'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Person, Relationship } from '@/lib/types'
import FamilyTree from '@/components/FamilyTree'

export default function HomePage() {
  const [persons, setPersons] = useState<Person[]>([])
  const [relationships, setRelationships] = useState<Relationship[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()

    async function load() {
      const [{ data: pData }, { data: rData }] = await Promise.all([
        supabase.from('persons').select('*').order('created_at'),
        supabase.from('relationships').select('*'),
      ])
      setPersons(pData ?? [])
      setRelationships(rData ?? [])
      setLoading(false)
    }

    load()
  }, [])

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center space-y-3">
          <div className="text-4xl animate-pulse">🌳</div>
          <p className="text-slate-500 text-sm">Memuat silsilah keluarga...</p>
        </div>
      </div>
    )
  }

  if (persons.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center space-y-4 px-6">
          <div className="text-6xl">👴</div>
          <h1 className="text-2xl font-bold text-slate-700">Silsilah Keluarga</h1>
          <p className="text-slate-400 text-sm">
            Belum ada data keluarga. Silakan login ke{' '}
            <a href="/admin" className="text-blue-500 underline">
              panel admin
            </a>{' '}
            untuk menambahkan.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      <header className="shrink-0 px-4 py-3 bg-white/80 backdrop-blur border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🌳</span>
          <h1 className="text-lg font-bold text-slate-800">Silsilah Keluarga</h1>
        </div>
        <a href="/admin" className="text-xs text-slate-400 hover:text-slate-600">
          Admin
        </a>
      </header>

      <div className="flex-1 min-h-0">
        <FamilyTree persons={persons} relationships={relationships} />
      </div>
    </div>
  )
}
