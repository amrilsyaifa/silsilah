'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  orderBy,
  query,
  serverTimestamp,
} from 'firebase/firestore'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { db, auth } from '@/lib/firebase'
import { Person, Relationship, PersonFormData } from '@/lib/types'
import PersonForm from '@/components/admin/PersonForm'
import RelationshipManager from '@/components/admin/RelationshipManager'

type Tab = 'persons' | 'relationships'
type Modal = { type: 'add' } | { type: 'edit'; person: Person } | null

export default function AdminPage() {
  const router = useRouter()

  const [persons, setPersons] = useState<Person[]>([])
  const [relationships, setRelationships] = useState<Relationship[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('persons')
  const [modal, setModal] = useState<Modal>(null)
  const [search, setSearch] = useState('')
  const [userEmail, setUserEmail] = useState('')

  const loadData = useCallback(async () => {
    const [personsSnap, relsSnap] = await Promise.all([
      getDocs(query(collection(db, 'persons'), orderBy('name'))),
      getDocs(collection(db, 'relationships')),
    ])
    setPersons(personsSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as Person))
    setRelationships(relsSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as Relationship))
  }, [])

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.replace('/admin/login')
      } else {
        setUserEmail(user.email ?? '')
        setLoading(false)
        loadData()
      }
    })
    return unsubscribe
  }, [loadData, router])

  const handleLogout = async () => {
    await signOut(auth)
    router.replace('/admin/login')
  }

  const handleSavePerson = async (data: PersonFormData) => {
    const payload = {
      name: data.name,
      gender: data.gender,
      phone: data.phone || null,
      birth_date: data.birth_date || null,
      birth_place: data.birth_place || null,
      is_alive: data.is_alive,
      notes: data.notes || null,
      updated_at: serverTimestamp(),
    }

    if (modal?.type === 'edit') {
      await updateDoc(doc(db, 'persons', modal.person.id), payload)
    } else {
      await addDoc(collection(db, 'persons'), {
        ...payload,
        created_at: serverTimestamp(),
      })
    }

    await loadData()
    setModal(null)
  }

  const handleDeletePerson = async (id: string) => {
    if (!confirm('Hapus anggota ini?')) return
    await deleteDoc(doc(db, 'persons', id))
    await loadData()
  }

  const handleAddRelationship = async (rel: Omit<Relationship, 'id'>) => {
    await addDoc(collection(db, 'relationships'), rel)
    await loadData()
  }

  const handleDeleteRelationship = async (id: string) => {
    await deleteDoc(doc(db, 'relationships', id))
    await loadData()
  }

  const filteredPersons = persons.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-3xl animate-pulse">⏳</div>
      </div>
    )
  }

  return (
    <div className="min-h-full bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-100 px-4 py-3 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-2">
          <a href="/" className="text-slate-400 hover:text-slate-600 text-sm">←</a>
          <span className="text-2xl">🌳</span>
          <h1 className="font-bold text-slate-800">Admin Panel</h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400 hidden sm:block">{userEmail}</span>
          <button onClick={handleLogout} className="btn-secondary !py-1.5 !px-3 text-xs">
            Keluar
          </button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto p-4 space-y-4">
        {/* Tabs */}
        <div className="flex gap-2">
          {(['persons', 'relationships'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
                tab === t
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {t === 'persons' ? '👥 Anggota' : '🔗 Relasi'}
            </button>
          ))}
        </div>

        {/* Persons tab */}
        {tab === 'persons' && (
          <div className="space-y-4">
            <div className="flex gap-3">
              <input
                type="text"
                placeholder="Cari nama..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input flex-1"
              />
              <button onClick={() => setModal({ type: 'add' })} className="btn-primary whitespace-nowrap">
                + Tambah
              </button>
            </div>

            <div className="space-y-2">
              {filteredPersons.length === 0 && (
                <div className="text-center py-12 text-slate-400">
                  {search ? 'Tidak ditemukan' : 'Belum ada anggota'}
                </div>
              )}
              {filteredPersons.map((person) => (
                <div
                  key={person.id}
                  className="bg-white rounded-2xl border border-slate-100 p-4 flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-2xl shrink-0">
                      {person.gender === 'male' ? '👨' : '👩'}
                    </span>
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-800 truncate">{person.name}</p>
                      <p className="text-xs text-slate-400">
                        {person.gender === 'male' ? 'Laki-laki' : 'Perempuan'}
                        {person.birth_date && ` · ${new Date(person.birth_date).getFullYear()}`}
                        {person.phone && ` · 📱 ${person.phone}`}
                        {!person.is_alive && ' · †'}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => setModal({ type: 'edit', person })}
                      className="btn-secondary !py-1.5 !px-3 text-xs"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeletePerson(person.id)}
                      className="btn-danger !py-1.5 !px-3 text-xs"
                    >
                      Hapus
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Relationships tab */}
        {tab === 'relationships' && (
          <div className="bg-white rounded-2xl border border-slate-100 p-4">
            <RelationshipManager
              persons={persons}
              relationships={relationships}
              onAdd={handleAddRelationship}
              onDelete={handleDeleteRelationship}
            />
          </div>
        )}
      </div>

      {/* Modal overlay */}
      {modal && (
        <div
          className="fixed inset-0 z-40 bg-black/40 flex items-end sm:items-center justify-center p-4"
          onClick={() => setModal(null)}
        >
          <div
            className="bg-white w-full max-w-lg rounded-3xl shadow-2xl p-6 animate-slide-up max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold text-slate-800 mb-4">
              {modal.type === 'add' ? '➕ Tambah Anggota' : '✏️ Edit Anggota'}
            </h2>
            <PersonForm
              initial={modal.type === 'edit' ? modal.person : undefined}
              onSubmit={handleSavePerson}
              onCancel={() => setModal(null)}
            />
          </div>
        </div>
      )}
    </div>
  )
}
