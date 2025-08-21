"use client"

import { motion } from "framer-motion"
import { UtensilsCrossed, Hotel, Receipt, Car, Upload, PlusCircle, Clock } from "lucide-react"
import Link from "next/link"

export function ExpenseTypeSelector() {
  const availableTypes = [
    {
      id: 'car' as const,
      href: '/car',
      title: 'Auto Loan Calculator',
      description: 'Calculate monthly payments and visualize loan costs',
      icon: Car,
      color: 'from-orange-400 to-orange-600',
      features: ['Payment calculator', 'Interactive charts', 'Amortization schedule']
    }
  ]

  const comingSoonTypes = [
    {
      id: 'meal' as const,
      href: '/meal',
      title: 'Restaurant & Meals',
      description: 'Split restaurant bills, takeout orders, and group meals',
      icon: UtensilsCrossed,
      color: 'from-green-400 to-green-600',
      features: ['Upload receipt photos', 'Auto-detect items', 'Drag & drop splitting']
    },
    {
      id: 'hotel' as const,
      href: '/hotel',
      title: 'Hotel & Accommodation',
      description: 'Split hotel costs with varying occupancy per night',
      icon: Hotel,
      color: 'from-blue-400 to-blue-600',
      features: ['Multi-night stays', 'Variable occupancy', 'Check-in/out flexibility']
    },
    {
      id: 'general' as const,
      href: '/general',
      title: 'General Expenses',
      description: 'Split any other group expenses like activities, transport, etc.',
      icon: Receipt,
      color: 'from-purple-400 to-purple-600',
      features: ['Custom categories', 'Multiple split methods', 'Manual adjustments']
    }
  ]

  return (
    <div className="max-w-6xl mx-auto space-y-12">
      {/* Available Calculators */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Available Calculators</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {availableTypes.map((type, index) => {
            const IconComponent = type.icon
            return (
              <Link key={type.id} href={type.href}>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="group cursor-pointer h-full"
                >
                  <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-gray-800 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 h-full flex flex-col">
                    <div className={`absolute inset-0 bg-gradient-to-br ${type.color} opacity-0 group-hover:opacity-10 transition-opacity duration-300`} />
                    
                    <div className="p-6 flex flex-col flex-1">
                      <div className={`inline-flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-r ${type.color} text-white mb-4`}>
                        <IconComponent className="w-7 h-7" />
                      </div>
                      
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                        {type.title}
                      </h3>
                      
                      <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 flex-1">
                        {type.description}
                      </p>
                      
                      <ul className="space-y-1 mb-4">
                        {type.features.map((feature, featureIndex) => (
                          <li key={featureIndex} className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                            <div className="w-1 h-1 bg-gray-400 rounded-full mr-2" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                      
                      <div className="mt-auto flex items-center text-sm font-medium text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        Get started
                        <PlusCircle className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </div>
                </motion.div>
              </Link>
            )
          })}
        </div>
      </div>

      {/* Coming Soon */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Coming Soon</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {comingSoonTypes.map((type, index) => {
            const IconComponent = type.icon
            return (
              <motion.div
                key={type.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 + index * 0.1 }}
                className="relative h-full"
              >
                <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-gray-800 shadow-lg h-full flex flex-col opacity-75 grayscale">
                  {/* Coming Soon Badge */}
                  <div className="absolute top-4 right-4 z-10">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                      <Clock className="w-3 h-3 mr-1" />
                      Coming Soon
                    </span>
                  </div>
                  
                  <div className="p-6 flex flex-col flex-1">
                    <div className={`inline-flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-r ${type.color} text-white mb-4 opacity-50`}>
                      <IconComponent className="w-7 h-7" />
                    </div>
                    
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      {type.title}
                    </h3>
                    
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 flex-1">
                      {type.description}
                    </p>
                    
                    <ul className="space-y-1 mb-4">
                      {type.features.map((feature, featureIndex) => (
                        <li key={featureIndex} className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                          <div className="w-1 h-1 bg-gray-400 rounded-full mr-2" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                    
                    <div className="mt-auto flex items-center text-sm font-medium text-gray-500 dark:text-gray-500">
                      Under development
                    </div>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
      
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.6 }}
        className="text-center mt-12"
      >
        <div className="inline-flex items-center px-6 py-3 rounded-full bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm border border-gray-200 dark:border-gray-700">
          <Upload className="w-5 h-5 mr-2 text-gray-600 dark:text-gray-400" />
          <span className="text-sm text-gray-600 dark:text-gray-400">
            All expense types support image upload and automatic item detection
          </span>
        </div>
      </motion.div>
    </div>
  )
}