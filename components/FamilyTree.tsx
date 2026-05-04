'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  useReactFlow,
  ReactFlowProvider,
  Node,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import { Person, Relationship } from '@/lib/types'
import { buildTreeElements, PersonNodeData } from '@/lib/tree-utils'
import PersonNode from './PersonNode'
import PersonModal from './PersonModal'
import SearchBar from './SearchBar'

const nodeTypes = { personNode: PersonNode }

interface Props {
  persons: Person[]
  relationships: Relationship[]
}

function TreeInner({ persons, relationships }: Props) {
  const { fitView, setCenter } = useReactFlow()
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [matchIds, setMatchIds] = useState<Set<string>>(new Set())

  const { nodes: initialNodes, edges: initialEdges, rootId } = useMemo(
    () => buildTreeElements(persons, relationships),
    [persons, relationships]
  )

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, , onEdgesChange] = useEdgesState(initialEdges)

  // On mount: fitView to root + level-1 children only so nodes are readable
  useEffect(() => {
    if (!rootId) return
    const level1Ids = relationships
      .filter((r) => r.person_id === rootId && r.type !== 'spouse')
      .map((r) => r.related_person_id)
    const focusIds = new Set([rootId, ...level1Ids])
    const focusNodes = initialNodes.filter((n) => focusIds.has(n.id))

    setTimeout(() => {
      fitView({
        nodes: focusNodes,
        padding: 0.25,
        duration: 600,
        maxZoom: 1,
      })
    }, 120)
  }, [fitView, rootId, initialNodes, relationships])

  const handleSearch = useCallback(
    (query: string) => {
      setSearchQuery(query)
      if (!query.trim()) {
        setMatchIds(new Set())
        setNodes((nds) => nds.map((n) => ({ ...n, style: undefined })))
        return
      }

      const lower = query.toLowerCase()
      const matches = persons.filter((p) => p.name.toLowerCase().includes(lower))
      const ids = new Set(matches.map((p) => p.id))
      setMatchIds(ids)

      setNodes((nds) =>
        nds.map((n) => ({
          ...n,
          style: ids.has(n.id)
            ? { filter: 'drop-shadow(0 0 10px #3b82f6)', zIndex: 10 }
            : { opacity: 0.25 },
        }))
      )

      if (matches.length > 0) {
        const firstNode = initialNodes.find((n) => n.id === matches[0].id)
        if (firstNode) {
          setCenter(firstNode.position.x + 95, firstNode.position.y + 45, {
            zoom: 1.2,
            duration: 600,
          })
        }
      }
    },
    [persons, initialNodes, setNodes, setCenter]
  )

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node<PersonNodeData>) => {
      setSelectedPerson(node.data.person)
    },
    []
  )

  return (
    <div className="w-full h-full relative">
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 w-72 sm:w-96">
        <SearchBar
          onSearch={handleSearch}
          matchCount={searchQuery ? matchIds.size : undefined}
        />
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        minZoom={0.05}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#e2e8f0" gap={24} />
        <Controls
          showInteractive={false}
          className="bottom-4! right-4!"
        />
      </ReactFlow>

      <PersonModal person={selectedPerson} onClose={() => setSelectedPerson(null)} />
    </div>
  )
}

export default function FamilyTree({ persons, relationships }: Props) {
  return (
    <ReactFlowProvider>
      <TreeInner persons={persons} relationships={relationships} />
    </ReactFlowProvider>
  )
}
