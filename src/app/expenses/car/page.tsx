"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Car, Users, Fuel, Calculator, Receipt, MapPin } from "lucide-react"
import Link from "next/link"

export default function CarExpensePage() {
  const [currentStep] = useState<'details' | 'participants' | 'costs' | 'summary'>('details')

  const steps = [
    { id: 'details', title: 'Trip Details', icon: MapPin, description: 'Enter trip information' },
    { id: 'participants', title: 'Travelers', icon: Users, description: 'Add people sharing the car' },
    { id: 'costs', title: 'Costs', icon: Fuel, description: 'Add gas, rental, and other costs' },
    { id: 'summary', title: 'Summary', icon: Receipt, description: 'Review cost breakdown' }
  ]

  const currentStepIndex = steps.findIndex(step => step.id === currentStep)

  return (
    <main className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-100 dark:from-gray-900 dark:to-gray-800">
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
            Car & Transportation Expenses
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Split car rental, gas, and road trip costs fairly
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
                            ? 'bg-orange-600 text-white'
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
                        isActive ? 'text-orange-600' : 'text-gray-500'
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
            <div className="text-center py-12">
              <Car className="w-16 h-16 mx-auto text-orange-500 mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Car Expense Flow Coming Soon
              </h3>
              <p className="text-gray-600 dark:text-gray-300 max-w-md mx-auto">
                The car expense flow will handle rental costs, gas expenses, tolls, 
                and other transportation costs with options for different splitting methods 
                based on usage or equally among travelers.
              </p>
            </div>

            {/* Feature Preview */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
              <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4">
                <Car className="w-8 h-8 text-orange-600 dark:text-orange-400 mb-2" />
                <h4 className="font-medium text-orange-900 dark:text-orange-100 mb-1">
                  Rental Costs
                </h4>
                <p className="text-sm text-orange-700 dark:text-orange-300">
                  Split daily rental rates and insurance fees
                </p>
              </div>
              
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                <Fuel className="w-8 h-8 text-green-600 dark:text-green-400 mb-2" />
                <h4 className="font-medium text-green-900 dark:text-green-100 mb-1">
                  Gas Tracking
                </h4>
                <p className="text-sm text-green-700 dark:text-green-300">
                  Track multiple fill-ups and split by mileage or equally
                </p>
              </div>
              
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                <MapPin className="w-8 h-8 text-blue-600 dark:text-blue-400 mb-2" />
                <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-1">
                  Trip Segments
                </h4>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Different people can join for different parts of the trip
                </p>
              </div>
              
              <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
                <Calculator className="w-8 h-8 text-purple-600 dark:text-purple-400 mb-2" />
                <h4 className="font-medium text-purple-900 dark:text-purple-100 mb-1">
                  Smart Splitting
                </h4>
                <p className="text-sm text-purple-700 dark:text-purple-300">
                  Split by distance traveled or days participated
                </p>
              </div>
            </div>

            {/* Additional Costs Preview */}
            <div className="mt-8 bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
              <h4 className="font-medium text-gray-900 dark:text-white mb-4">
                Trackable Expenses
              </h4>
              <div className="flex flex-wrap gap-2">
                {[
                  '⛽ Gas', '🚗 Rental', '🛣️ Tolls', 
                  '🅿️ Parking', '🔧 Maintenance', '🎫 Tickets', 
                  '🛡️ Insurance', '🧼 Car Wash', '🗺️ GPS Rental'
                ].map((expense) => (
                  <span
                    key={expense}
                    className="px-3 py-1 bg-white dark:bg-gray-600 rounded-full text-sm text-gray-700 dark:text-gray-300"
                  >
                    {expense}
                  </span>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Navigation */}
          <div className="flex justify-center">
            <Link href="/">
              <Button variant="outline">
                Back to Expense Types
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}