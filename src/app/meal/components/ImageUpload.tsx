"use client"

import { useCallback, useState } from "react"
import { useDropzone } from "react-dropzone"
import { motion, AnimatePresence } from "framer-motion"
import { Camera, Upload, X, Zap, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import type { ExpenseItem } from "@/lib/types"

interface ImageUploadProps {
  onImageUpload: (image: string) => void
  onItemsDetected: (items: ExpenseItem[]) => void
  uploadedImage: string | null
}

export function ImageUpload({ onImageUpload, onItemsDetected, uploadedImage }: ImageUploadProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisComplete, setAnalysisComplete] = useState(false)

  // Mock AI analysis - in real app, this would call an API
  const analyzeImage = useCallback(async () => {
    setIsAnalyzing(true)
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // Mock detected items from receipt
    const mockItems: ExpenseItem[] = [
      { id: '1', name: 'Caesar Salad', price: 12.50, assignedTo: [] },
      { id: '2', name: 'Grilled Chicken', price: 18.95, assignedTo: [] },
      { id: '3', name: 'Fish & Chips', price: 16.75, assignedTo: [] },
      { id: '4', name: 'Craft Beer', price: 6.50, assignedTo: [] },
      { id: '5', name: 'Wine Glass', price: 8.00, assignedTo: [] },
      { id: '6', name: 'Chocolate Cake', price: 7.25, assignedTo: [] }
    ]
    
    setIsAnalyzing(false)
    setAnalysisComplete(true)
    onItemsDetected(mockItems)
  }, [onItemsDetected])

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (file) {
      const imageUrl = URL.createObjectURL(file)
      onImageUpload(imageUrl)
      await analyzeImage()
    }
  }, [onImageUpload, analyzeImage])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif']
    },
    maxFiles: 1
  })

  const handleCameraCapture = () => {
    // In a real app, this would open camera
    // For demo, we'll simulate with a sample image
    const sampleImage = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'%3E%3Crect width='400' height='300' fill='%23f0f0f0'/%3E%3Ctext x='200' y='150' text-anchor='middle' font-family='Arial' font-size='16' fill='%23666'%3ESample Receipt%3C/text%3E%3C/svg%3E"
    onImageUpload(sampleImage)
    analyzeImage()
  }

  const clearImage = () => {
    onImageUpload("")
    setAnalysisComplete(false)
    setIsAnalyzing(false)
    onItemsDetected([])
  }

  if (uploadedImage) {
    return (
      <div className="space-y-6">
        <div className="relative">
          <Image
            src={uploadedImage}
            alt="Uploaded receipt"
            className="w-full max-w-md mx-auto rounded-lg shadow-lg"
            width={400}
            height={300}
            style={{ objectFit: 'contain' }}
          />
          <Button
            variant="destructive"
            size="sm"
            className="absolute top-2 right-2"
            onClick={clearImage}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        <AnimatePresence>
          {isAnalyzing && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center"
            >
              <div className="inline-flex items-center px-6 py-3 rounded-full bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                <Zap className="w-5 h-5 mr-2 text-blue-600 dark:text-blue-400 animate-pulse" />
                <span className="text-blue-800 dark:text-blue-200 font-medium">
                  AI is analyzing your receipt...
                </span>
              </div>
              <div className="mt-4 w-64 mx-auto bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <motion.div
                  className="bg-blue-600 h-2 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 2 }}
                />
              </div>
            </motion.div>
          )}

          {analysisComplete && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center"
            >
              <div className="inline-flex items-center px-6 py-3 rounded-full bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                <CheckCircle className="w-5 h-5 mr-2 text-green-600 dark:text-green-400" />
                <span className="text-green-800 dark:text-green-200 font-medium">
                  Receipt analyzed! Found 6 items, tax and tip can be added in next step
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all ${
          isDragActive
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
            : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
        }`}
      >
        <input {...getInputProps()} />
        
        <motion.div
          animate={{ y: isDragActive ? -10 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <Upload className={`w-16 h-16 mx-auto mb-4 ${
            isDragActive ? 'text-blue-500' : 'text-gray-400'
          }`} />
          
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            {isDragActive ? 'Drop your receipt here' : 'Upload Receipt'}
          </h3>
          
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            Drag and drop your receipt image, or click to browse
          </p>
          
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Supports JPG, PNG, GIF up to 10MB
          </p>
        </motion.div>
      </div>

      <div className="text-center">
        <div className="inline-flex items-center space-x-4">
          <div className="h-px bg-gray-300 dark:bg-gray-600 flex-1" />
          <span className="text-gray-500 dark:text-gray-400 text-sm">or</span>
          <div className="h-px bg-gray-300 dark:bg-gray-600 flex-1" />
        </div>
      </div>

      <div className="text-center">
        <Button
          onClick={handleCameraCapture}
          className="inline-flex items-center"
        >
          <Camera className="w-5 h-5 mr-2" />
          Take Photo
        </Button>
      </div>

      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
        <div className="flex items-start">
          <Zap className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mr-2 mt-0.5" />
          <div>
            <h4 className="font-medium text-yellow-800 dark:text-yellow-200">AI-Powered Recognition</h4>
            <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
              Our AI will automatically detect items, prices, and taxes from your receipt for quick splitting.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}