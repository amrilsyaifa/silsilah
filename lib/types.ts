export interface Person {
  id: string
  name: string
  gender: 'male' | 'female'
  phone: string | null
  birth_date: string | null
  birth_place: string | null
  is_alive: boolean
  notes: string | null
  birth_order: number | null
  created_at: string
  updated_at: string
}

export interface Relationship {
  id: string
  person_id: string
  related_person_id: string
  type: 'father' | 'mother' | 'spouse'
}

export interface PersonFormData {
  name: string
  gender: 'male' | 'female'
  phone: string
  birth_date: string
  birth_place: string
  is_alive: boolean
  notes: string
}
