import { initializeApp } from 'firebase/app'
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  Timestamp,
} from 'firebase/firestore'

const app = initializeApp({
  apiKey: 'AIzaSyCffTu4ZjnxFg2ZYfdnewWo6eXIf1oC7SE',
  authDomain: 'genealogy-family-tree-80613.firebaseapp.com',
  projectId: 'genealogy-family-tree-80613',
  storageBucket: 'genealogy-family-tree-80613.firebasestorage.app',
  messagingSenderId: '853196094066',
  appId: '1:853196094066:web:f2c8821ec2cd3978e2e0eb',
})

const db = getFirestore(app)

// ─── helpers ────────────────────────────────────────────────────────────────

interface PersonInput {
  name: string
  gender: 'male' | 'female'
  is_alive: boolean
  birth_order: number | null
}

interface RelInput {
  parentKey: string
  childKey: string
  type: 'father' | 'mother' | 'spouse'
}

const persons: Record<string, PersonInput> = {}
const rels: RelInput[] = []

function add(key: string, name: string, gender: 'male' | 'female', alive: boolean, order: number | null) {
  persons[key] = { name, gender, is_alive: alive, birth_order: order }
}

function children(parentKey: string, type: 'father' | 'mother', keys: string[]) {
  for (const k of keys) rels.push({ parentKey, childKey: k, type })
}

function spouse(a: string, b: string) {
  rels.push({ parentKey: a, childKey: b, type: 'spouse' })
}

// ═══════════════════════════════════════════════════════════════════════════
// GENERASI 1 — ROOT
// ═══════════════════════════════════════════════════════════════════════════
add('ahmad_sardan', 'Ahmad Sardan', 'male', true, null)

// ═══════════════════════════════════════════════════════════════════════════
// GENERASI 2 — Anak Ahmad Sardan
// (tidak ada tanda Alm/Almh di data → is_alive: true)
// ═══════════════════════════════════════════════════════════════════════════
add('abdul_manan',  'Abdul Manan',   'male',   true, 1)
add('ngademi',      'Ngademi',       'female', true, 2)
add('saniem',       'Saniem',        'female', true, 3)
add('abdullah',     'Abdullah',      'male',   true, 4)
add('minok',        'Minok',         'female', true, 5)
add('jumikem',      'Jumikem',       'female', true, 6)
add('aminah',       'Aminah',        'female', true, 7)
add('ngatimem',     'Hj. Ngatimem',  'female', true, 8)

children('ahmad_sardan', 'father', [
  'abdul_manan', 'ngademi', 'saniem', 'abdullah',
  'minok', 'jumikem', 'aminah', 'ngatimem',
])

// ═══════════════════════════════════════════════════════════════════════════
// GENERASI 3 — Anak Abdul Manan (laki-laki → father)
// ═══════════════════════════════════════════════════════════════════════════
add('asiah',       'Asiah',       'female', false, 1)   // Almh
add('syamsudin',   'Syamsudin',   'male',   false, 2)   // Alm
add('wasilah',     'Wasilah',     'female', false, 3)   // Almh
add('syamsuri',    'Syamsuri',    'male',   false, 4)   // Alm
add('ramlah',      'Ramlah',      'female', true,  5)
add('rohani_am',   'Rohani',      'female', false, 6)   // Almh
add('subakti',     'Subakti',     'male',   true,  7)
add('musliman',    'Musliman',    'male',   true,  8)
add('ahmad_munir', 'Ahmad Munir', 'male',   true,  9)
add('nur_aini',    'Nur Aini',    'female', true,  10)

children('abdul_manan', 'father', [
  'asiah', 'syamsudin', 'wasilah', 'syamsuri', 'ramlah',
  'rohani_am', 'subakti', 'musliman', 'ahmad_munir', 'nur_aini',
])

// ═══════════════════════════════════════════════════════════════════════════
// GENERASI 3 — Anak Saniem (perempuan → mother)
// ═══════════════════════════════════════════════════════════════════════════
add('syamsiah',      'Syamsiah',      'female', false, 1) // Almh
add('kartini',       'Kartini',       'female', true,  2)
add('aliono_abdy',   'Aliono Abdy',   'male',   true,  3)
add('syamsun_nahar', 'Syamsun Nahar', 'male',   true,  4)

children('saniem', 'mother', ['syamsiah', 'kartini', 'aliono_abdy', 'syamsun_nahar'])

