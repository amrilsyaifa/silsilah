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
import {
  buildTreeElements,
  countDescendants,
  DESCENDANT_LABELS,
  NODE_HEIGHT,
  NODE_WIDTH,
  PersonNodeData,
} from "@/lib/tree-utils";
import PersonNode from "./PersonNode";
import PersonModal from "./PersonModal";
import SearchBar from "./SearchBar";

const nodeTypes = { personNode: PersonNode };

const LONG_PRESS_MS = 500;
const EXPORT_ROOT_WIDTH = 230;
const EXPORT_PADDING = 96;
const EXPORT_JPG_MAX_SIDE = 6000;
const EXPORT_JPG_MAX_PIXELS = 18_000_000;

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
  const { setCenter, setViewport } = useReactFlow();
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [matchIds, setMatchIds] = useState<Set<string>>(new Set());
  const [matchList, setMatchList] = useState<string[]>([]);
  const [matchIndex, setMatchIndex] = useState(0);
  const [longPressPerson, setLongPressPerson] = useState<Person | null>(null);
  const [filterPerson, setFilterPerson] = useState<Person | null>(null);
  const [visibleLevels, setVisibleLevels] = useState<Set<string>>(
    () => new Set(DESCENDANT_LABELS),
  );

  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const didLongPress = useRef(false);
  const treeRef = useRef<HTMLDivElement | null>(null);

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
  const personIds = useMemo(
    () => new Set(persons.map((p) => p.id)),
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

  const hiddenNodeIds = useMemo(() => {
    if (!filterPerson) return new Set<string>();

    const descendants = countDescendants(filterPerson.id, relationships, personIds);
    const firstHiddenIndex = descendants.findIndex(
      (d, index) =>
        !visibleLevels.has(
          DESCENDANT_LABELS[Math.min(index, DESCENDANT_LABELS.length - 1)] ??
            d.label,
        ),
    );

    if (firstHiddenIndex === -1) return new Set<string>();

    const hidden = new Set(
      descendants
        .slice(firstHiddenIndex)
        .flatMap((descendant) => descendant.personIds),
    );

    const childrenOf = new Map<string, string[]>();
    const spouseOf = new Map<string, string>();
    for (const relationship of relationships) {
      if (relationship.type === "father" || relationship.type === "mother") {
        const children = childrenOf.get(relationship.person_id) ?? [];
        if (!children.includes(relationship.related_person_id)) {
          children.push(relationship.related_person_id);
        }
        childrenOf.set(relationship.person_id, children);
      }

      if (relationship.type === "spouse") {
        spouseOf.set(relationship.person_id, relationship.related_person_id);
        spouseOf.set(relationship.related_person_id, relationship.person_id);
      }
    }

    const queue = [...hidden];
    while (queue.length > 0) {
      const id = queue.shift()!;
      const spouse = spouseOf.get(id);
      if (spouse && !hidden.has(spouse)) {
        hidden.add(spouse);
        queue.push(spouse);
      }

      for (const childId of childrenOf.get(id) ?? []) {
        if (!hidden.has(childId)) {
          hidden.add(childId);
          queue.push(childId);
        }
      }
    }

    return hidden;
  }, [filterPerson, relationships, visibleLevels, personIds]);

  const visibleTreeNodes = useMemo(
    () => initialNodes.filter((n) => !hiddenNodeIds.has(n.id)),
    [initialNodes, hiddenNodeIds],
  );

  const visibleNodeIds = useMemo(
    () => new Set(visibleTreeNodes.map((n) => n.id)),
    [visibleTreeNodes],
  );

  const visibleTreeEdges = useMemo(
    () =>
      initialEdges.filter(
        (e) => visibleNodeIds.has(e.source) && visibleNodeIds.has(e.target),
      ),
    [initialEdges, visibleNodeIds],
  );

  const nodesWithCallbacks = useMemo(
    () =>
      visibleTreeNodes.map((n) => ({
        ...n,
        data: {
          ...n.data,
          onPointerDown: onPointerDownNode,
          onPointerUp: onPointerUpNode,
        },
      })),
    [visibleTreeNodes, onPointerDownNode, onPointerUpNode],
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(nodesWithCallbacks);
  const [edges, setEdges, onEdgesChange] = useEdgesState(visibleTreeEdges);

  useEffect(() => {
    setNodes(nodesWithCallbacks);
    setEdges(visibleTreeEdges);
  }, [nodesWithCallbacks, setNodes, setEdges, visibleTreeEdges]);

  useEffect(() => {
    if (!rootId) return;
    const rootNode = initialNodes.find((n) => n.id === rootId);
    if (!rootNode) return;

    setTimeout(() => {
      const wrapperWidth = treeRef.current?.clientWidth ?? window.innerWidth;
      const zoom = 0.7;
      const rootWidth = getExportNodeWidth(rootNode);
      const rootCenterX = rootNode.position.x + rootWidth / 2;
      const rootCenterY = rootNode.position.y + NODE_HEIGHT / 2;
      const rootTopOffset = editable ? 32 : 88;

      setViewport({
        x: wrapperWidth / 2 - rootCenterX * zoom,
        y: rootTopOffset + NODE_HEIGHT / 2 - rootCenterY * zoom,
        zoom,
      }, {
        duration: 600,
      });
    }, 120);
  }, [setViewport, rootId, initialNodes, editable]);

  const navigateToMatch = useCallback(
    (matchId: string) => {
      const node = visibleTreeNodes.find((n) => n.id === matchId);
      if (node) {
        setCenter(node.position.x + 95, node.position.y + 45, {
          zoom: 1.2,
          duration: 600,
        });
      }
    },
    [visibleTreeNodes, setCenter],
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
      const matches = persons.filter(
        (p) => visibleNodeIds.has(p.id) && p.name.toLowerCase().includes(lower),
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
    [persons, setNodes, navigateToMatch, visibleNodeIds],
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
        if (filterPerson?.id !== node.data.person.id) {
          setVisibleLevels(new Set(DESCENDANT_LABELS));
          setFilterPerson(node.data.person);
        }
        setSelectedPerson(node.data.person);
      }
    },
    [editable, filterPerson],
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

  const handleExportImage = useCallback(async () => {
    if (visibleTreeNodes.length === 0) return;
    await exportTreeAsJpg(visibleTreeNodes, visibleTreeEdges);
  }, [visibleTreeNodes, visibleTreeEdges]);

  return (
    <div ref={treeRef} className="w-full h-full relative">
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
        key={selectedPerson?.id ?? "empty"}
        person={selectedPerson}
        persons={persons}
        relationships={relationships}
        visibleLevels={visibleLevels}
        onVisibleLevelsChange={setVisibleLevels}
        onExportImage={handleExportImage}
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

async function exportTreeAsJpg(
  nodes: Node<PersonNodeData>[],
  edges: { id: string; source: string; target: string }[],
) {
  const { svg, bounds } = buildExportSvg(nodes, edges);
  const svgUrl = URL.createObjectURL(
    new Blob([svg], { type: "image/svg+xml;charset=utf-8" }),
  );

  try {
    const image = await loadImage(svgUrl);
    const scale = getJpgExportScale(bounds.width, bounds.height);
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bounds.width * scale));
    canvas.height = Math.max(1, Math.round(bounds.height * scale));

    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Browser tidak mendukung image export.");

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

    const blob = await canvasToJpgBlob(canvas);
    downloadBlob(blob, `silsilah-keluarga-${new Date().toISOString().slice(0, 10)}.jpg`);
  } finally {
    URL.revokeObjectURL(svgUrl);
  }
}

function buildExportSvg(
  nodes: Node<PersonNodeData>[],
  edges: { id: string; source: string; target: string }[],
) {
  const bounds = getExportBounds(nodes);
  const nodeMap = new Map(nodes.map((node) => [node.id, node]));
  const offsetX = -bounds.minX + EXPORT_PADDING;
  const offsetY = -bounds.minY + EXPORT_PADDING;
  const edgeMarkup = edges
    .map((edge) => {
      const source = nodeMap.get(edge.source);
      const target = nodeMap.get(edge.target);
      if (!source || !target) return "";
      return exportEdgeToSvg(edge.id, source, target, offsetX, offsetY);
    })
    .join("");
  const nodeMarkup = nodes
    .map((node) => exportNodeToSvg(node, offsetX, offsetY))
    .join("");
  const svg = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<svg xmlns="http://www.w3.org/2000/svg" width="${bounds.width}" height="${bounds.height}" viewBox="0 0 ${bounds.width} ${bounds.height}">`,
    `<defs>`,
    `<filter id="cardShadow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="2" dy="4" stdDeviation="3" flood-color="#000000" flood-opacity="0.12"/></filter>`,
    `<linearGradient id="rootGradient" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#fffbeb"/><stop offset="100%" stop-color="#fef3c7"/></linearGradient>`,
    `<linearGradient id="maleGradient" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#eff6ff"/><stop offset="100%" stop-color="#dbeafe"/></linearGradient>`,
    `<linearGradient id="femaleGradient" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#fdf2f8"/><stop offset="100%" stop-color="#fce7f3"/></linearGradient>`,
    `</defs>`,
    `<rect width="100%" height="100%" fill="#ffffff"/>`,
    edgeMarkup,
    nodeMarkup,
    `</svg>`,
  ].join("");
  return { svg, bounds };
}

