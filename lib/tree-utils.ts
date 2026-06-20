import { Node, Edge } from '@xyflow/react'
import { Person, Relationship } from './types'

export const NODE_WIDTH = 190
export const NODE_HEIGHT = 90
const SIBLING_GAP = 24
const LEVEL_HEIGHT = 180

export interface PersonNodeData {
  person: Person
  isRoot?: boolean
  [key: string]: unknown
}

export function buildTreeElements(
  persons: Person[],
  relationships: Relationship[],
  savedPositions?: Map<string, { x: number; y: number }>
): { nodes: Node<PersonNodeData>[]; edges: Edge[]; rootId: string | null } {
  if (persons.length === 0) return { nodes: [], edges: [], rootId: null }

  const personMap = new Map(persons.map((p) => [p.id, p]))

  // ── 1. Spouse map ─────────────────────────────────────────────────────────
  const spouseMap = new Map<string, string>()
  for (const rel of relationships) {
    if (rel.type === 'spouse') {
      spouseMap.set(rel.person_id, rel.related_person_id)
      spouseMap.set(rel.related_person_id, rel.person_id)
    }
  }

  // ── 2. Parent→children map (prefer father for layout placement) ────────────
  // If a child has a father relationship, only father is the layout parent.
  // Mother becomes an "in-law" relative to the father's subtree.
  const childFathers = new Map<string, string>() // childId → fatherId
  for (const rel of relationships) {
    if (rel.type === 'father') childFathers.set(rel.related_person_id, rel.person_id)
  }

  const parentChildren = new Map<string, string[]>()
  for (const rel of relationships) {
    if (rel.type === 'father' || rel.type === 'mother') {
      // Skip mother relationship if child already has a father
      if (rel.type === 'mother' && childFathers.has(rel.related_person_id)) continue
      if (!parentChildren.has(rel.person_id)) parentChildren.set(rel.person_id, [])
      const arr = parentChildren.get(rel.person_id)!
      if (!arr.includes(rel.related_person_id)) arr.push(rel.related_person_id)
    }
  }
  // Sort each parent's children by birth_order
  for (const [, children] of parentChildren) {
    children.sort((a, b) => (personMap.get(a)?.birth_order ?? 999) - (personMap.get(b)?.birth_order ?? 999))
  }

  // ── 3. Root & in-law set ──────────────────────────────────────────────────
  const hasParent = new Set(
    [...parentChildren.entries()].flatMap(([parent, children]) => children.map(c => ({ parent, child: c }))).map(e => e.child)
  )
  const root = persons.find((p) => !hasParent.has(p.id))
  const rootId = root?.id ?? null

  // In-law: has no parent in tree (not root), but spouse is in the tree
  const inLaw = new Set<string>()
  for (const [id, spouseId] of spouseMap) {
    if (id !== rootId && !hasParent.has(id) && hasParent.has(spouseId)) {
      inLaw.add(id)
    }
  }

  // ── 4. Layout: subtreeWidth + place ───────────────────────────────────────
  const subtreeWidthCache = new Map<string, number>()

  function subtreeWidth(id: string): number {
    if (subtreeWidthCache.has(id)) return subtreeWidthCache.get(id)!

    const children = parentChildren.get(id) ?? []
    const ownW = children.length === 0
      ? NODE_WIDTH
      : Math.max(NODE_WIDTH, children.reduce((s, c) => s + subtreeWidth(c), 0) + (children.length - 1) * SIBLING_GAP)

    // Expand slot if in-law spouse has children (family unit needs room)
    const spouse = spouseMap.get(id)
    if (!inLaw.has(id) && spouse && inLaw.has(spouse)) {
      const inLawChildren = parentChildren.get(spouse) ?? []
      const inLawSubW = subtreeWidth(spouse)
      // Always expand to accommodate in-law node regardless of whether they have children
      const pairW = NODE_WIDTH + SIBLING_GAP + inLawSubW
      const result = Math.max(ownW, pairW)
      subtreeWidthCache.set(id, result)
      return result
    }

    subtreeWidthCache.set(id, ownW)
    return ownW
  }

  const positions = new Map<string, { x: number; y: number }>()

  function place(id: string, centerX: number, y: number) {
    if (inLaw.has(id)) return // positioned by spouse's place() call

    const spouse = spouseMap.get(id)
    const inLawSpouse = (spouse && inLaw.has(spouse)) ? spouse : null
    const inLawChildren = inLawSpouse ? (parentChildren.get(inLawSpouse) ?? []) : []
    const ownChildren = parentChildren.get(id) ?? []

    if (inLawSpouse && inLawChildren.length > 0) {
      // ── Case A: in-law has children (e.g. Susilawati + Ahmad Sajuli Siregar)
      // Layout: [this node] [in-law node]
      //                          |
      //                   [in-law's children]
      const inLawSubW = subtreeWidth(inLawSpouse)
      const totalW = subtreeWidth(id) // already expanded in subtreeWidth()
      const leftEdge = centerX - totalW / 2

      // This node left-aligned
      positions.set(id, { x: leftEdge, y })

      // In-law centered in the right portion
      const inLawCenterX = leftEdge + NODE_WIDTH + SIBLING_GAP + inLawSubW / 2
      positions.set(inLawSpouse, { x: inLawCenterX - NODE_WIDTH / 2, y })

      // This node's own children (if any) below it
      if (ownChildren.length > 0) {
        const ownW = ownChildren.reduce((s, c) => s + subtreeWidth(c), 0) + (ownChildren.length - 1) * SIBLING_GAP
        let curX = leftEdge + NODE_WIDTH / 2 - ownW / 2
        for (const cid of ownChildren) {
          const w = subtreeWidth(cid)
          place(cid, curX + w / 2, y + LEVEL_HEIGHT)
          curX += w + SIBLING_GAP
        }
      }

      // In-law's children below in-law (centered under inLawCenterX)
      const inLawChildrenW = inLawChildren.reduce((s, c) => s + subtreeWidth(c), 0) + (inLawChildren.length - 1) * SIBLING_GAP
      let curX = inLawCenterX - inLawChildrenW / 2
      for (const cid of inLawChildren) {
        const w = subtreeWidth(cid)
        place(cid, curX + w / 2, y + LEVEL_HEIGHT)
        curX += w + SIBLING_GAP
      }
    } else if (inLawSpouse) {
      // ── Case B: in-law has no children (e.g. Amril + Fitri, or Suminarsih + M.Kasim)
      // Layout: [this node] [in-law node]
      //          |
      //   [own children]
      positions.set(id, { x: centerX - NODE_WIDTH / 2, y })
      // In-law placed to the right
      positions.set(inLawSpouse, { x: centerX - NODE_WIDTH / 2 + NODE_WIDTH + SIBLING_GAP, y })

      if (ownChildren.length > 0) {
        const total = ownChildren.reduce((s, c) => s + subtreeWidth(c), 0) + (ownChildren.length - 1) * SIBLING_GAP
        let curX = centerX - total / 2
        for (const cid of ownChildren) {
          const w = subtreeWidth(cid)
          place(cid, curX + w / 2, y + LEVEL_HEIGHT)
          curX += w + SIBLING_GAP
        }
      }
    } else {
      // ── Case C: no in-law — standard recursive placement
      positions.set(id, { x: centerX - NODE_WIDTH / 2, y })

      if (ownChildren.length === 0) return
      const total = ownChildren.reduce((s, c) => s + subtreeWidth(c), 0) + (ownChildren.length - 1) * SIBLING_GAP
      let curX = centerX - total / 2
      for (const cid of ownChildren) {
        const w = subtreeWidth(cid)
        place(cid, curX + w / 2, y + LEVEL_HEIGHT)
        curX += w + SIBLING_GAP
      }
    }
  }

  if (rootId) place(rootId, 0, 0)

  // Disconnected nodes fallback
  persons.forEach((p, i) => {
    if (!positions.has(p.id)) {
      positions.set(p.id, { x: i * (NODE_WIDTH + SIBLING_GAP), y: LEVEL_HEIGHT * 5 })
    }
  })

  // ── 5. Edges ──────────────────────────────────────────────────────────────
  const parentChildEdges: Edge[] = []
  const spouseEdges: Edge[] = []
  const seen = new Set<string>()

  for (const rel of relationships) {
    if (rel.type === 'father' || rel.type === 'mother') {
      const eid = `${rel.person_id}->${rel.related_person_id}`
      if (!seen.has(eid)) {
        seen.add(eid)
        parentChildEdges.push({
          id: eid,
          source: rel.person_id,
          target: rel.related_person_id,
          type: 'smoothstep',
          style: { stroke: '#cbd5e1', strokeWidth: 2 },
        })
      }
    } else if (rel.type === 'spouse') {
      const eid = `spouse-${[rel.person_id, rel.related_person_id].sort().join('-')}`
      if (!seen.has(eid)) {
        seen.add(eid)
        spouseEdges.push({
          id: eid,
          source: rel.person_id,
          target: rel.related_person_id,
          type: 'straight',
          style: { stroke: '#f9a8d4', strokeWidth: 2, strokeDasharray: '6,4' },
          label: '♥',
        })
      }
    }
  }

  const nodes: Node<PersonNodeData>[] = persons
    .filter((p) => positions.has(p.id))
    .map((person) => ({
      id: person.id,
      type: 'personNode',
      position: savedPositions?.get(person.id) ?? positions.get(person.id)!,
      data: { person, isRoot: person.id === rootId },
    }))

  return { nodes, edges: [...parentChildEdges, ...spouseEdges], rootId }
}

