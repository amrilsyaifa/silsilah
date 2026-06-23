"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  useReactFlow,
  ReactFlowProvider,
  SelectionMode,
  Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { Person, Relationship } from "@/lib/types";
import { buildTreeElements, PersonNodeData } from "@/lib/tree-utils";
import PersonNode from "./PersonNode";
import PersonModal from "./PersonModal";
import SearchBar from "./SearchBar";

const nodeTypes = { personNode: PersonNode };

const LONG_PRESS_MS = 500;

interface Props {
  persons: Person[];
  relationships: Relationship[];
  savedPositions?: Map<string, { x: number; y: number }>;
  editable?: boolean;
  onPositionsChange?: (
    positions: Map<string, { x: number; y: number }>,
  ) => void;
}

function TreeInner({
  persons,
  relationships,
  savedPositions,
  editable = false,
  onPositionsChange,
}: Props) {
  const { setCenter } = useReactFlow();
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [matchIds, setMatchIds] = useState<Set<string>>(new Set());
  const [matchList, setMatchList] = useState<string[]>([]);
  const [matchIndex, setMatchIndex] = useState(0);
  const [longPressPerson, setLongPressPerson] = useState<Person | null>(null);

  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const didLongPress = useRef(false);

  const clearLongPress = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const personMap = useMemo(
    () => new Map(persons.map((p) => [p.id, p])),
    [persons],
  );

  const onLongPress = useCallback(
    (personId: string) => {
      didLongPress.current = true;
      const p = personMap.get(personId);
      if (p) setLongPressPerson(p);
    },
    [personMap],
  );

  const onPointerDownNode = useCallback(
    (personId: string) => {
      if (editable) return;
      clearLongPress();
      didLongPress.current = false;
      longPressTimer.current = setTimeout(
        () => onLongPress(personId),
        LONG_PRESS_MS,
      );
    },
    [editable, clearLongPress, onLongPress],
  );

  const onPointerUpNode = useCallback(() => {
    clearLongPress();
  }, [clearLongPress]);

  const {
    nodes: initialNodes,
    edges: initialEdges,
    rootId,
  } = useMemo(
    () => buildTreeElements(persons, relationships, savedPositions),
    [persons, relationships, savedPositions],
  );

  const nodesWithCallbacks = useMemo(
    () =>
      initialNodes.map((n) => ({
        ...n,
        data: {
          ...n.data,
          onPointerDown: onPointerDownNode,
          onPointerUp: onPointerUpNode,
        },
      })),
    [initialNodes, onPointerDownNode, onPointerUpNode],
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(nodesWithCallbacks);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  useEffect(() => {
    setNodes(nodesWithCallbacks);
  }, [nodesWithCallbacks, setNodes]);

  useEffect(() => {
    if (!rootId) return;
    const rootNode = initialNodes.find((n) => n.id === rootId);
    if (!rootNode) return;

    setTimeout(() => {
      setCenter(rootNode.position.x + 115, rootNode.position.y + 45, {
        zoom: 0.7,
        duration: 600,
      });
    }, 120);
  }, [setCenter, rootId, initialNodes]);

  const navigateToMatch = useCallback(
    (matchId: string) => {
      const node = initialNodes.find((n) => n.id === matchId);
      if (node) {
        setCenter(node.position.x + 95, node.position.y + 45, {
          zoom: 1.2,
          duration: 600,
        });
      }
    },
    [initialNodes, setCenter],
  );

  const handleSearch = useCallback(
    (query: string) => {
      setSearchQuery(query);
      if (!query.trim()) {
        setMatchIds(new Set());
        setMatchList([]);
        setMatchIndex(0);
        setNodes((nds) => nds.map((n) => ({ ...n, style: undefined })));
        return;
      }

      const lower = query.toLowerCase();
      const matches = persons.filter((p) =>
        p.name.toLowerCase().includes(lower),
      );
      const ids = new Set(matches.map((p) => p.id));
      const list = matches.map((p) => p.id);
      setMatchIds(ids);
      setMatchList(list);
      setMatchIndex(0);

      setNodes((nds) =>
        nds.map((n) => ({
          ...n,
          style: ids.has(n.id)
            ? { filter: "drop-shadow(0 0 10px #3b82f6)", zIndex: 10 }
            : { opacity: 0.25 },
        })),
      );

      if (list.length > 0) {
        navigateToMatch(list[0]);
      }
    },
    [persons, setNodes, navigateToMatch],
  );

  const handleNextMatch = useCallback(() => {
    if (matchList.length <= 1) return;
    const next = (matchIndex + 1) % matchList.length;
    setMatchIndex(next);
    navigateToMatch(matchList[next]);
  }, [matchList, matchIndex, navigateToMatch]);

  const handlePrevMatch = useCallback(() => {
    if (matchList.length <= 1) return;
    const prev = (matchIndex - 1 + matchList.length) % matchList.length;
    setMatchIndex(prev);
    navigateToMatch(matchList[prev]);
  }, [matchList, matchIndex, navigateToMatch]);

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node<PersonNodeData>) => {
      if (didLongPress.current) {
        didLongPress.current = false;
        return;
      }
      if (!editable) {
        setSelectedPerson(node.data.person);
      }
    },
    [editable],
  );

  const onNodeContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
  }, []);

  const emitPositions = useCallback(() => {
    if (!onPositionsChange) return;
    const map = new Map<string, { x: number; y: number }>();
    for (const n of nodes) {
      map.set(n.id, { x: n.position.x, y: n.position.y });
    }
    onPositionsChange(map);
  }, [nodes, onPositionsChange]);

  const handleNodeDragStop = useCallback(() => {
    emitPositions();
  }, [emitPositions]);

  const handleSelectionDragStop = useCallback(() => {
    emitPositions();
  }, [emitPositions]);

  return (
    <div className="w-full h-full relative">
      {!editable && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 w-72 sm:w-96">
          <SearchBar
            onSearch={handleSearch}
            matchCount={searchQuery ? matchIds.size : undefined}
            matchIndex={matchIndex}
            onNext={handleNextMatch}
            onPrev={handlePrevMatch}
          />
        </div>
      )}

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onNodeContextMenu={onNodeContextMenu}
        onNodeDragStart={clearLongPress}
        onNodeDragStop={editable ? handleNodeDragStop : undefined}
        onSelectionDragStop={editable ? handleSelectionDragStop : undefined}
        nodeTypes={nodeTypes}
        nodesDraggable={editable}
        selectionOnDrag={editable}
        selectionMode={editable ? SelectionMode.Partial : undefined}
        panOnDrag={editable ? [1] : true}
        snapToGrid={editable}
        snapGrid={[24, 24]}
        minZoom={0.05}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#e2e8f0" gap={24} />
        <Controls showInteractive={false} className="bottom-4! right-4!" />
      </ReactFlow>

      <PersonModal
        person={selectedPerson}
        persons={persons}
        relationships={relationships}
        onClose={() => setSelectedPerson(null)}
      />

      {longPressPerson && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
          onClick={() => setLongPressPerson(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl p-5 space-y-4 max-w-xs w-full animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center space-y-1">
              <p className="text-lg font-bold text-slate-800">
                {longPressPerson.gender === "male" ? "👨" : "🧕"}{" "}
                {longPressPerson.name}
              </p>
              <p className="text-sm text-slate-500">Lihat detail keturunan?</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setLongPressPerson(null)}
                className="btn-secondary flex-1 text-sm"
              >
                Batal
              </button>
              <button
                onClick={() => {
                  window.open(`/detail/${longPressPerson.id}`, "_blank");
                  setLongPressPerson(null);
                }}
                className="btn-primary flex-1 text-sm"
              >
                Buka
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function FamilyTree(props: Props) {
  return (
    <ReactFlowProvider>
      <TreeInner {...props} />
    </ReactFlowProvider>
  );
}