// ═══════════════════════════════════════════════════════════════════════════
// GENERASI 3 — Anak Abdullah (laki-laki → father)
// ═══════════════════════════════════════════════════════════════════════════
add('nur_amin',     'Nur Amin Setiawan', 'male',   true,  1)
add('syamsul_amin', 'Syamsul Amin',      'male',   true,  2)
add('sunarti',      'Sunarti',           'female', true,  3)
add('sunarmi',      'Sunarmi',           'female', true,  4)
add('zainir',       'Zainir',            'male',   true,  5)
add('sunyoto',      'Sunyoto',           'male',   false, 6) // Alm
add('ansari',       'Ansari',            'male',   true,  7)
add('yusnaiti',     'Yusnaiti',          'female', true,  8)
add('asnidah',      'Asnidah',           'female', false, 9) // Almh
add('imanuddin',    'Imanuddin',         'male',   true,  10)

children('abdullah', 'father', [
  'nur_amin', 'syamsul_amin', 'sunarti', 'sunarmi', 'zainir',
  'sunyoto', 'ansari', 'yusnaiti', 'asnidah', 'imanuddin',
])

// ═══════════════════════════════════════════════════════════════════════════
// GENERASI 3 — Anak Minok (perempuan → mother)
// ═══════════════════════════════════════════════════════════════════════════
add('juliati',  'Juliati',  'female', false, 1) // Almh
add('saniati',  'Saniati',  'female', true,  2)
add('arwati',   'Arwati',   'female', true,  3)
add('sukianti', 'Sukianti', 'female', false, 4) // Almh
add('saliadi',  'Saliadi',  'male',   true,  5)
add('siswati',  'Siswati',  'female', true,  6)
add('abdi',     'Abdi',     'male',   true,  7)
add('asrianti', 'Asrianti', 'female', true,  8)

children('minok', 'mother', [
  'juliati', 'saniati', 'arwati', 'sukianti',
  'saliadi', 'siswati', 'abdi', 'asrianti',
])

// ═══════════════════════════════════════════════════════════════════════════
// GENERASI 3 — Anak Jumikem (perempuan → mother)
// ═══════════════════════════════════════════════════════════════════════════
add('sumiati',    'Sumiati',    'female', true,  1)
add('sudarno',    'Sudarno',    'male',   true,  2)
add('sunariyah',  'Sunariyah',  'female', true,  3)
add('suyono',     'Suyono',     'male',   true,  4)
add('suminarsih', 'Suminarsih', 'female', true,  5)
add('sumarliyah', 'Sumarliyah', 'female', true,  6)
add('supianto',   'Supianto',   'male',   true,  7)
add('susilawati', 'Susilawati', 'female', false, 8) // Almh
add('saidah',     'Saidah',     'female', true,  9)
add('sofia_hanim','Sofia Hanim','female', true,  10)

children('jumikem', 'mother', [
  'sumiati', 'sudarno', 'sunariyah', 'suyono', 'suminarsih',
  'sumarliyah', 'supianto', 'susilawati', 'saidah', 'sofia_hanim',
])

// Pasangan anak Jumikem
add('m_kasim',      'M. Kasim',              'male', true, null)
add('ahmad_sajuli', 'Ahmad Sajuli Siregar',  'male', true, null)
spouse('suminarsih', 'm_kasim')
spouse('susilawati', 'ahmad_sajuli')

// ═══════════════════════════════════════════════════════════════════════════
// GENERASI 3 — Anak Aminah (perempuan → mother)
// ═══════════════════════════════════════════════════════════════════════════
add('suradi',      'Suradi',      'male',   true,  1)
add('ernawati',    'Ernawati',    'female', false, 2) // Almh
add('junaidi',     'Junaidi',     'male',   true,  3)
add('erwanto',     'Erwanto',     'male',   true,  4)
add('supratno',    'Supratno',    'male',   true,  5)
add('supriadi',    'Supriadi',    'male',   false, 6) // Alm
add('siti_aisyah', 'Siti Aisyah', 'female', true,  7)

children('aminah', 'mother', [
  'suradi', 'ernawati', 'junaidi', 'erwanto',
  'supratno', 'supriadi', 'siti_aisyah',
])

