"use client"

import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, useDraggable, useDroppable } from "@dnd-kit/core"
import { useState } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { UserPlus, Users, DollarSign, Sparkles } from "lucide-react"
import type { Person, ExpenseItem } from "@/lib/types"

interface DragDropSplitterProps {
  items: ExpenseItem[]
  participants: Person[]
  onItemsChange: (items: ExpenseItem[]) => void
}

export function DragDropSplitter({ items, participants, onItemsChange }: DragDropSplitterProps) {
  const [draggedPerson, setDraggedPerson] = useState<Person | null>(null)

  const handleDragStart = (event: DragStartEvent) => {
    const person = participants.find(p => p.id === event.active.id)
    setDraggedPerson(person || null)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setDraggedPerson(null)

    if (over && active.id !== over.id) {
      const personId = active.id as string
      const itemId = over.id as string
      
      onItemsChange(items.map(item => {
        if (item.id === itemId) {
          const isAlreadyAssigned = item.assignedTo.includes(personId)
          return {
            ...item,
            assignedTo: isAlreadyAssigned 
              ? item.assignedTo.filter(id => id !== personId)
              : [...item.assignedTo, personId]
          }
        }
        return item
      }))
    }
  }

  const splitEqually = () => {
    onItemsChange(items.map(item => ({
      ...item,
      assignedTo: participants.map(p => p.id)
    })))
  }

  const clearAllAssignments = () => {
    onItemsChange(items.map(item => ({
      ...item,
      assignedTo: []
    })))
  }

  const getPersonById = (id: string) => participants.find(p => p.id === id)

  return (
    <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="space-y-6">
        <div className="text-center">
          <Sparkles className="w-12 h-12 mx-auto text-blue-600 dark:text-blue-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Assign Items to People
          </h3>
          <p className="text-gray-600 dark:text-gray-300">
            Drag people onto items they consumed, or use quick actions below
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
              assignedParticipants={item.assignedTo.map(id => getPersonById(id)!).filter(Boolean)}
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
              {items.filter(item => item.assignedTo.length > 0).length} / {items.length}
            </span>
          </div>
          <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{
                width: `${(items.filter(item => item.assignedTo.length > 0).length / items.length) * 100}%`
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
  )
}

function ParticipantCard({ person }: { person: Person }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    isDragging,
  } = useDraggable({
    id: person.id,
  })

  return (
    <div
      ref={setNodeRef}
      className={`cursor-grab active:cursor-grabbing ${isDragging ? 'opacity-50' : ''}`}
      style={{ touchAction: 'none' }}
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
  )
}

function ItemCard({ item, assignedParticipants }: { 
  item: ExpenseItem
  assignedParticipants: Person[] 
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: item.id,
  })

  return (
    <div
      ref={setNodeRef}
      className={`border-2 border-dashed rounded-lg p-4 transition-all ${
        assignedParticipants.length > 0
          ? 'border-green-300 dark:border-green-600 bg-green-50 dark:bg-green-900/20'
          : isOver
          ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20'
          : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500'
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
        
        {assignedParticipants.length > 0 && (
          <div className="text-right">
            <div className="text-sm text-gray-600 dark:text-gray-300">
              Split {assignedParticipants.length} ways
            </div>
            <div className="font-semibold text-blue-600 dark:text-blue-400">
              ${(item.price / assignedParticipants.length).toFixed(2)} each
            </div>
          </div>
        )}
      </div>

      {/* Assigned Participants */}
      {assignedParticipants.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {assignedParticipants.map((person) => (
            <div
              key={person.id}
              className="flex items-center px-2 py-1 rounded-full text-xs font-medium text-white"
              style={{ backgroundColor: person.color }}
            >
              <span className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center mr-1 text-xs">
                {person.name.charAt(0).toUpperCase()}
              </span>
              {person.name}
            </div>
          ))}
        </div>
      ) : (
        <div className={`text-center text-sm transition-colors ${
          isOver 
            ? 'text-blue-600 dark:text-blue-400 font-medium' 
            : 'text-gray-400 dark:text-gray-500'
        }`}>
          {isOver ? 'Drop here to assign this item' : 'Drag people here to assign this item'}
        </div>
      )}
    </div>
  )
}