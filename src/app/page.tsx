import { ExpenseTypeSelector } from "@/components/ExpenseTypeSelector"

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white mb-4">
            Group Expense Calculator
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Split bills effortlessly with friends and family. Upload receipts, assign expenses, and calculate fair shares instantly.
          </p>
        </div>
        
        <ExpenseTypeSelector />
      </div>
    </main>
  )
}