function getJpgExportScale(width: number, height: number) {
  const sideScale = Math.min(
    EXPORT_JPG_MAX_SIDE / width,
    EXPORT_JPG_MAX_SIDE / height,
    1,
  );
  const pixelScale = Math.min(
    Math.sqrt(EXPORT_JPG_MAX_PIXELS / (width * height)),
    1,
  );
  return Math.max(0.2, Math.min(sideScale, pixelScale));
}

async function loadImage(src: string) {
  const image = new Image();
  image.decoding = "async";
  const loaded = new Promise<HTMLImageElement>((resolve, reject) => {
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Gagal membaca SVG untuk export JPG."));
  });
  image.src = src;
  return loaded;
}

async function canvasToJpgBlob(canvas: HTMLCanvasElement) {
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, "image/jpeg", 0.92);
  });
  if (!blob) throw new Error("Gagal membuat JPG export.");
  return blob;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function getExportBounds(nodes: Node<PersonNodeData>[]) {
  const xs = nodes.flatMap((node) => {
    const width = getExportNodeWidth(node);
    return [node.position.x, node.position.x + width];
  });
  const ys = nodes.flatMap((node) => [
    node.position.y,
    node.position.y + NODE_HEIGHT,
  ]);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  return {
    minX,
    minY,
    width: maxX - minX + EXPORT_PADDING * 2,
    height: maxY - minY + EXPORT_PADDING * 2,
  };
}

