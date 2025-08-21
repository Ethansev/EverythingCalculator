"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { ImageUpload } from "./components/ImageUpload"
import { ExpenseItemsList } from "./components/ExpenseItemsList"
import { DragDropSplitter } from "./components/DragDropSplitter"
import { ParticipantManager } from "@/components/ParticipantManager"
import { ExpenseSummary } from "@/components/ExpenseSummary"
import { Camera, Users, ListCheck, Calculator, Receipt } from "lucide-react"
import Link from "next/link"
import type { Person, ExpenseItem, MealTotals } from "@/lib/types"

type MealFlowStep = 'upload' | 'participants' | 'items' | 'split' | 'summary'

export default function MealExpensePage() {
  const [currentStep, setCurrentStep] = useState<MealFlowStep>('upload')
  const [participants, setParticipants] = useState<Person[]>([])
  const [items, setItems] = useState<ExpenseItem[]>([])
  const [uploadedImage, setUploadedImage] = useState<string | null>(null)
  const [totals, setTotals] = useState<MealTotals | undefined>(undefined)

  const steps = [
    { id: 'upload', title: 'Upload Receipt', icon: Camera, description: 'Take a photo or upload your receipt' },
    { id: 'participants', title: 'Add People', icon: Users, description: 'Add everyone who participated' },
    { id: 'items', title: 'Review Items', icon: ListCheck, description: 'Verify detected items and prices' },
    { id: 'split', title: 'Split Items', icon: Calculator, description: 'Drag people to items they consumed' },
    { id: 'summary', title: 'Summary', icon: Receipt, description: 'Review final calculations' }
  ]

  const currentStepIndex = steps.findIndex(step => step.id === currentStep)

  const handleNext = () => {
    const nextIndex = currentStepIndex + 1
    if (nextIndex < steps.length) {
      setCurrentStep(steps[nextIndex].id as MealFlowStep)
    }
  }

  const handlePrevious = () => {
    const prevIndex = currentStepIndex - 1
    if (prevIndex >= 0) {
      setCurrentStep(steps[prevIndex].id as MealFlowStep)
    }
  }

  const canProceed = () => {
    switch (currentStep) {
      case 'upload': return uploadedImage !== null
      case 'participants': return participants.length >= 2
      case 'items': return items.length > 0
      case 'split': return items.every(item => item.assignedTo.length > 0)
      default: return true
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Link href="/">
            <Button variant="ghost" size="sm">
              ← Back to Home
            </Button>
          </Link>
        </div>
        
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Restaurant & Meal Expenses
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Split restaurant bills by uploading receipts and assigning items
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          {/* Progress Steps */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              {steps.map((step, index) => {
                const StepIcon = step.icon
                const isActive = step.id === currentStep
                const isCompleted = index < currentStepIndex
                
                return (
                  <div key={step.id} className="flex items-center">
                    <div className="flex flex-col items-center">
                      <motion.div
                        className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
                          isActive
                            ? 'bg-green-600 text-white'
                            : isCompleted
                            ? 'bg-green-600 text-white'
                            : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
                        }`}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <StepIcon className="w-6 h-6" />
                      </motion.div>
                      <span className={`text-xs mt-2 font-medium ${
                        isActive ? 'text-green-600' : 'text-gray-500'
                      }`}>
                        {step.title}
                      </span>
                    </div>
                    
                    {index < steps.length - 1 && (
                      <div className={`flex-1 h-1 mx-4 rounded ${
                        isCompleted ? 'bg-green-600' : 'bg-gray-200 dark:bg-gray-700'
                      }`} />
                    )}
                  </div>
                )
              })}
            </div>
            
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                {steps[currentStepIndex].title}
              </h2>
              <p className="text-gray-600 dark:text-gray-300">
                {steps[currentStepIndex].description}
              </p>
            </div>
          </div>

          {/* Step Content */}
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 mb-8"
          >
            {currentStep === 'upload' && (
              <ImageUpload
                onImageUpload={setUploadedImage}
                onItemsDetected={setItems}
                uploadedImage={uploadedImage}
              />
            )}
            
            {currentStep === 'participants' && (
              <ParticipantManager
                participants={participants}
                onParticipantsChange={setParticipants}
              />
            )}
            
            {currentStep === 'items' && (
              <ExpenseItemsList
                items={items}
                onItemsChange={setItems}
                totals={totals}
                onTotalsChange={setTotals}
              />
            )}
            
            {currentStep === 'split' && (
              <DragDropSplitter
                items={items}
                participants={participants}
                onItemsChange={setItems}
              />
            )}
            
            {currentStep === 'summary' && (
              <ExpenseSummary
                items={items}
                participants={participants}
                totals={totals}
              />
            )}
          </motion.div>

          {/* Navigation */}
          <div className="flex justify-between items-center">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStepIndex === 0}
            >
              Previous
            </Button>
            
            <div className="text-sm text-gray-500">
              Step {currentStepIndex + 1} of {steps.length}
            </div>
            
            {currentStepIndex < steps.length - 1 ? (
              <Button
                onClick={handleNext}
                disabled={!canProceed()}
              >
                Next
              </Button>
            ) : (
              <Button>
                Complete
              </Button>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}