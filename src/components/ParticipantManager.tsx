"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Plus, X, User, Users } from "lucide-react";
import type { Person } from "@/types/meal";

interface ParticipantManagerProps {
  participants: Person[];
  onParticipantsChange: (participants: Person[]) => void;
}

const PARTICIPANT_COLORS = [
  "#3B82F6",
  "#EF4444",
  "#10B981",
  "#F59E0B",
  "#8B5CF6",
  "#EC4899",
  "#14B8A6",
  "#F97316",
  "#6366F1",
  "#84CC16",
];

export function ParticipantManager({
  participants,
  onParticipantsChange,
}: ParticipantManagerProps) {
  const [newParticipantName, setNewParticipantName] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const addParticipant = () => {
    if (newParticipantName.trim()) {
      const newParticipant: Person = {
        id: Date.now().toString(),
        name: newParticipantName.trim(),
        color:
          PARTICIPANT_COLORS[participants.length % PARTICIPANT_COLORS.length],
      };

      onParticipantsChange([...participants, newParticipant]);
      setNewParticipantName("");
      setIsAdding(false);
    }
  };

  const removeParticipant = (id: string) => {
    onParticipantsChange(participants.filter((p) => p.id !== id));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      addParticipant();
    } else if (e.key === "Escape") {
      setIsAdding(false);
      setNewParticipantName("");
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <Users className="w-12 h-12 mx-auto text-stone-400 mb-4" />
        <h3 className="text-lg font-semibold text-stone-800 mb-2">
          Who&apos;s participating?
        </h3>
        <p className="text-stone-500">
          Add everyone who will be splitting this expense
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <AnimatePresence>
          {participants.map((participant, index) => (
            <motion.div
              key={participant.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.2, delay: index * 0.05 }}
              className="group relative border-b border-dashed border-stone-300 py-2 bg-transparent"
            >
              <div className="flex items-center space-x-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-medium text-sm ring-2 ring-white shadow"
                  style={{ backgroundColor: participant.color }}
                >
                  {participant.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-receipt uppercase text-sm text-stone-800 truncate">
                    {participant.name}
                  </p>
                </div>
              </div>

              <Button
                variant="ghost"
                size="sm"
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0 text-stone-400 hover:text-red-600"
                onClick={() => removeParticipant(participant.id)}
              >
                <X className="w-4 h-4" />
              </Button>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Add Participant Card */}
        <motion.div
          layout
          className="border-2 border-dashed border-stone-300 rounded-xl p-4 hover:border-stone-500 transition-colors"
        >
          {isAdding ? (
            <div className="space-y-3">
              <input
                type="text"
                value={newParticipantName}
                onChange={(e) => setNewParticipantName(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Enter name..."
                className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-stone-400 focus:border-transparent bg-white text-stone-800"
                autoFocus
              />
              <div className="flex space-x-2">
                <Button
                  size="sm"
                  onClick={addParticipant}
                  disabled={!newParticipantName.trim()}
                  className="border-stone-300 text-stone-600 hover:bg-stone-100"
                  variant="outline"
                >
                  Add
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsAdding(false);
                    setNewParticipantName("");
                  }}
                  className="border-stone-300 text-stone-600 hover:bg-stone-100"
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setIsAdding(true)}
              className="w-full h-full flex flex-col items-center justify-center text-stone-500 hover:text-stone-700 transition-colors min-h-[80px]"
            >
              <Plus className="w-8 h-8 mb-2" />
              <span className="text-sm font-medium">Add Person</span>
            </button>
          )}
        </motion.div>
      </div>

      {participants.length >= 2 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="border border-dashed border-stone-300 rounded-lg p-4 bg-transparent"
        >
          <div className="flex items-center">
            <User className="w-5 h-5 text-stone-500 mr-2" />
            <span className="text-stone-700 font-medium">
              {participants.length} people added - ready to proceed!
            </span>
          </div>
        </motion.div>
      )}

      {participants.length === 1 && (
        <div className="border border-dashed border-stone-300 rounded-lg p-4 bg-transparent">
          <div className="flex items-center">
            <Users className="w-5 h-5 text-stone-500 mr-2" />
            <span className="text-stone-600 font-medium">
              Add at least one more person to split expenses
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
