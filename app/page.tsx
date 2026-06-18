'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { collection, getDocs, orderBy, query } from 'firebase/firestore'
import { onAuthStateChanged } from 'firebase/auth'
import { db, auth, isAdmin } from '@/lib/firebase'
import { Person, Relationship } from '@/lib/types'
import { loadPositions, savePosition, NodePosition } from '@/lib/position-store'
import FamilyTree from '@/components/FamilyTree'

export default function HomePage() {
  const [persons, setPersons] = useState<Person[]>([])
  const [relationships, setRelationships] = useState<Relationship[]>([])
  const [positions, setPositions] = useState<Map<string, NodePosition>>(new Map())
  const [loading, setLoading] = useState(true)
  const [canSave, setCanSave] = useState(false)
  const saveTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map())

  useEffect(() => {
    async function load() {
      const [personsSnap, relsSnap, savedPositions] = await Promise.all([
        getDocs(query(collection(db, 'persons'), orderBy('created_at'))),
        getDocs(collection(db, 'relationships')),
        loadPositions(),
      ])
      setPersons(personsSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as Person))
      setRelationships(relsSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as Relationship))
      setPositions(savedPositions)
      setLoading(false)
    }

    load()

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCanSave(isAdmin(user?.email))
    })
    return unsubscribe
  }, [])

  const handleNodeDragStop = useCallback(
    (personId: string, position: { x: number; y: number }) => {
      if (!canSave) return

      setPositions((prev) => {
        const next = new Map(prev)
        next.set(personId, position)
        return next
      })

      const existing = saveTimeouts.current.get(personId)
      if (existing) clearTimeout(existing)

      saveTimeouts.current.set(
        personId,
        setTimeout(async () => {
          try {
            await savePosition(personId, position)
          } catch (err) {
            console.error('Failed to save position:', err)
          }
          saveTimeouts.current.delete(personId)
        }, 500)
      )
    },
    [canSave]
  )

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
        <FamilyTree
          persons={persons}
          relationships={relationships}
          savedPositions={positions}
          onNodeDragStop={canSave ? handleNodeDragStop : undefined}
        />
      </div>
    </div>
  )
}