function getExportNodeWidth(node: Node<PersonNodeData>) {
  return node.data.isRoot ? EXPORT_ROOT_WIDTH : NODE_WIDTH;
}

function exportEdgeToSvg(
  edgeId: string,
  source: Node<PersonNodeData>,
  target: Node<PersonNodeData>,
  offsetX: number,
  offsetY: number,
) {
  const sourceWidth = getExportNodeWidth(source);
  const targetWidth = getExportNodeWidth(target);
  const sourceX = source.position.x + offsetX + sourceWidth / 2;
  const sourceY = source.position.y + offsetY + NODE_HEIGHT;
  const targetX = target.position.x + offsetX + targetWidth / 2;
  const targetY = target.position.y + offsetY;
  const isSpouse = edgeId.startsWith("spouse-");
  const stroke = isSpouse ? "#f9a8d4" : "#cbd5e1";
  const dash = isSpouse ? ` stroke-dasharray="6 4"` : "";
  if (isSpouse) {
    const x1 = source.position.x + offsetX + sourceWidth;
    const y1 = source.position.y + offsetY + NODE_HEIGHT / 2;
    const x2 = target.position.x + offsetX;
    const y2 = target.position.y + offsetY + NODE_HEIGHT / 2;
    return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="2"${dash}/>`;
  }

  const midY = sourceY + (targetY - sourceY) / 2;
  return `<path d="M ${sourceX} ${sourceY} C ${sourceX} ${midY}, ${targetX} ${midY}, ${targetX} ${targetY}" fill="none" stroke="${stroke}" stroke-width="2"/>`;
}

function exportNodeToSvg(
  node: Node<PersonNodeData>,
  offsetX: number,
  offsetY: number,
) {
  const { person, isRoot } = node.data;
  const width = getExportNodeWidth(node);
  const height = NODE_HEIGHT;
  const x = node.position.x + offsetX;
  const y = node.position.y + offsetY;
  const isMale = person.gender === "male";
  const gradient = isRoot ? "rootGradient" : isMale ? "maleGradient" : "femaleGradient";
  const opacity = person.is_alive ? 1 : 0.58;
  const icon = isMale ? "👨" : "🧕";
  const name = truncateText(person.name, isRoot ? 22 : 20);
  const meta: string[] = [];
  if (!person.is_alive) {
    meta.push(person.gender === "male" ? "رَحِمَهُ ٱللَّٰهُ" : "رَحِمَهَا ٱللَّٰهُ");
  }
  if (person.birth_date) {
    meta.push(String(new Date(person.birth_date).getFullYear()));
  }
  if (person.phone) {
    meta.push("HP");
  }
  const metaText = truncateText(meta.join("  "), 24);
  const border = isRoot ? "#f59e0b" : "#e2e8f0";

  return [
    `<g opacity="${opacity}">`,
    `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="16" fill="url(#${gradient})" stroke="${border}" stroke-width="2" filter="url(#cardShadow)"/>`,
    `<text x="${x + 16}" y="${y + height / 2 + 10}" font-size="${isRoot ? 34 : 30}" font-family="system-ui, Apple Color Emoji, Segoe UI Emoji">${escapeXml(icon)}</text>`,
    `<text x="${x + 62}" y="${y + 38}" fill="#1e293b" font-size="${isRoot ? 16 : 14}" font-weight="700" font-family="system-ui, -apple-system, sans-serif">${escapeXml(name)}</text>`,
    metaText
      ? `<text x="${x + 62}" y="${y + 60}" fill="#64748b" font-size="12" font-family="system-ui, -apple-system, sans-serif">${escapeXml(metaText)}</text>`
      : "",
    `</g>`,
  ].join("");
}

function truncateText(text: string, maxLength: number) {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 3)}...`;
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
