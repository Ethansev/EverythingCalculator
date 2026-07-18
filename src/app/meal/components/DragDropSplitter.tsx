"use client";

import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  useDraggable,
  useDroppable,
} from "@dnd-kit/core";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Users } from "lucide-react";
import type { Person, ReceiptItem, Charge } from "@/types/meal";
import { allocateCents, calculateSplit } from "@/utils/meal/splitCalculations";

interface DragDropSplitterProps {
  items: ReceiptItem[];
  participants: Person[];
  charges: Charge[];
  onItemsChange: (items: ReceiptItem[]) => void;
}

function hasValidExactSplits(item: ReceiptItem): boolean {
  const exact = item.exactSplits;
  if (exact === undefined) return false;
  const priceCents = Math.round(item.price * 100);
  return (
    Object.keys(exact).length === item.assignedTo.length &&
    item.assignedTo.every((id) => typeof exact[id] === "number") &&
    item.assignedTo.reduce((sum, id) => sum + Math.round(exact[id] * 100), 0) === priceCents
  );
}

function itemShares(item: ReceiptItem): Map<string, number> {
  const shares = new Map<string, number>();
  if (item.assignedTo.length === 0) return shares;
  const exact = item.exactSplits;
  const priceCents = Math.round(item.price * 100);
  const exactValid = hasValidExactSplits(item);
  if (exactValid && exact !== undefined) {
    for (const id of item.assignedTo) shares.set(id, exact[id]);
  } else {
    const cents = allocateCents(priceCents, item.assignedTo.map(() => 1));
    item.assignedTo.forEach((id, index) => shares.set(id, cents[index] / 100));
  }
  return shares;
}

function ExactSplitEditor({
  item,
  assignedParticipants,
  onSetExactSplits,
  onClose,
}: {
  item: ReceiptItem;
  assignedParticipants: Person[];
  onSetExactSplits: (splits: Record<string, number> | undefined) => void;
  onClose: () => void;
}) {
  const shares = itemShares(item);
  const [drafts, setDrafts] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const person of assignedParticipants) {
      initial[person.id] = (shares.get(person.id) ?? 0).toFixed(2);
    }
    return initial;
  });

  const parsedCents = assignedParticipants.map((person) => {
    const value = parseFloat(drafts[person.id]);
    return Number.isFinite(value) && value >= 0 ? Math.round(value * 100) : null;
  });
  const allValid = parsedCents.every((c) => c !== null);
  const sumCents = parsedCents.reduce<number>((sum, c) => sum + (c ?? 0), 0);
  const priceCents = Math.round(item.price * 100);
  const remainingCents = priceCents - sumCents;
  const canApply = allValid && remainingCents === 0;

  const apply = () => {
    const splits: Record<string, number> = {};
    assignedParticipants.forEach((person, index) => {
      const cents = parsedCents[index];
      if (cents !== null) splits[person.id] = cents / 100;
    });
    onSetExactSplits(splits);
    onClose();
  };

  return (
    <div className="mt-3 p-3 bg-stone-100 rounded-lg space-y-2">
      {assignedParticipants.map((person) => (
        <div key={person.id} className="flex items-center gap-2">
          <span
            className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs shrink-0"
            style={{ backgroundColor: person.color }}
          >
            {person.name.charAt(0).toUpperCase()}
          </span>
          <span className="text-sm text-gray-700 dark:text-gray-300 flex-1">
            {person.name}
          </span>
          <span className="text-gray-500">$</span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={drafts[person.id] ?? ""}
            onChange={(event) =>
              setDrafts({ ...drafts, [person.id]: event.target.value })
            }
            className="w-24 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white"
          />
        </div>
      ))}
      <div
        className={`text-sm text-right ${
          remainingCents === 0
            ? "text-green-600 dark:text-green-400"
            : "text-amber-600 dark:text-amber-400"
        }`}
      >
        {remainingCents === 0
          ? "Adds up ✓"
          : `Remaining: $${(remainingCents / 100).toFixed(2)}`}
      </div>
      <div className="flex justify-end gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            onSetExactSplits(undefined);
            onClose();
          }}
        >
          Reset to equal
        </Button>
        <Button size="sm" onClick={apply} disabled={!canApply}>
          Apply
        </Button>
      </div>
    </div>
  );
}

