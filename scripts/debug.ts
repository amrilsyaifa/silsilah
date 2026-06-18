import { initializeApp } from 'firebase/app'
import { getFirestore, collection, getDocs, orderBy, query } from 'firebase/firestore'

const app = initializeApp({
  apiKey: 'AIzaSyCffTu4ZjnxFg2ZYfdnewWo6eXIf1oC7SE',
  authDomain: 'genealogy-family-tree-80613.firebaseapp.com',
  projectId: 'genealogy-family-tree-80613',
  storageBucket: 'genealogy-family-tree-80613.firebasestorage.app',
  messagingSenderId: '853196094066',
  appId: '1:853196094066:web:f2c8821ec2cd3978e2e0eb',
})

const db = getFirestore(app)

interface Person {
  id: string
  name: string
  gender: 'male' | 'female'
  is_alive: boolean
  birth_order: number | null
}

interface Relationship {
  id: string
  person_id: string
  related_person_id: string
  type: 'father' | 'mother' | 'spouse'
}

async function debug() {
  const [personsSnap, relsSnap] = await Promise.all([
    getDocs(query(collection(db, 'persons'), orderBy('created_at'))),
    getDocs(collection(db, 'relationships')),
  ])

  const persons: Person[] = personsSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as Person)
  const rels: Relationship[] = relsSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as Relationship)

  const nameMap = new Map(persons.map((p) => [p.id, p.name]))

  console.log(`\n=== ${persons.length} PERSONS ===`)
  for (const p of persons) {
    console.log(`  ${p.name} (${p.gender}, ${p.is_alive ? 'hidup' : 'meninggal'}, order:${p.birth_order})  [${p.id}]`)
  }

  console.log(`\n=== ${rels.length} RELATIONSHIPS ===`)
  for (const r of rels) {
    const p1 = nameMap.get(r.person_id) ?? `UNKNOWN(${r.person_id})`
    const p2 = nameMap.get(r.related_person_id) ?? `UNKNOWN(${r.related_person_id})`
    console.log(`  ${p1} —[${r.type}]→ ${p2}`)
  }

  // Validate tree structure
  console.log('\n=== TREE VALIDATION ===')

  // Find root (no parent)
  const hasParent = new Set<string>()
  const spouseMap = new Map<string, string>()
  const parentChildren = new Map<string, { child: string; type: string }[]>()

  for (const r of rels) {
    if (r.type === 'father' || r.type === 'mother') {
      hasParent.add(r.related_person_id)
      if (!parentChildren.has(r.person_id)) parentChildren.set(r.person_id, [])
      parentChildren.get(r.person_id)!.push({ child: r.related_person_id, type: r.type })
    } else if (r.type === 'spouse') {
      spouseMap.set(r.person_id, r.related_person_id)
      spouseMap.set(r.related_person_id, r.person_id)
    }
  }

  const roots = persons.filter((p) => !hasParent.has(p.id))
  console.log(`\nRoots (no parent): ${roots.map((r) => r.name).join(', ')}`)

  const inLaws = roots.filter((r) => spouseMap.has(r.id) && hasParent.has(spouseMap.get(r.id)!))
  const trueRoots = roots.filter((r) => !inLaws.some((il) => il.id === r.id))
  console.log(`In-laws (root but has spouse with parent): ${inLaws.map((r) => r.name).join(', ')}`)
  console.log(`True roots: ${trueRoots.map((r) => r.name).join(', ')}`)

  // Print tree
  console.log('\n=== TREE STRUCTURE ===')
  function printTree(id: string, depth: number) {
    const name = nameMap.get(id) ?? 'UNKNOWN'
    const person = persons.find((p) => p.id === id)!
    const sp = spouseMap.get(id)
    const spName = sp ? nameMap.get(sp) : null
    const prefix = '  '.repeat(depth)
    const status = person.is_alive ? '' : ' †'
    const spStr = spName ? ` ── pasangan: ${spName}` : ''
    console.log(`${prefix}├── ${person.birth_order ?? '?'}. ${name} (${person.gender}${status})${spStr}`)

    const kids = parentChildren.get(id) ?? []
    // Sort by birth_order
    kids.sort((a, b) => {
      const pa = persons.find((p) => p.id === a.child)
      const pb = persons.find((p) => p.id === b.child)
      return (pa?.birth_order ?? 999) - (pb?.birth_order ?? 999)
    })
    for (const k of kids) {
      printTree(k.child, depth + 1)
    }

    // Also show in-law's children
    if (sp && inLaws.some((il) => il.id === sp)) {
      const inLawKids = parentChildren.get(sp) ?? []
      for (const k of inLawKids) {
        printTree(k.child, depth + 1)
      }
    }
  }

  if (trueRoots.length > 0) {
    printTree(trueRoots[0].id, 0)
  }

  // Check for orphans
  const reachable = new Set<string>()
  function markReachable(id: string) {
    reachable.add(id)
    const sp = spouseMap.get(id)
    if (sp) reachable.add(sp)
    for (const k of (parentChildren.get(id) ?? [])) {
      markReachable(k.child)
    }
    if (sp) {
      for (const k of (parentChildren.get(sp) ?? [])) {
        markReachable(k.child)
      }
    }
  }
  if (trueRoots.length > 0) markReachable(trueRoots[0].id)

  const orphans = persons.filter((p) => !reachable.has(p.id))
  if (orphans.length > 0) {
    console.log(`\n⚠️  ORPHANS (unreachable from root): ${orphans.map((o) => o.name).join(', ')}`)
  } else {
    console.log('\n✅ All persons reachable from root')
  }

  process.exit(0)
}

debug().catch((err) => {
  console.error('Debug failed:', err)
  process.exit(1)
})
