"use client";

import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { useState, useRef, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
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

function useLongPress(onLongPress: () => void, ms = 500) {
  const timer = useRef<number | null>(null);
  const firedLong = useRef(false);
  useEffect(() => {
    return () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    };
  }, []);
  const start = () => {
    firedLong.current = false;
    timer.current = window.setTimeout(() => {
      firedLong.current = true;
      onLongPress();
    }, ms);
  };
  const cancel = () => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = null;
  };
  return {
    handlers: {
      onPointerDown: start,
      onPointerUp: cancel,
      onPointerLeave: cancel,
      onPointerCancel: cancel,
    },
    firedLongRef: firedLong,
  };
}

function PersonChip({
  person,
  isAssigned,
  share,
  onToggle,
  onOpenExact,
  canOpenExact,
}: {
  person: Person;
  isAssigned: boolean;
  share: number | undefined;
  onToggle: () => void;
  onOpenExact: () => void;
  canOpenExact: boolean;
}) {
  const { handlers, firedLongRef } = useLongPress(() => {
    if (canOpenExact) onOpenExact();
    else onToggle();
  });
  return (
    <button
      type="button"
      {...handlers}
      onClick={() => {
        if (firedLongRef.current) {
          firedLongRef.current = false;
          return;
        }
        onToggle();
      }}
      className={`flex items-center px-2 py-1 rounded-full text-xs font-medium font-sans transition-all border select-none ${
        isAssigned
          ? "text-white border-transparent"
          : "text-stone-500 border-stone-300 bg-transparent"
      }`}
      style={isAssigned ? { backgroundColor: person.color } : undefined}
    >
      {person.name}
      {isAssigned && share !== undefined && (
        <span className="ml-1 opacity-90">${share.toFixed(2)}</span>
      )}
    </button>
  );
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
          <span className="text-sm text-stone-700 flex-1">
            {person.name}
          </span>
          <span className="text-stone-500">$</span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={drafts[person.id] ?? ""}
            onChange={(event) =>
              setDrafts({ ...drafts, [person.id]: event.target.value })
            }
            className="w-24 px-2 py-1 border border-stone-300 rounded bg-white text-sm text-stone-900"
          />
        </div>
      ))}
      <div
        className={`text-sm text-right ${
          remainingCents === 0
            ? "text-green-600"
            : "text-amber-600"
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

function StripAvatar({
  person,
  total,
  isSpotlit,
  onSpotlight,
}: {
  person: Person;
  total: number;
  isSpotlit: boolean;
  onSpotlight: () => void;
}) {
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
      <button type="button" onClick={onSpotlight} aria-label={`Spotlight ${person.name}`}>
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold ring-2 ring-stone-900 shadow"
          style={
            isSpotlit
              ? {
                  backgroundColor: person.color,
                  boxShadow: `0 0 0 2px #171412, 0 0 0 4px ${person.color}`,
                }
              : { backgroundColor: person.color }
          }
        >
          {person.name.charAt(0).toUpperCase()}
        </div>
      </button>
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
  dimmed,
}: {
  item: ReceiptItem;
  participants: Person[];
  assignedParticipants: Person[];
  onToggle: (personId: string) => void;
  onSetExactSplits: (splits: Record<string, number> | undefined) => void;
  dimmed: boolean;
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
      className={`rounded-lg px-3 py-2.5 transition-all font-receipt ${dimmed ? "opacity-35 saturate-50" : ""} ${
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
              <PersonChip
                key={person.id}
                person={person}
                isAssigned={isAssigned}
                share={share}
                onToggle={() => onToggle(person.id)}
                onOpenExact={() => setIsEditingAmounts(true)}
                canOpenExact={isAssigned && assignedParticipants.length >= 2}
              />
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
            className="text-sm text-blue-600 hover:underline"
          >
            {hasValidExactSplits(item) ? "Edit custom amounts" : "Customize amounts"}
            {hasValidExactSplits(item) && (
              <span className="ml-2 text-xs bg-blue-100 px-1.5 py-0.5 rounded">
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
  const [spotlightId, setSpotlightId] = useState<string | null>(null);
  const [celebrate, setCelebrate] = useState(false);
  const celebrateTimer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (celebrateTimer.current !== null) window.clearTimeout(celebrateTimer.current);
    };
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor)
  );

  const maybeCelebrate = (nextItems: ReceiptItem[]) => {
    const wasComplete =
      items.length > 0 && items.every((i) => i.assignedTo.length > 0);
    const isComplete =
      nextItems.length > 0 && nextItems.every((i) => i.assignedTo.length > 0);
    if (!wasComplete && isComplete) {
      setCelebrate(true);
      if (celebrateTimer.current !== null) {
        window.clearTimeout(celebrateTimer.current);
      }
      celebrateTimer.current = window.setTimeout(() => setCelebrate(false), 1400);
    }
  };

  const toggleAssignment = (itemId: string, personId: string) => {
    const next = items.map((item) => {
      if (item.id !== itemId) return item;
      const isAssigned = item.assignedTo.includes(personId);
      return {
        ...item,
        assignedTo: isAssigned
          ? item.assignedTo.filter((id) => id !== personId)
          : [...item.assignedTo, personId],
        exactSplits: undefined,
      };
    });
    maybeCelebrate(next);
    onItemsChange(next);
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
    const next = items.map((item) => ({
      ...item,
      assignedTo: participants.map((p) => p.id),
      exactSplits: undefined,
    }));
    maybeCelebrate(next);
    onItemsChange(next);
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
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="space-y-3">
        {/* Sticky people strip */}
        <div className="sticky top-2 z-10 bg-stone-900/90 backdrop-blur border border-stone-700 rounded-xl px-3 py-2 flex items-center gap-2 shadow-lg">
          <div className="flex gap-2 overflow-x-auto">
            {participants.map((person) => (
              <StripAvatar
                key={person.id}
                person={person}
                total={totalByPerson.get(person.id) ?? 0}
                isSpotlit={spotlightId === person.id}
                onSpotlight={() => setSpotlightId((cur) => (cur === person.id ? null : person.id))}
              />
            ))}
          </div>
          <span className="text-xs text-stone-400 whitespace-nowrap ml-1">
            {assignedCount} of {items.length} assigned
          </span>
          {spotlightId !== null && (
            <button
              type="button"
              onClick={() => setSpotlightId(null)}
              className="text-xs text-amber-400 hover:text-amber-300 whitespace-nowrap"
            >
              clear focus ✕
            </button>
          )}
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

          <AnimatePresence>
            {celebrate && (
              <motion.div
                initial={{ opacity: 0, scale: 1.6, rotate: -14 }}
                animate={{ opacity: 1, scale: 1, rotate: -8 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 flex items-center justify-center pointer-events-none z-20"
              >
                <span className="font-receipt font-bold text-green-400 border-4 border-green-400 rounded px-4 py-1 text-lg tracking-widest bg-stone-900/80">
                  ALL ASSIGNED ✓
                </span>
              </motion.div>
            )}
          </AnimatePresence>
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
              dimmed={spotlightId !== null && !item.assignedTo.includes(spotlightId)}
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