function StripAvatar({ person, total }: { person: Person; total: number }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: person.id,
  });
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      data-person-id={person.id}
      style={{ touchAction: "none" }}
      className={`flex flex-col items-center cursor-grab active:cursor-grabbing select-none ${
        isDragging ? "opacity-50" : ""
      }`}
    >
      <div
        className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold ring-2 ring-stone-900 shadow"
        style={{ backgroundColor: person.color }}
      >
        {person.name.charAt(0).toUpperCase()}
      </div>
      <span className="text-[10px] font-receipt text-stone-300 mt-0.5">
        ${total.toFixed(2)}
      </span>
    </div>
  );
}

function ItemCard({
  item,
  participants,
  assignedParticipants,
  onToggle,
  onSetExactSplits,
}: {
  item: ReceiptItem;
  participants: Person[];
  assignedParticipants: Person[];
  onToggle: (personId: string) => void;
  onSetExactSplits: (splits: Record<string, number> | undefined) => void;
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: item.id,
  });
  const [isEditingAmounts, setIsEditingAmounts] = useState(false);
  const shares = itemShares(item);

  const state: "unassigned" | "custom" | "assigned" =
    assignedParticipants.length === 0
      ? "unassigned"
      : hasValidExactSplits(item)
      ? "custom"
      : "assigned";
  const edgeColor =
    state === "custom" ? "#8b5cf6" : assignedParticipants[0]?.color ?? "#3b82f6";

  return (
    <div
      ref={setNodeRef}
      className={`rounded-lg px-3 py-2.5 transition-all font-receipt ${
        state === "unassigned"
          ? `border-[1.5px] border-dashed ${
              isOver ? "border-blue-400 bg-blue-50" : "border-amber-500 bg-amber-50"
            }`
          : `bg-[#fdfbf7] border border-stone-200 shadow ${
              isOver ? "ring-2 ring-blue-400" : ""
            }`
      }`}
      style={
        state === "unassigned" ? undefined : { borderLeft: `4px solid ${edgeColor}` }
      }
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="font-bold uppercase text-sm text-stone-800">
          {item.name}
        </span>
        <span className="text-sm text-stone-500">${item.price.toFixed(2)}</span>
        {state === "custom" && (
          <span className="text-[10px] font-bold tracking-wider text-violet-700 border-[1.5px] border-violet-600 rounded px-1 -rotate-3">
            CUSTOM
          </span>
        )}
        {state === "unassigned" && (
          <span className="text-xs text-amber-700">needs people</span>
        )}
        <div className="flex flex-wrap gap-1.5 ml-auto">
          {participants.map((person) => {
            const isAssigned = item.assignedTo.includes(person.id);
            const share = shares.get(person.id);
            return (
              <button
                key={person.id}
                type="button"
                onClick={() => onToggle(person.id)}
                className={`font-sans flex items-center px-2 py-1 rounded-full text-xs font-medium transition-all border ${
                  isAssigned
                    ? "text-white border-transparent"
                    : "text-gray-500 dark:text-gray-400 border-gray-300 dark:border-gray-600 bg-transparent"
                }`}
                style={isAssigned ? { backgroundColor: person.color } : undefined}
              >
                {person.name}
                {isAssigned && share !== undefined && (
                  <span className="ml-1 opacity-90">${share.toFixed(2)}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Customize amounts expander */}
      {assignedParticipants.length >= 2 && (
        <div className="mt-3">
          <button
            type="button"
            onClick={() => setIsEditingAmounts((open) => !open)}
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            {hasValidExactSplits(item) ? "Edit custom amounts" : "Customize amounts"}
            {hasValidExactSplits(item) && (
              <span className="ml-2 text-xs bg-blue-100 dark:bg-blue-900/30 px-1.5 py-0.5 rounded">
                custom
              </span>
            )}
          </button>
          {isEditingAmounts && (
            <ExactSplitEditor
              item={item}
              assignedParticipants={assignedParticipants}
              onSetExactSplits={onSetExactSplits}
              onClose={() => setIsEditingAmounts(false)}
            />
          )}
        </div>
      )}
    </div>
  );
}

export function DragDropSplitter({
  items,
  participants,
  charges,
  onItemsChange,
}: DragDropSplitterProps) {
  const [draggedPerson, setDraggedPerson] = useState<Person | null>(null);

  const toggleAssignment = (itemId: string, personId: string) => {
    onItemsChange(
      items.map((item) => {
        if (item.id !== itemId) return item;
        const isAssigned = item.assignedTo.includes(personId);
        return {
          ...item,
          assignedTo: isAssigned
            ? item.assignedTo.filter((id) => id !== personId)
            : [...item.assignedTo, personId],
          exactSplits: undefined,
        };
      })
    );
  };

  const handleDragStart = (event: DragStartEvent) => {
    const person = participants.find((p) => p.id === event.active.id);
    setDraggedPerson(person ?? null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setDraggedPerson(null);
    if (over && typeof active.id === "string" && typeof over.id === "string") {
      toggleAssignment(over.id, active.id);
    }
  };

  const splitEqually = () => {
    onItemsChange(
      items.map((item) => ({
        ...item,
        assignedTo: participants.map((p) => p.id),
        exactSplits: undefined,
      }))
    );
  };

  const clearAllAssignments = () => {
    onItemsChange(
      items.map((item) => ({
        ...item,
        assignedTo: [],
        exactSplits: undefined,
      }))
    );
  };

  const split = calculateSplit(items, charges, participants);
  const totalByPerson = new Map(
    split.perPerson.map((p) => [p.personId, p.total])
  );
  const assignedCount = items.filter((i) => i.assignedTo.length > 0).length;

  return (
    <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="space-y-3">
        {/* Sticky people strip */}
        <div className="sticky top-2 z-10 bg-stone-900/90 backdrop-blur border border-stone-700 rounded-xl px-3 py-2 flex items-center gap-2 shadow-lg">
          <div className="flex gap-2 overflow-x-auto">
            {participants.map((person) => (
              <StripAvatar
                key={person.id}
                person={person}
                total={totalByPerson.get(person.id) ?? 0}
              />
            ))}
          </div>
          <span className="text-xs text-stone-400 whitespace-nowrap ml-1">
            {assignedCount} of {items.length} assigned
          </span>
          <div className="ml-auto flex gap-1.5">
            <Button
              variant="outline"
              size="sm"
              className="border-stone-700 bg-transparent text-stone-300 hover:bg-white/10 hover:text-white h-7 px-2 text-xs"
              onClick={splitEqually}
            >
              <Users className="w-3 h-3 mr-1" />
              Split equally
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="border-stone-700 bg-transparent text-stone-400 hover:bg-white/10 hover:text-white h-7 px-2 text-xs"
              onClick={clearAllAssignments}
            >
              Clear
            </Button>
          </div>
        </div>

        {/* Item cards */}
        <div className="space-y-2">
          {items.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              participants={participants}
              assignedParticipants={participants.filter((p) =>
                item.assignedTo.includes(p.id)
              )}
              onToggle={(personId) => toggleAssignment(item.id, personId)}
              onSetExactSplits={(splits) =>
                onItemsChange(
                  items.map((i) =>
                    i.id === item.id ? { ...i, exactSplits: splits } : i
                  )
                )
              }
            />
          ))}
        </div>
      </div>

      <DragOverlay>
        {draggedPerson && (
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center text-white font-medium shadow-lg opacity-80"
            style={{ backgroundColor: draggedPerson.color }}
          >
            {draggedPerson.name.charAt(0).toUpperCase()}
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
