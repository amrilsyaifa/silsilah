'use client'

import { Component, ReactNode, use, useEffect, useState, lazy, Suspense } from 'react'
import { collection, getDocs, orderBy, query } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { Person, Relationship } from '@/lib/types'
import { loadPositions, NodePosition } from '@/lib/position-store'
import { getDescendantIds } from '@/lib/tree-utils'

const FamilyTree = lazy(() => import('@/components/FamilyTree'))

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
            <p className="text-sm text-slate-500">{this.state.error.message}</p>
            <button onClick={() => window.location.reload()} className="btn-primary text-sm">
              Muat Ulang
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

export default function DetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [persons, setPersons] = useState<Person[]>([])
  const [relationships, setRelationships] = useState<Relationship[]>([])
  const [positions, setPositions] = useState<Map<string, NodePosition>>(new Map())
  const [rootPerson, setRootPerson] = useState<Person | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const [personsSnap, relsSnap, savedPositions] = await Promise.all([
          getDocs(query(collection(db, 'persons'), orderBy('created_at'))),
          getDocs(collection(db, 'relationships')),
          loadPositions(),
        ])

        const allPersons = personsSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as Person)
        const allRels = relsSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as Relationship)

        const target = allPersons.find((p) => p.id === id)
        if (!target) {
          setError('Anggota keluarga tidak ditemukan.')
          setLoading(false)
          return
        }

        const descendantIds = getDescendantIds(id, allRels)
        const filteredPersons = allPersons.filter((p) => descendantIds.has(p.id))
        const filteredRels = allRels.filter(
          (r) => descendantIds.has(r.person_id) && descendantIds.has(r.related_person_id)
        )

        setRootPerson(target)
        setPersons(filteredPersons)
        setRelationships(filteredRels)
        setPositions(savedPositions)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Gagal memuat data')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [id])

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center space-y-3">
          <div className="text-4xl animate-pulse">🌳</div>
          <p className="text-slate-500 text-sm">Memuat silsilah...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="text-center space-y-3 max-w-sm">
          <div className="text-4xl">⚠️</div>
          <p className="text-sm text-slate-500">{error}</p>
          <a href="/" className="btn-primary text-sm inline-block">
            Kembali ke Beranda
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      <header className="shrink-0 px-4 py-3 bg-white/80 backdrop-blur border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <a href="/" className="text-slate-400 hover:text-slate-600 text-sm">←</a>
          <span className="text-2xl">🌳</span>
          <h1 className="text-lg font-bold text-slate-800">
            Keturunan {rootPerson?.name}
          </h1>
        </div>
        <span className="text-xs text-slate-400">{persons.length} orang</span>
      </header>

      <div className="flex-1 min-h-0">
        <TreeErrorBoundary>
          <Suspense fallback={
            <div className="flex h-full items-center justify-center">
              <div className="text-4xl animate-pulse">🌳</div>
            </div>
          }>
            <FamilyTree
              persons={persons}
              relationships={relationships}
              savedPositions={positions}
            />
          </Suspense>
        </TreeErrorBoundary>
      </div>
    </div>
  )
}
