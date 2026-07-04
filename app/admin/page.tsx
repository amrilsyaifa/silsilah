'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
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
import { db, auth, isAdmin } from '@/lib/firebase'
import { Person, Relationship, PersonFormData } from '@/lib/types'
import { loadPositions, saveAllPositions, NodePosition } from '@/lib/position-store'
import PersonForm from '@/components/admin/PersonForm'
import RelationshipManager from '@/components/admin/RelationshipManager'
import FamilyTree from '@/components/FamilyTree'
import { exportBackup, importBackup } from '@/lib/backup'

type Tab = 'persons' | 'relationships' | 'audit' | 'layout' | 'backup'
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

  const [savedPositions, setSavedPositions] = useState<Map<string, NodePosition>>(new Map())
  const [draftPositions, setDraftPositions] = useState<Map<string, NodePosition> | null>(null)
  const [saving, setSaving] = useState(false)

  const loadData = useCallback(async () => {
    const [personsSnap, relsSnap, positions] = await Promise.all([
      getDocs(query(collection(db, 'persons'), orderBy('created_at'))),
      getDocs(collection(db, 'relationships')),
      loadPositions(),
    ])
    setPersons(personsSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as Person))
    setRelationships(relsSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as Relationship))
    setSavedPositions(positions)
    setDraftPositions(null)
  }, [])

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user || !isAdmin(user.email)) {
        if (user) await signOut(auth)
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

  const handlePositionsChange = useCallback((positions: Map<string, { x: number; y: number }>) => {
    setDraftPositions(positions)
  }, [])

  const handleSaveLayout = async () => {
    if (!draftPositions) return
    setSaving(true)
    try {
      await saveAllPositions(draftPositions)
      setSavedPositions(draftPositions)
      setDraftPositions(null)
    } catch (err) {
      console.error('Failed to save layout:', err)
      alert('Gagal menyimpan layout. Silakan coba lagi.')
    } finally {
      setSaving(false)
    }
  }

  const handleResetLayout = () => {
    setDraftPositions(null)
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
    <div className={`bg-slate-50 ${tab === 'layout' ? 'h-full flex flex-col' : 'min-h-full'}`}>
      {/* Header */}
      <header className="bg-white border-b border-slate-100 px-4 py-3 flex items-center justify-between sticky top-0 z-20 shrink-0">
        <div className="flex items-center gap-2">
          <Link href="/" className="text-slate-400 hover:text-slate-600 text-sm">←</Link>
          <span className="text-2xl">🌳</span>
          <h1 className="font-bold text-slate-800">Admin Panel</h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400 hidden sm:block">{userEmail}</span>
          <button onClick={handleLogout} className="btn-secondary py-1.5! px-3! text-xs">
            Keluar
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className={`${tab === 'layout' ? '' : 'max-w-4xl mx-auto'} p-4 ${tab === 'layout' ? 'flex flex-col flex-1 min-h-0 space-y-3' : 'space-y-4'}`}>
        <div className="flex gap-2 shrink-0">
          {(['persons', 'relationships', 'audit', 'layout', 'backup'] as Tab[]).map((t) => {
            const labels: Record<Tab, string> = {
              persons: '👥 Anggota',
              relationships: '🔗 Relasi',
              audit: '🧭 Audit',
              layout: '📐 Layout',
              backup: '💾 Backup',
            }
            return (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
                  tab === t
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                {labels[t]}
              </button>
            )
          })}
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
                      {person.gender === 'male' ? '👨' : '🧕'}
                    </span>
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-800 truncate">{person.name}</p>
                      <p className="text-xs text-slate-400">
                        {person.gender === 'male' ? 'Laki-laki' : 'Perempuan'}
                        {person.birth_date && ` · ${new Date(person.birth_date).getFullYear()}`}
                        {person.phone && ` · 📱 ${person.phone}`}
                        {!person.is_alive && ` · ${person.gender === 'male' ? 'رَحِمَهُ ٱللَّٰهُ' : 'رَحِمَهَا ٱللَّٰهُ'}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => setModal({ type: 'edit', person })}
                      className="btn-secondary py-1.5! px-3! text-xs"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeletePerson(person.id)}
                      className="btn-danger py-1.5! px-3! text-xs"
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

        {/* Audit tab */}
        {tab === 'audit' && (
          <RelationshipAuditTab
            persons={persons}
            relationships={relationships}
            onEdit={(person) => setModal({ type: 'edit', person })}
          />
        )}

        {/* Layout tab */}
        {tab === 'layout' && (
          <>
            <div className="flex items-center gap-3 shrink-0">
              <p className="text-sm text-slate-500 flex-1">
                Drag node untuk atur posisi. Klik kiri + drag di area kosong untuk select banyak node.
                {draftPositions && (
                  <span className="text-amber-600 font-medium ml-2">Ada perubahan belum disimpan</span>
                )}
              </p>
              {draftPositions && (
                <button
                  onClick={handleResetLayout}
                  className="btn-secondary py-1.5! px-3! text-xs whitespace-nowrap"
                >
                  Reset
                </button>
              )}
              <button
                onClick={handleSaveLayout}
                disabled={!draftPositions || saving}
                className="btn-primary py-1.5! px-4! text-sm whitespace-nowrap disabled:opacity-50"
              >
                {saving ? 'Menyimpan...' : 'Simpan Layout'}
              </button>
            </div>
            <div className="flex-1 min-h-0 rounded-2xl overflow-hidden border border-slate-200">
              <FamilyTree
                persons={persons}
                relationships={relationships}
                savedPositions={draftPositions ?? savedPositions}
                editable
                onPositionsChange={handlePositionsChange}
              />
            </div>
          </>
        )}

        {/* Backup tab */}
        {tab === 'backup' && (
          <BackupTab onRestored={loadData} />
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

type AuditFilter = 'noLinks' | 'noSpouse' | 'noChildren' | 'noSpouseAndChildren'

function RelationshipAuditTab({
  persons,
  relationships,
  onEdit,
}: {
  persons: Person[]
  relationships: Relationship[]
  onEdit: (person: Person) => void
}) {
  const [filter, setFilter] = useState<AuditFilter>('noSpouseAndChildren')
  const [query, setQuery] = useState('')

  const relationInfo = new Map<
    string,
    { spouses: Set<string>; children: Set<string>; parents: Set<string>; any: number }
  >()

  for (const person of persons) {
    relationInfo.set(person.id, {
      spouses: new Set(),
      children: new Set(),
      parents: new Set(),
      any: 0,
    })
  }

  for (const rel of relationships) {
    const source = relationInfo.get(rel.person_id)
    const target = relationInfo.get(rel.related_person_id)
    if (!source || !target) continue

    source.any++
    target.any++

    if (rel.type === 'spouse') {
      source.spouses.add(rel.related_person_id)
      target.spouses.add(rel.person_id)
    } else {
      source.children.add(rel.related_person_id)
      target.parents.add(rel.person_id)
    }
  }

  const rows = persons
    .map((person) => {
      const info = relationInfo.get(person.id)!
      return {
        person,
        spouseCount: info.spouses.size,
        childCount: info.children.size,
        parentCount: info.parents.size,
        relationCount: info.any,
      }
    })
    .filter((row) => {
      if (filter === 'noLinks') return row.relationCount === 0
      if (filter === 'noSpouse') return row.spouseCount === 0
      if (filter === 'noChildren') return row.childCount === 0
      return row.spouseCount === 0 && row.childCount === 0
    })
    .filter((row) => row.person.name.toLowerCase().includes(query.toLowerCase()))

  const counts: Record<AuditFilter, number> = {
    noLinks: persons.filter((person) => relationInfo.get(person.id)!.any === 0).length,
    noSpouse: persons.filter((person) => relationInfo.get(person.id)!.spouses.size === 0).length,
    noChildren: persons.filter((person) => relationInfo.get(person.id)!.children.size === 0).length,
    noSpouseAndChildren: persons.filter((person) => {
      const info = relationInfo.get(person.id)!
      return info.spouses.size === 0 && info.children.size === 0
    }).length,
  }

  const filters: { id: AuditFilter; label: string; description: string }[] = [
    {
      id: 'noSpouseAndChildren',
      label: 'Tanpa pasangan & anak',
      description: 'Tidak punya pasangan dan tidak punya anak.',
    },
    {
      id: 'noLinks',
      label: 'Tanpa relasi apapun',
      description: 'Tidak terhubung sebagai anak, orang tua, atau pasangan.',
    },
    {
      id: 'noSpouse',
      label: 'Tanpa pasangan',
      description: 'Belum punya relasi suami/istri.',
    },
    {
      id: 'noChildren',
      label: 'Tanpa anak',
      description: 'Belum punya relasi ayah/ibu ke anak.',
    },
  ]

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-slate-100 p-4 space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="font-bold text-slate-800">Audit Relasi</h2>
            <p className="text-sm text-slate-500">
              Cari anggota yang belum punya pasangan atau anak untuk membantu trace data yang belum lengkap.
            </p>
          </div>
          <div className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-600">
            <span className="font-semibold">{rows.length}</span> hasil
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {filters.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setFilter(item.id)}
              className={`rounded-xl border px-3 py-3 text-left transition ${
                filter === item.id
                  ? 'border-blue-200 bg-blue-50 text-blue-700'
                  : 'border-slate-100 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold">{item.label}</span>
                <span className="rounded-lg bg-white/80 px-2 py-0.5 text-xs font-bold">
                  {counts[item.id]}
                </span>
              </div>
              <p className="mt-1 text-xs opacity-70">{item.description}</p>
            </button>
          ))}
        </div>

        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cari nama di hasil audit..."
          className="input"
        />
      </div>

      <div className="space-y-2">
        {rows.length === 0 && (
          <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center text-sm text-slate-400">
            Tidak ada data untuk filter ini.
          </div>
        )}

        {rows.map(({ person, spouseCount, childCount, parentCount, relationCount }) => (
          <div
            key={person.id}
            className="bg-white rounded-2xl border border-slate-100 p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-2xl shrink-0">{person.gender === 'male' ? '👨' : '🧕'}</span>
              <div className="min-w-0">
                <p className="font-semibold text-slate-800 truncate">{person.name}</p>
                <p className="text-xs text-slate-400">
                  {person.gender === 'male' ? 'Laki-laki' : 'Perempuan'}
                  {!person.is_alive && ` · ${person.gender === 'male' ? 'رَحِمَهُ ٱللَّٰهُ' : 'رَحِمَهَا ٱللَّٰهُ'}`}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
              <RelationPill label="Pasangan" value={spouseCount} tone={spouseCount === 0 ? 'red' : 'green'} />
              <RelationPill label="Anak" value={childCount} tone={childCount === 0 ? 'red' : 'green'} />
              <RelationPill label="Ortu" value={parentCount} tone={parentCount === 0 ? 'slate' : 'green'} />
              <RelationPill label="Relasi" value={relationCount} tone={relationCount === 0 ? 'red' : 'slate'} />
              <button
                type="button"
                onClick={() => onEdit(person)}
                className="btn-secondary py-1.5! px-3! text-xs"
              >
                Edit
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function RelationPill({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone: 'green' | 'red' | 'slate'
}) {
  const styles = {
    green: 'bg-green-50 text-green-700',
    red: 'bg-red-50 text-red-600',
    slate: 'bg-slate-50 text-slate-500',
  }

  return (
    <span className={`rounded-lg px-2 py-1 text-xs font-semibold ${styles[tone]}`}>
      {label}: {value}
    </span>
  )
}

function BackupTab({ onRestored }: { onRestored: () => Promise<void> }) {
  const [exporting, setExporting] = useState(false)
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleExport = async () => {
    setExporting(true)
    setResult(null)
    try {
      await exportBackup()
      setResult('Backup berhasil di-download.')
    } catch {
      setResult('Gagal membuat backup.')
    } finally {
      setExporting(false)
    }
  }

  const handleImport = async () => {
    if (!selectedFile) return
    if (!confirm('Ini akan menimpa SEMUA data yang ada. Lanjutkan?')) return

    setImporting(true)
    setResult(null)
    try {
      const counts = await importBackup(selectedFile)
      setResult(`Restore berhasil: ${counts.persons} anggota, ${counts.relationships} relasi, ${counts.node_positions} posisi.`)
      await onRestored()
      if (fileRef.current) fileRef.current.value = ''
      setSelectedFile(null)
    } catch (err) {
      setResult(`Restore gagal: ${err instanceof Error ? err.message : 'Format tidak valid'}`)
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="space-y-6 max-w-lg">
      {result && (
        <div className={`text-sm rounded-xl px-4 py-3 ${result.includes('gagal') || result.includes('Gagal') ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'}`}>
          {result}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-3">
        <h3 className="font-semibold text-slate-800">Download Backup</h3>
        <p className="text-sm text-slate-500">Download semua data (anggota, relasi, posisi layout) sebagai file JSON.</p>
        <button onClick={handleExport} disabled={exporting} className="btn-primary">
          {exporting ? 'Mengunduh...' : '📥 Download Backup'}
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-3">
        <h3 className="font-semibold text-slate-800">Restore dari Backup</h3>
        <p className="text-sm text-slate-500">Upload file JSON backup untuk mengembalikan data. Data yang ada sekarang akan ditimpa.</p>
        <input
          ref={fileRef}
          type="file"
          accept=".json"
          onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
          className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
        />
        <button onClick={handleImport} disabled={importing || !selectedFile} className="btn-danger">
          {importing ? 'Memulihkan...' : '📤 Restore Data'}
        </button>
      </div>
    </div>
  )
}
