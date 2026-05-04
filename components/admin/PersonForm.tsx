'use client'

import { useState } from 'react'
import { Person, PersonFormData } from '@/lib/types'

interface Props {
  initial?: Person
  onSubmit: (data: PersonFormData) => Promise<void>
  onCancel: () => void
}

export default function PersonForm({ initial, onSubmit, onCancel }: Props) {
  const [form, setForm] = useState<PersonFormData>({
    name: initial?.name ?? '',
    gender: initial?.gender ?? 'male',
    phone: initial?.phone ?? '',
    birth_date: initial?.birth_date ?? '',
    birth_place: initial?.birth_place ?? '',
    is_alive: initial?.is_alive ?? true,
    notes: initial?.notes ?? '',
  })
  const [loading, setLoading] = useState(false)

  const set = (field: keyof PersonFormData, value: string | boolean) =>
    setForm((f) => ({ ...f, [field]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await onSubmit(form)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Nama Lengkap *">
          <input
            required
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            className="input"
            placeholder="Nama lengkap"
          />
        </Field>

        <Field label="Jenis Kelamin *">
          <select
            value={form.gender}
            onChange={(e) => set('gender', e.target.value)}
            className="input"
          >
            <option value="male">Laki-laki</option>
            <option value="female">Perempuan</option>
          </select>
        </Field>

        <Field label="No. HP / WhatsApp">
          <input
            value={form.phone}
            onChange={(e) => set('phone', e.target.value)}
            className="input"
            placeholder="08xx-xxxx-xxxx"
            type="tel"
          />
        </Field>

        <Field label="Tanggal Lahir">
          <input
            value={form.birth_date}
            onChange={(e) => set('birth_date', e.target.value)}
            className="input"
            type="date"
          />
        </Field>

        <Field label="Tempat Lahir">
          <input
            value={form.birth_place}
            onChange={(e) => set('birth_place', e.target.value)}
            className="input"
            placeholder="Kota"
          />
        </Field>

        <Field label="Status">
          <label className="flex items-center gap-2 cursor-pointer mt-2">
            <input
              type="checkbox"
              checked={form.is_alive}
              onChange={(e) => set('is_alive', e.target.checked)}
              className="w-4 h-4 rounded"
            />
            <span className="text-sm text-slate-700">Masih hidup</span>
          </label>
        </Field>
      </div>

      <Field label="Catatan">
        <textarea
          value={form.notes}
          onChange={(e) => set('notes', e.target.value)}
          className="input h-20 resize-none"
          placeholder="Catatan tambahan..."
        />
      </Field>

      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onCancel} className="btn-secondary flex-1">
          Batal
        </button>
        <button type="submit" disabled={loading} className="btn-primary flex-1">
          {loading ? 'Menyimpan...' : initial ? 'Simpan Perubahan' : 'Tambah Anggota'}
        </button>
      </div>
    </form>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
        {label}
      </label>
      {children}
    </div>
  )
}
