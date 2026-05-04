import { Node, Edge } from '@xyflow/react'
import { Person, Relationship } from './types'

export const NODE_WIDTH = 190
export const NODE_HEIGHT = 90
const SIBLING_GAP = 24   // gap antar saudara kandung
const LEVEL_HEIGHT = 180  // jarak vertikal antar generasi

export interface PersonNodeData {
  person: Person
  [key: string]: unknown
}

export function buildTreeElements(
  persons: Person[],
  relationships: Relationship[]
): { nodes: Node<PersonNodeData>[]; edges: Edge[]; rootId: string | null } {
  if (persons.length === 0) return { nodes: [], edges: [], rootId: null }

  const personMap = new Map(persons.map((p) => [p.id, p]))

  // Build parent → children sorted by birth_order
  const parentChildren = new Map<string, string[]>()
  for (const rel of relationships) {
    if (rel.type === 'father' || rel.type === 'mother') {
      if (!parentChildren.has(rel.person_id)) parentChildren.set(rel.person_id, [])
      if (!parentChildren.get(rel.person_id)!.includes(rel.related_person_id)) {
        parentChildren.get(rel.person_id)!.push(rel.related_person_id)
      }
    }
  }
  for (const [, children] of parentChildren) {
    children.sort((a, b) => {
      const oA = personMap.get(a)?.birth_order ?? 999
      const oB = personMap.get(b)?.birth_order ?? 999
      return oA - oB
    })
  }

  // Find root (no incoming parent edges)
  const hasParent = new Set(
    relationships
      .filter((r) => r.type === 'father' || r.type === 'mother')
      .map((r) => r.related_person_id)
  )
  const root = persons.find((p) => !hasParent.has(p.id))
  const rootId = root?.id ?? null

  // ── Custom tree layout ──────────────────────────────────────────────────────
  // Each node's subtree width = max(NODE_WIDTH, sum of children widths + gaps)
  // Then place each node centered above its children group.

  const subtreeWidthCache = new Map<string, number>()

  function subtreeWidth(id: string): number {
    if (subtreeWidthCache.has(id)) return subtreeWidthCache.get(id)!
    const children = parentChildren.get(id) ?? []
    let w: number
    if (children.length === 0) {
      w = NODE_WIDTH
    } else {
      const childTotal = children.reduce((sum, c) => sum + subtreeWidth(c), 0)
      w = Math.max(NODE_WIDTH, childTotal + (children.length - 1) * SIBLING_GAP)
    }
    subtreeWidthCache.set(id, w)
    return w
  }

  const positions = new Map<string, { x: number; y: number }>()

  function place(id: string, centerX: number, y: number) {
    positions.set(id, { x: centerX - NODE_WIDTH / 2, y })
    const children = parentChildren.get(id) ?? []
    if (children.length === 0) return

    const total = children.reduce((sum, c) => sum + subtreeWidth(c), 0)
      + (children.length - 1) * SIBLING_GAP
    let curX = centerX - total / 2

    for (const childId of children) {
      const w = subtreeWidth(childId)
      place(childId, curX + w / 2, y + LEVEL_HEIGHT)
      curX += w + SIBLING_GAP
    }
  }

  if (rootId) place(rootId, 0, 0)
  // Disconnected nodes (no parent, not root) placed below tree
  const disconnected = persons.filter((p) => p.id !== rootId && !hasParent.has(p.id))
  disconnected.forEach((p, i) => {
    if (!positions.has(p.id)) {
      positions.set(p.id, { x: i * (NODE_WIDTH + SIBLING_GAP), y: LEVEL_HEIGHT * 4 })
    }
  })

  // ── Build edges ─────────────────────────────────────────────────────────────
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
      position: positions.get(person.id)!,
      data: { person },
    }))

  return { nodes, edges: [...parentChildEdges, ...spouseEdges], rootId }
}

export function formatPhone(phone: string): string {
  let normalized = phone.replace(/[\s\-()]/g, '')
  if (normalized.startsWith('0')) normalized = '62' + normalized.slice(1)
  return normalized
}
