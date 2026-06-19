'use client'

import { memo } from 'react'
import { Handle, Position, NodeProps, Node } from '@xyflow/react'
import { PersonNodeData } from '@/lib/tree-utils'

type PersonNodeProps = NodeProps<Node<PersonNodeData>>

function PersonNode({ data, selected }: PersonNodeProps) {
  const { person } = data
  const isMale = person.gender === 'male'

  return (
    <div
      style={{ width: 190 }}
      className={`
        rounded-2xl border-2 shadow-md px-4 py-3 cursor-pointer select-none
        transition-all duration-200
        ${selected ? 'border-blue-500 shadow-lg shadow-blue-100 scale-105' : 'border-slate-200 hover:border-slate-300 hover:shadow-lg'}
        ${isMale ? 'bg-linear-to-br from-blue-50 to-blue-100' : 'bg-linear-to-br from-pink-50 to-pink-100'}
        ${!person.is_alive ? 'opacity-55' : ''}
      `}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="bg-slate-300! w-2! h-2!"
      />

      <div className="flex items-center gap-2.5">
        <span className="text-3xl shrink-0 leading-none">{isMale ? '👨' : '🧕'}</span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-slate-800 leading-snug truncate">
            {person.name}
          </p>
          <div className="flex items-center gap-1.5 mt-0.5">
            {!person.is_alive && (
              <span className="text-xs text-slate-400 font-medium">
                {person.gender === 'male' ? 'رَحِمَهُ ٱللَّٰهُ' : 'رَحِمَهَا ٱللَّٰهُ'}
              </span>
            )}
            {person.birth_date && (
              <span className="text-xs text-slate-400">
                {new Date(person.birth_date).getFullYear()}
              </span>
            )}
            {person.phone && (
              <span className="text-xs text-green-600 font-medium">📱</span>
            )}
          </div>
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="bg-slate-300! w-2! h-2!"
      />
    </div>
  )
}

export default memo(PersonNode)
