'use client'

import { Component, ReactNode, useEffect, useState } from 'react'
import { collection, getDocs, orderBy, query } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { Person, Relationship } from '@/lib/types'
import { loadPositions, NodePosition } from '@/lib/position-store'
import FamilyTree from '@/components/FamilyTree'

class TreeErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex h-full items-center justify-center p-6">
          <div className="text-center space-y-3 max-w-sm">
            <div className="text-4xl">⚠️</div>
            <h2 className="text-lg font-bold text-slate-700">Gagal memuat pohon keluarga</h2>
            <p className="text-sm text-slate-500">
              {this.state.error.message}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="btn-primary text-sm"
            >
              Muat Ulang
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

export default function HomePage() {
  const [persons, setPersons] = useState<Person[]>([])
  const [relationships, setRelationships] = useState<Relationship[]>([])
  const [positions, setPositions] = useState<Map<string, NodePosition>>(new Map())
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const [personsSnap, relsSnap, savedPositions] = await Promise.all([
          getDocs(query(collection(db, 'persons'), orderBy('created_at'))),
          getDocs(collection(db, 'relationships')),
          loadPositions(),
        ])
        setPersons(personsSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as Person))
        setRelationships(relsSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as Relationship))
        setPositions(savedPositions)
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : 'Gagal memuat data')
      } finally {
        setLoading(false)
      }
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

  if (loadError) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="text-center space-y-3 max-w-sm">
          <div className="text-4xl">⚠️</div>
          <h2 className="text-lg font-bold text-slate-700">Terjadi Kesalahan</h2>
          <p className="text-sm text-slate-500">{loadError}</p>
          <button onClick={() => window.location.reload()} className="btn-primary text-sm">
            Coba Lagi
          </button>
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
        <TreeErrorBoundary>
          <FamilyTree
            persons={persons}
            relationships={relationships}
            savedPositions={positions}
          />
        </TreeErrorBoundary>
      </div>
    </div>
  )
}
