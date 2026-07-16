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
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { UserPlus, Users, DollarSign, Sparkles } from "lucide-react";
import type { Person, ReceiptItem } from "@/types/meal";
import { allocateCents } from "@/utils/meal/splitCalculations";

interface DragDropSplitterProps {
  items: ReceiptItem[];
  participants: Person[];
  onItemsChange: (items: ReceiptItem[]) => void;
}

function itemShares(item: ReceiptItem): Map<string, number> {
  const shares = new Map<string, number>();
  if (item.assignedTo.length === 0) return shares;
  const exact = item.exactSplits;
  const priceCents = Math.round(item.price * 100);
  const exactValid =
    exact !== undefined &&
    Object.keys(exact).length === item.assignedTo.length &&
    item.assignedTo.every((id) => typeof exact[id] === "number") &&
    item.assignedTo.reduce((sum, id) => sum + Math.round(exact[id] * 100), 0) ===
      priceCents;
  if (exactValid) {
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
    <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-2">
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

export function DragDropSplitter({
  items,
  participants,
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

  return (
    <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="space-y-6">
        <div className="text-center">
          <Sparkles className="w-12 h-12 mx-auto text-blue-600 dark:text-blue-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Assign Items to People
          </h3>
          <p className="text-gray-600 dark:text-gray-300">
            Tap chips to toggle assignment, drag people onto items, or use quick
            actions below
          </p>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-3 justify-center">
          <Button variant="outline" onClick={splitEqually}>
            <Users className="w-4 h-4 mr-2" />
            Split All Equally
          </Button>
          <Button variant="outline" onClick={clearAllAssignments}>
            Clear All
          </Button>
        </div>

        {/* Participants */}
        <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-6">
          <h4 className="font-medium text-gray-900 dark:text-white mb-4 flex items-center">
            <UserPlus className="w-5 h-5 mr-2" />
            Drag from here
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {participants.map((person) => (
              <ParticipantCard key={person.id} person={person} />
            ))}
          </div>
        </div>

        {/* Items */}
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900 dark:text-white flex items-center">
            <DollarSign className="w-5 h-5 mr-2" />
            Drop onto items
          </h4>
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

        {/* Progress */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium text-blue-800 dark:text-blue-200">
              Assignment Progress
            </span>
            <span className="text-blue-600 dark:text-blue-400">
              {items.filter((item) => item.assignedTo.length > 0).length} /{" "}
              {items.length}
            </span>
          </div>
          <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{
                width: `${
                  (items.filter((item) => item.assignedTo.length > 0).length /
                    items.length) *
                  100
                }%`,
              }}
            />
          </div>
        </div>
      </div>

      <DragOverlay>
        {draggedPerson && (
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center text-white font-medium shadow-lg opacity-80"
            style={{ backgroundColor: draggedPerson.color }}
          >
            {draggedPerson.name.charAt(0).toUpperCase()}
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}

function ParticipantCard({ person }: { person: Person }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: person.id,
  });

  return (
    <div
      ref={setNodeRef}
      className={`cursor-grab active:cursor-grabbing ${
        isDragging ? "opacity-50" : ""
      }`}
      style={{ touchAction: "none" }}
      {...listeners}
      {...attributes}
    >
      <motion.div
        whileHover={{ scale: isDragging ? 1 : 1.05 }}
        whileTap={{ scale: isDragging ? 1 : 0.95 }}
        className="flex flex-col items-center p-3 bg-white dark:bg-gray-700 rounded-lg shadow-sm hover:shadow-md transition-all"
      >
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center text-white font-medium mb-2"
          style={{ backgroundColor: person.color }}
        >
          {person.name.charAt(0).toUpperCase()}
        </div>
        <span className="text-xs font-medium text-gray-900 dark:text-white text-center">
          {person.name}
        </span>
      </motion.div>
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

  return (
    <div
      ref={setNodeRef}
      className={`border-2 border-dashed rounded-lg p-4 transition-all ${
        assignedParticipants.length > 0
          ? "border-green-300 dark:border-green-600 bg-green-50 dark:bg-green-900/20"
          : isOver
          ? "border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20"
          : "border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500"
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <div>
          <h5 className="font-medium text-gray-900 dark:text-white">
            {item.name}
          </h5>
          <div className="flex items-center mt-1">
            <DollarSign className="w-4 h-4 text-gray-400 mr-1" />
            <span className="font-semibold text-green-600 dark:text-green-400">
              {item.price.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Tap-to-toggle chips for all participants */}
      <div className="flex flex-wrap gap-2">
        {participants.map((person) => {
          const isAssigned = item.assignedTo.includes(person.id);
          const share = shares.get(person.id);
          return (
            <button
              key={person.id}
              type="button"
              onClick={() => onToggle(person.id)}
              className={`flex items-center px-2 py-1 rounded-full text-xs font-medium transition-all border ${
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

      {/* Customize amounts expander */}
      {assignedParticipants.length >= 2 && (
        <div className="mt-3">
          <button
            type="button"
            onClick={() => setIsEditingAmounts((open) => !open)}
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            {item.exactSplits ? "Edit custom amounts" : "Customize amounts"}
            {item.exactSplits && (
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
