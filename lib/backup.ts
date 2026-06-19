import { collection, getDocs, writeBatch, doc, setDoc, deleteDoc } from 'firebase/firestore'
import { db } from './firebase'

interface BackupData {
  version: number
  exported_at: string
  persons: { id: string; [key: string]: unknown }[]
  relationships: { id: string; [key: string]: unknown }[]
  node_positions: { id: string; x: number; y: number }[]
}

const COLLECTIONS = ['persons', 'relationships', 'node_positions'] as const

export async function exportBackup(): Promise<void> {
  const [personsSnap, relsSnap, posSnap] = await Promise.all(
    COLLECTIONS.map((c) => getDocs(collection(db, c)))
  )

  const data: BackupData = {
    version: 1,
    exported_at: new Date().toISOString(),
    persons: personsSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
    relationships: relsSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
    node_positions: posSnap.docs.map((d) => {
      const pos = d.data()
      return { id: d.id, x: pos.x, y: pos.y }
    }),
  }

  const json = JSON.stringify(data, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const date = new Date().toISOString().slice(0, 10)

  const a = document.createElement('a')
  a.href = url
  a.download = `silsilah-backup-${date}.json`
  a.click()
  URL.revokeObjectURL(url)
}

async function clearCollection(name: string): Promise<void> {
  const snap = await getDocs(collection(db, name))
  const chunks: typeof snap.docs[] = []
  for (let i = 0; i < snap.docs.length; i += 500) {
    chunks.push(snap.docs.slice(i, i + 500))
  }
  for (const chunk of chunks) {
    const batch = writeBatch(db)
    for (const d of chunk) {
      batch.delete(doc(db, name, d.id))
    }
    await batch.commit()
  }
}

export async function importBackup(file: File): Promise<{ persons: number; relationships: number; node_positions: number }> {
  const text = await file.text()
  const data: BackupData = JSON.parse(text)

  if (!Array.isArray(data.persons) || !Array.isArray(data.relationships)) {
    throw new Error('Format file backup tidak valid')
  }

  for (const name of COLLECTIONS) {
    await clearCollection(name)
  }

  for (const p of data.persons) {
    const { id, ...fields } = p
    await setDoc(doc(db, 'persons', id), fields)
  }

  for (const r of data.relationships) {
    const { id, ...fields } = r
    await setDoc(doc(db, 'relationships', id), fields)
  }

  if (Array.isArray(data.node_positions)) {
    for (const np of data.node_positions) {
      await setDoc(doc(db, 'node_positions', np.id), { x: np.x, y: np.y })
    }
  }

  return {
    persons: data.persons.length,
    relationships: data.relationships.length,
    node_positions: data.node_positions?.length ?? 0,
  }
}
