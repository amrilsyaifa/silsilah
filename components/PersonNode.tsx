'use client'

import { memo, useCallback } from 'react'
import { Handle, Position, NodeProps, Node } from '@xyflow/react'
import { NODE_WIDTH, PersonNodeData } from '@/lib/tree-utils'

const ROOT_WIDTH = 230

type PersonNodeProps = NodeProps<Node<PersonNodeData>>

function PersonNode({ data, selected }: PersonNodeProps) {
  const { person, isRoot, onPointerDown, onPointerUp } = data
  const isMale = person.gender === 'male'
  const width = isRoot ? ROOT_WIDTH : NODE_WIDTH

  const handlePointerDown = useCallback(() => {
    if (onPointerDown) (onPointerDown as (id: string) => void)(person.id)
  }, [onPointerDown, person.id])

  const handlePointerUp = useCallback(() => {
    if (onPointerUp) (onPointerUp as () => void)()
  }, [onPointerUp])

  return (
    <div
      style={{ width }}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      className={`
        rounded-2xl border-2 shadow-md cursor-pointer select-none
        transition-all duration-200
        ${isRoot ? 'px-5 py-4' : 'px-4 py-3'}
        ${selected
          ? 'border-blue-500 shadow-lg shadow-blue-100 scale-105'
          : isRoot
            ? 'border-amber-400 hover:border-amber-500 hover:shadow-lg'
            : 'border-slate-200 hover:border-slate-300 hover:shadow-lg'
        }
        ${isRoot
          ? 'bg-linear-to-br from-amber-50 to-yellow-100'
          : isMale
            ? 'bg-linear-to-br from-blue-50 to-blue-100'
            : 'bg-linear-to-br from-pink-50 to-pink-100'
        }
        ${!person.is_alive ? 'opacity-55' : ''}
      `}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="bg-slate-300! w-2! h-2!"
      />

      <div className="flex items-center gap-2.5">
        <span className={`${isRoot ? 'text-4xl' : 'text-3xl'} shrink-0 leading-none`}>
          {isMale ? '👨' : '🧕'}
        </span>
        <div className="min-w-0 flex-1">
          <p className={`${isRoot ? 'text-base' : 'text-sm'} font-bold text-slate-800 leading-snug truncate`}>
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
