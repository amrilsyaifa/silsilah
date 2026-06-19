import { collection, getDocs, setDoc, doc, writeBatch } from 'firebase/firestore'
import { db } from './firebase'

export interface NodePosition {
  x: number
  y: number
}

const COLLECTION = 'node_positions'

export async function loadPositions(): Promise<Map<string, NodePosition>> {
  const snap = await getDocs(collection(db, COLLECTION))
  const map = new Map<string, NodePosition>()
  for (const d of snap.docs) {
    const data = d.data()
    map.set(d.id, { x: data.x, y: data.y })
  }
  return map
}

export async function savePosition(personId: string, pos: NodePosition): Promise<void> {
  await setDoc(doc(db, COLLECTION, personId), { x: pos.x, y: pos.y }, { merge: true })
}

export async function saveAllPositions(positions: Map<string, NodePosition>): Promise<void> {
  const batch = writeBatch(db)
  for (const [personId, pos] of positions) {
    batch.set(doc(db, COLLECTION, personId), { x: pos.x, y: pos.y }, { merge: true })
  }
  await batch.commit()
}

export async function clearAllPositions(): Promise<void> {
  const snap = await getDocs(collection(db, COLLECTION))
  if (snap.empty) return
  const batch = writeBatch(db)
  for (const d of snap.docs) {
    batch.delete(doc(db, COLLECTION, d.id))
  }
  await batch.commit()
}
