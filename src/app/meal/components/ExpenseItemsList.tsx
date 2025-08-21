"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Plus, Edit3, Trash2, DollarSign, Package, Receipt } from "lucide-react"
import type { ExpenseItem, MealTotals } from "@/lib/types"

interface ExpenseItemsListProps {
  items: ExpenseItem[]
  onItemsChange: (items: ExpenseItem[]) => void
  totals?: MealTotals
  onTotalsChange?: (totals: MealTotals) => void
}

export function ExpenseItemsList({ items, onItemsChange, totals, onTotalsChange }: ExpenseItemsListProps) {
  const [editingItem, setEditingItem] = useState<string | null>(null)
  const [newItem, setNewItem] = useState({ name: "", price: "" })
  const [isAddingNew, setIsAddingNew] = useState(false)

  const updateItem = (id: string, updates: Partial<ExpenseItem>) => {
    onItemsChange(items.map(item => 
      item.id === id ? { ...item, ...updates } : item
    ))
    setEditingItem(null)
  }

  const deleteItem = (id: string) => {
    onItemsChange(items.filter(item => item.id !== id))
  }

  const addNewItem = () => {
    if (newItem.name.trim() && newItem.price) {
      const item: ExpenseItem = {
        id: Date.now().toString(),
        name: newItem.name.trim(),
        price: parseFloat(newItem.price),
        assignedTo: []
      }
      onItemsChange([...items, item])
      setNewItem({ name: "", price: "" })
      setIsAddingNew(false)
    }
  }

  const subtotal = items.reduce((sum, item) => sum + item.price, 0)
  
  // Initialize totals if not provided
  const currentTotals = totals || {
    subtotal,
    tax: subtotal * 0.0875, // Default 8.75% tax
    tip: subtotal * 0.18,   // Default 18% tip
    total: 0
  }
  
  // Recalculate total
  const calculatedTotal = currentTotals.subtotal + currentTotals.tax + currentTotals.tip
  
  const updateTotals = (updates: Partial<MealTotals>) => {
    const newTotals = { 
      ...currentTotals, 
      subtotal, // Always use calculated subtotal
      ...updates 
    }
    newTotals.total = newTotals.subtotal + newTotals.tax + newTotals.tip
    onTotalsChange?.(newTotals)
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <Package className="w-12 h-12 mx-auto text-blue-600 dark:text-blue-400 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Review Detected Items
        </h3>
        <p className="text-gray-600 dark:text-gray-300">
          Verify and edit the items and prices detected from your receipt
        </p>
      </div>

      <div className="space-y-3">
        {items.map((item, index) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4"
          >
            {editingItem === item.id ? (
              <div className="space-y-3">
                <input
                  type="text"
                  value={item.name}
                  onChange={(e) => updateItem(item.id, { name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  placeholder="Item name"
                />
                <div className="flex items-center space-x-2">
                  <DollarSign className="w-4 h-4 text-gray-400" />
                  <input
                    type="number"
                    step="0.01"
                    value={item.price}
                    onChange={(e) => updateItem(item.id, { price: parseFloat(e.target.value) || 0 })}
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    placeholder="0.00"
                  />
                  <Button size="sm" onClick={() => setEditingItem(null)}>
                    Save
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setEditingItem(null)}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900 dark:text-white">
                    {item.name}
                  </h4>
                  <div className="flex items-center mt-1">
                    <DollarSign className="w-4 h-4 text-gray-400 mr-1" />
                    <span className="text-lg font-semibold text-green-600 dark:text-green-400">
                      {item.price.toFixed(2)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingItem(item.id)}
                  >
                    <Edit3 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteItem(item.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </motion.div>
        ))}

        {/* Add New Item */}
        {isAddingNew ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4"
          >
            <div className="space-y-3">
              <input
                type="text"
                value={newItem.name}
                onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                placeholder="Item name"
                autoFocus
              />
              <div className="flex items-center space-x-2">
                <DollarSign className="w-4 h-4 text-gray-400" />
                <input
                  type="number"
                  step="0.01"
                  value={newItem.price}
                  onChange={(e) => setNewItem({ ...newItem, price: e.target.value })}
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  placeholder="0.00"
                />
                <Button
                  size="sm"
                  onClick={addNewItem}
                  disabled={!newItem.name.trim() || !newItem.price}
                >
                  Add
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsAddingNew(false)
                    setNewItem({ name: "", price: "" })
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </motion.div>
        ) : (
          <Button
            variant="outline"
            onClick={() => setIsAddingNew(true)}
            className="w-full border-dashed border-2 h-16 hover:border-blue-500 dark:hover:border-blue-400"
          >
            <Plus className="w-5 h-5 mr-2" />
            Add Custom Item
          </Button>
        )}
      </div>

      {/* Bill Summary with Tax & Tip */}
      <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 rounded-xl p-6 border border-gray-200 dark:border-gray-600">
        <div className="flex items-center mb-4">
          <Receipt className="w-6 h-6 text-blue-600 dark:text-blue-400 mr-2" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Bill Summary
          </h3>
        </div>
        
        <div className="space-y-4">
          {/* Subtotal */}
          <div className="flex items-center justify-between">
            <span className="text-gray-700 dark:text-gray-300">
              Subtotal ({items.length} item{items.length !== 1 ? 's' : ''})
            </span>
            <div className="flex items-center">
              <DollarSign className="w-4 h-4 text-gray-400 mr-1" />
              <span className="font-semibold text-gray-900 dark:text-white">
                {subtotal.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Tax */}
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <span className="text-gray-700 dark:text-gray-300 mr-3">Tax</span>
              <div className="flex items-center space-x-2">
                <DollarSign className="w-4 h-4 text-gray-400" />
                <input
                  type="number"
                  step="0.01"
                  value={currentTotals.tax.toFixed(2)}
                  onChange={(e) => updateTotals({ tax: parseFloat(e.target.value) || 0 })}
                  className="w-20 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
                <span className="text-gray-500 text-sm">
                  ({((currentTotals.tax / subtotal) * 100).toFixed(1)}%)
                </span>
              </div>
            </div>
          </div>

          {/* Tip */}
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <span className="text-gray-700 dark:text-gray-300 mr-3">Tip</span>
              <div className="flex items-center space-x-2">
                <DollarSign className="w-4 h-4 text-gray-400" />
                <input
                  type="number"
                  step="0.01"
                  value={currentTotals.tip.toFixed(2)}
                  onChange={(e) => updateTotals({ tip: parseFloat(e.target.value) || 0 })}
                  className="w-20 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
                <span className="text-gray-500 text-sm">
                  ({((currentTotals.tip / subtotal) * 100).toFixed(1)}%)
                </span>
              </div>
            </div>
          </div>

          {/* Quick tip buttons */}
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">Quick tip:</span>
            {[15, 18, 20, 22].map((percent) => (
              <Button
                key={percent}
                variant="outline"
                size="sm"
                onClick={() => updateTotals({ tip: subtotal * (percent / 100) })}
                className="text-xs px-2 py-1 h-7"
              >
                {percent}%
              </Button>
            ))}
          </div>

          {/* Total */}
          <div className="border-t border-gray-300 dark:border-gray-600 pt-4">
            <div className="flex items-center justify-between">
              <span className="text-xl font-semibold text-gray-900 dark:text-white">
                Total
              </span>
              <div className="flex items-center">
                <DollarSign className="w-6 h-6 text-green-600 dark:text-green-400 mr-1" />
                <span className="text-3xl font-bold text-green-600 dark:text-green-400">
                  {calculatedTotal.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}