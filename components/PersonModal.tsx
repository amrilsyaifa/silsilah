"use client";

import { useState } from "react";
import { Person, Relationship } from "@/lib/types";
import {
  DESCENDANT_LABELS,
  formatPhone,
  countDescendants,
} from "@/lib/tree-utils";

interface Props {
  person: Person | null;
  persons: Person[];
  relationships: Relationship[];
  visibleLevels: Set<string>;
  onVisibleLevelsChange: (levels: Set<string>) => void;
  onExportImage: () => Promise<void>;
  onClose: () => void;
}

export default function PersonModal({
  person,
  persons,
  relationships,
  visibleLevels,
  onVisibleLevelsChange,
  onExportImage,
  onClose,
}: Props) {
  const [expandedLevel, setExpandedLevel] = useState<string | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [includeSpousesInCount, setIncludeSpousesInCount] = useState(false);
  const [exportingImage, setExportingImage] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  if (!person) return null;

  const icon = person.gender === "male" ? "👨" : "🧕";
  const personMap = new Map(persons.map((p) => [p.id, p]));
  const personIds = new Set(personMap.keys());
  const spouseOf = new Map<string, string>();
  for (const relationship of relationships) {
    if (
      relationship.type === "spouse" &&
      personIds.has(relationship.person_id) &&
      personIds.has(relationship.related_person_id)
    ) {
      spouseOf.set(relationship.person_id, relationship.related_person_id);
      spouseOf.set(relationship.related_person_id, relationship.person_id);
    }
  }
  const descendants = countDescendants(person.id, relationships, personIds);
  const firstHiddenIndex = descendants.findIndex(
    (d, index) =>
      !visibleLevels.has(
        DESCENDANT_LABELS[Math.min(index, DESCENDANT_LABELS.length - 1)] ??
          d.label,
      ),
  );
  const visibleDescendants =
    firstHiddenIndex === -1
      ? descendants
      : descendants.slice(0, firstHiddenIndex);
  const visibleDescendantIds = new Set(
    visibleDescendants.flatMap((d) => d.personIds),
  );
  const spouseIds = new Set<string>();
  for (const id of [person.id, ...visibleDescendantIds]) {
    const spouseId = spouseOf.get(id);
    if (spouseId && !visibleDescendantIds.has(spouseId)) {
      spouseIds.add(spouseId);
    }
  }
  const countedPersonIds = includeSpousesInCount
    ? new Set([...visibleDescendantIds, ...spouseIds])
    : visibleDescendantIds;
  const countedPeople = Array.from(countedPersonIds)
    .map((id) => personMap.get(id))
    .filter((p): p is Person => Boolean(p));
  const spousePeople = Array.from(spouseIds)
    .map((id) => personMap.get(id))
    .filter((p): p is Person => Boolean(p));
  const aliveCount = countedPeople.filter((p) => p.is_alive).length;
  const deceasedCount = countedPeople.length - aliveCount;
  const levelSummaries = visibleDescendants.map((d) => {
    const people = d.personIds
      .map((id) => personMap.get(id))
      .filter((p): p is Person => Boolean(p));
    const alive = people.filter((p) => p.is_alive).length;

    return {
      label: d.label,
      total: people.length,
      alive,
      deceased: people.length - alive,
    };
  });
  if (includeSpousesInCount && spousePeople.length > 0) {
    const alive = spousePeople.filter((p) => p.is_alive).length;
    levelSummaries.push({
      label: "Pasangan",
      total: spousePeople.length,
      alive,
      deceased: spousePeople.length - alive,
    });
  }

  const toggleLevel = (label: string) => {
    setExpandedLevel((prev) => (prev === label ? null : label));
  };

  const toggleVisibleLevel = (label: string) => {
    const index = DESCENDANT_LABELS.indexOf(label);
    if (index === -1) return;

    const next = new Set(visibleLevels);
    if (next.has(label)) {
      for (let i = index; i < DESCENDANT_LABELS.length; i++) {
        next.delete(DESCENDANT_LABELS[i]);
      }
    } else {
      for (let i = 0; i <= index; i++) {
        next.add(DESCENDANT_LABELS[i]);
      }
    }
    onVisibleLevelsChange(next);
  };

  const handleExportImage = async () => {
    try {
      setExportError(null);
      setExportingImage(true);
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => resolve());
      });
      await onExportImage();
    } catch (err) {
      setExportError(
        err instanceof Error ? err.message : "Gagal export image.",
      );
    } finally {
      setExportingImage(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-sm rounded-3xl shadow-2xl p-6 space-y-4 animate-slide-up max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3">
          <span className="text-4xl">{icon}</span>
          <div>
            <h2 className="text-xl font-bold text-slate-800">{person.name}</h2>
            <p className="text-sm text-slate-500 capitalize">
              {person.gender === "male" ? "Laki-laki" : "Perempuan"}
              {!person.is_alive &&
                ` · ${person.gender === "male" ? "رَحِمَهُ ٱللَّٰهُ" : "رَحِمَهَا ٱللَّٰهُ"}`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="ml-auto text-slate-400 hover:text-slate-600 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        <hr className="border-slate-100" />

        {/* Details */}
        <div className="space-y-2 text-sm">
          {person.birth_date && (
            <Row label="Lahir">
              {new Date(person.birth_date).toLocaleDateString("id-ID", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </Row>
          )}
          {person.birth_place && (
            <Row label="Tempat Lahir">{person.birth_place}</Row>
          )}
          {person.notes && <Row label="Catatan">{person.notes}</Row>}
        </div>

        {/* Descendants */}
        {descendants.length > 0 && (
          <>
            <hr className="border-slate-100" />
            <div className="space-y-1 text-sm">
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
                  Keturunan
                </p>
                <button
                  type="button"
                  onClick={() => setFilterOpen((prev) => !prev)}
                  className="flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-200"
                >
                  <span
                    className="text-[10px] transition-transform"
                    style={{
                      transform: filterOpen ? "rotate(90deg)" : undefined,
                    }}
                  >
                    ▶
                  </span>
                  {filterOpen ? "Hide" : "Show"} filter
                </button>
              </div>
              {filterOpen && (
                <div className="grid grid-cols-2 gap-2 pb-3 sm:grid-cols-3">
                  {DESCENDANT_LABELS.map((label) => (
                    <label
                      key={label}
                      className="flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600"
                    >
                      <input
                        type="checkbox"
                        checked={visibleLevels.has(label)}
                        onChange={() => toggleVisibleLevel(label)}
                        className="h-4 w-4 rounded border-slate-300 accent-blue-600"
                      />
                      {label}
                    </label>
                  ))}
                  <label className="col-span-2 flex items-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-medium text-blue-700 sm:col-span-3">
                    <input
                      type="checkbox"
                      checked={includeSpousesInCount}
                      onChange={(e) => setIncludeSpousesInCount(e.target.checked)}
                      className="h-4 w-4 rounded border-blue-300 accent-blue-600"
                    />
                    Hitung pasangan
                  </label>
                </div>
              )}
              <DescendantSummary
                total={countedPeople.length}
                alive={aliveCount}
                deceased={deceasedCount}
                levels={levelSummaries}
              />
              {visibleDescendants.length === 0 && (
                <p className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-400">
                  Semua kategori keturunan disembunyikan.
                </p>
              )}
              {visibleDescendants.length > 0 && (
                <div className="rounded-2xl border border-slate-100">
                  <button
                    type="button"
                    onClick={() => setDetailOpen((prev) => !prev)}
                    className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <span>Detail</span>
                    <span
                      className="text-xs text-slate-400 transition-transform"
                      style={{
                        transform: detailOpen ? "rotate(90deg)" : undefined,
                      }}
                    >
                      ▶
                    </span>
                  </button>

                  {detailOpen && (
                    <div className="border-t border-slate-100 px-3 py-2">
                      {visibleDescendants.map((d) => {
                        const isExpanded = expandedLevel === d.label;
                        return (
                          <div key={d.label}>
                            <button
                              onClick={() => toggleLevel(d.label)}
                              className="flex items-center gap-2 w-full py-1.5 hover:bg-slate-50 rounded-lg px-1 -mx-1 transition-colors"
                            >
                              <span
                                className="text-xs text-slate-400 transition-transform"
                                style={{
                                  transform: isExpanded
                                    ? "rotate(90deg)"
                                    : undefined,
                                }}
                              >
                                ▶
                              </span>
                              <span className="text-slate-400 w-24 shrink-0 text-left">
                                {d.label}
                              </span>
                              <span className="text-slate-700 font-medium">
                                {d.count} orang
                              </span>
                            </button>
                            {isExpanded && (
                              <div className="ml-6 mt-1 mb-2 space-y-1 max-h-48 overflow-y-auto">
                                {d.personIds.map((id) => {
                                  const p = personMap.get(id);
                                  if (!p) return null;
                                  return (
                                    <div
                                      key={id}
                                      className="flex items-center gap-2 text-sm py-0.5"
                                    >
                                      <span className="text-base">
                                        {p.gender === "male" ? "👨" : "🧕"}
                                      </span>
                                      <span className="text-slate-700">
                                        {p.name}
                                      </span>
                                      {!p.is_alive && (
                                        <span className="text-xs text-slate-400">
                                          †
                                        </span>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}

        <button
          type="button"
          onClick={handleExportImage}
          disabled={exportingImage}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 py-3 font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
        >
          {exportingImage ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
          ) : (
            <span>⬇</span>
          )}
          {exportingImage ? "Membuat image..." : "Export Image JPG"}
        </button>
        {exportError && (
          <p className="rounded-xl bg-red-50 px-3 py-2 text-xs text-red-600">
            {exportError}
          </p>
        )}

        {/* WA Button */}
        {person.phone && (
          <a
            href={`https://wa.me/${formatPhone(person.phone)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-3 rounded-2xl transition-colors"
          >
            <span>💬</span>
            Chat WhatsApp
          </a>
        )}
      </div>
    </div>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-2">
      <span className="text-slate-400 w-28 shrink-0">{label}</span>
      <span className="text-slate-700 font-medium">{children}</span>
    </div>
  );
}

function DescendantSummary({
  total,
  alive,
  deceased,
  levels,
}: {
  total: number;
  alive: number;
  deceased: number;
  levels: { label: string; total: number; alive: number; deceased: number }[];
}) {
  return (
    <div className="mb-3 overflow-hidden rounded-2xl border border-slate-100 bg-slate-50">
      <div className="grid grid-cols-3 divide-x divide-slate-100 bg-white text-center">
        <SummaryMetric label="Total" value={total} className="text-slate-700" />
        <SummaryMetric label="Hidup" value={alive} className="text-green-700" />
        <SummaryMetric
          label="Wafat"
          value={deceased}
          className="text-rose-700"
        />
      </div>

      {levels.length > 0 && (
        <div className="divide-y divide-slate-100 px-3 py-1">
          {levels.map((level) => (
            <div
              key={level.label}
              className="grid grid-cols-[1fr_44px_44px_44px] items-center gap-2 py-2 text-xs"
            >
              <span className="font-semibold text-slate-600">
                {level.label}
              </span>
              <span className="rounded-lg bg-white px-2 py-1 text-center font-semibold text-slate-700">
                {level.total}
              </span>
              <span className="rounded-lg bg-green-50 px-2 py-1 text-center font-semibold text-green-700">
                {level.alive}
              </span>
              <span className="rounded-lg bg-rose-50 px-2 py-1 text-center font-semibold text-rose-700">
                {level.deceased}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SummaryMetric({
  label,
  value,
  className,
}: {
  label: string;
  value: number;
  className: string;
}) {
  return (
    <div className="px-2 py-3">
      <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className={`text-lg font-bold leading-tight ${className}`}>{value}</p>
    </div>
  );
}