const DESCENDANT_LABELS = ['Anak', 'Cucu', 'Cicit', 'Piut', 'Canggah']

export function countDescendants(
  personId: string,
  relationships: Relationship[]
): { label: string; count: number }[] {
  const childrenOf = new Map<string, string[]>()
  for (const r of relationships) {
    if (r.type === 'father' || r.type === 'mother') {
      if (!childrenOf.has(r.person_id)) childrenOf.set(r.person_id, [])
      const arr = childrenOf.get(r.person_id)!
      if (!arr.includes(r.related_person_id)) arr.push(r.related_person_id)
    }
  }

  const spouseOf = new Map<string, string>()
  for (const r of relationships) {
    if (r.type === 'spouse') {
      spouseOf.set(r.person_id, r.related_person_id)
      spouseOf.set(r.related_person_id, r.person_id)
    }
  }

  const results: { label: string; count: number }[] = []
  let currentLevel = [personId]
  let depth = 0

  while (true) {
    const seen = new Set<string>()
    for (const id of currentLevel) {
      for (const kid of childrenOf.get(id) ?? []) seen.add(kid)
      const spouse = spouseOf.get(id)
      if (spouse) {
        for (const kid of childrenOf.get(spouse) ?? []) seen.add(kid)
      }
    }
    if (seen.size === 0) break
    const label = depth < DESCENDANT_LABELS.length
      ? DESCENDANT_LABELS[depth]
      : `Keturunan level ${depth + 1}`
    results.push({ label, count: seen.size })
    currentLevel = [...seen]
    depth++
  }

  return results
}

export function formatPhone(phone: string): string {
  let normalized = phone.replace(/[\s\-()]/g, '')
  if (normalized.startsWith('0')) normalized = '62' + normalized.slice(1)
  return normalized
}