// ═══════════════════════════════════════════════════════════════════════════
// GENERASI 3 — Anak Hj. Ngatimem (perempuan → mother)
// ═══════════════════════════════════════════════════════════════════════════
add('rohani_syukarni', 'Rohani Syukarni',     'female', true,  1)
add('nurlela',         'Hj. Nurlela',         'female', true,  2)
add('laila_mardhiyah', 'Hj. Laila Mardhiyah', 'female', false, 3) // Almh
add('al_asyari',       "H. Al Asy'ari",       'male',   false, 4) // Alm
add('rahmawati_ng',    'Hj. Rahmawati',       'female', true,  5)
add('khairani',        'Hj. Khairani',        'female', true,  6)
add('khairunnisa',     'Hj. Khairunnisa',      'female', false, 7) // Almh
add('arbaiyah',        'Hj. Arbaiyah',        'female', true,  8)
add('siti_raudhah',    'Hj. Siti Raudhah',    'female', true,  9)

children('ngatimem', 'mother', [
  'rohani_syukarni', 'nurlela', 'laila_mardhiyah', 'al_asyari',
  'rahmawati_ng', 'khairani', 'khairunnisa', 'arbaiyah', 'siti_raudhah',
])

// ═══════════════════════════════════════════════════════════════════════════
// GENERASI 4 — Anak Susilawati & Ahmad Sajuli Siregar
// ═══════════════════════════════════════════════════════════════════════════
add('amril', 'Amril Syaifa Yasin', 'male', true, 1)
parent('ahmad_sajuli', 'amril', 'father')
parent('susilawati', 'amril', 'mother')

add('fitri', 'Fitri Rahmawati', 'female', true, null)
spouse('amril', 'fitri')

// ═══════════════════════════════════════════════════════════════════════════
// GENERASI 5 — Anak Amril Syaifa Yasin & Fitri Rahmawati
// ═══════════════════════════════════════════════════════════════════════════
add('nabila',  'Nabila Atiqa Yasin',    'female', true, 1)
add('anindya', 'Anindya Aisyah Yasin',  'female', true, 2)
add('annas',   'Annas Hudzaifah Yasin', 'male',   true, 3)

children('amril', 'father', ['nabila', 'anindya', 'annas'])

// ═══════════════════════════════════════════════════════════════════════════
// EXECUTION — clear existing data then seed
// ═══════════════════════════════════════════════════════════════════════════

function parent(parentKey: string, childKey: string, type: 'father' | 'mother') {
  rels.push({ parentKey, childKey, type })
}

async function clearCollection(name: string) {
  const snap = await getDocs(collection(db, name))
  if (snap.empty) return 0
  for (const d of snap.docs) {
    await deleteDoc(doc(db, name, d.id))
  }
  return snap.size
}

async function seed() {
  console.log('Clearing existing data...')
  const clearedPersons = await clearCollection('persons')
  const clearedRels = await clearCollection('relationships')
  console.log(`  Deleted ${clearedPersons} persons, ${clearedRels} relationships\n`)

  console.log(`Seeding ${Object.keys(persons).length} persons...`)
  const idMap = new Map<string, string>()
  const baseMs = Date.now()
  let index = 0

  for (const [key, p] of Object.entries(persons)) {
    const ts = Timestamp.fromMillis(baseMs + index * 1000)
    index++
    const docRef = await addDoc(collection(db, 'persons'), {
      name: p.name,
      gender: p.gender,
      phone: null,
      birth_date: null,
      birth_place: null,
      is_alive: p.is_alive,
      notes: null,
      birth_order: p.birth_order,
      created_at: ts,
      updated_at: ts,
    })
    idMap.set(key, docRef.id)
    console.log(`  + ${p.name} (${p.gender}, ${p.is_alive ? 'hidup' : 'meninggal'})`)
  }

  console.log(`\nSeeding ${rels.length} relationships...`)
  for (const r of rels) {
    const personId = idMap.get(r.parentKey)!
    const relatedId = idMap.get(r.childKey)!
    await addDoc(collection(db, 'relationships'), {
      person_id: personId,
      related_person_id: relatedId,
      type: r.type,
    })
    console.log(`  + ${persons[r.parentKey].name} —[${r.type}]→ ${persons[r.childKey].name}`)
  }

  console.log('\nSelesai! Semua data berhasil di-seed.')
  process.exit(0)
}

seed().catch((err) => {
  console.error('Seed gagal:', err)
  process.exit(1)
})
