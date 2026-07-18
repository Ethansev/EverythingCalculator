"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ImageUpload } from "./components/ImageUpload";
import { ExpenseItemsList } from "./components/ExpenseItemsList";
import { DragDropSplitter } from "./components/DragDropSplitter";
import { ParticipantManager } from "@/components/ParticipantManager";
import { ExpenseSummary } from "@/components/ExpenseSummary";
import { ReceiptSurface } from "./components/ReceiptSurface";
import { Camera, Users, ListCheck, Calculator, Receipt } from "lucide-react";
import Link from "next/link";
import type { Person, ReceiptItem, Charge } from "@/types/meal";
import {
  scannedItemsToReceiptItems,
  scannedChargesToCharges,
} from "@/utils/meal/receiptScan";
import type { ScannedReceipt } from "@/utils/meal/receiptScan";
import type { LucideIcon } from "lucide-react";

type MealFlowStep = "upload" | "participants" | "items" | "split" | "summary";

export default function MealExpensePage() {
  const [currentStep, setCurrentStep] = useState<MealFlowStep>("upload");
  const [maxStepReached, setMaxStepReached] = useState(0);
  const [participants, setParticipants] = useState<Person[]>([]);
  const [items, setItems] = useState<ReceiptItem[]>([]);
  const [charges, setCharges] = useState<Charge[]>([]);
  const [scannedTotal, setScannedTotal] = useState<number | null>(null);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [startedFromScratch, setStartedFromScratch] = useState(false);
  const steps: {
    id: MealFlowStep;
    title: string;
    icon: LucideIcon;
    description: string;
  }[] = [
    {
      id: "upload",
      title: "Get Started",
      icon: Camera,
      description: "Scan a receipt or start from scratch",
    },
    {
      id: "participants",
      title: "Add People",
      icon: Users,
      description: "Add everyone who participated",
    },
    {
      id: "items",
      title: "Review Items",
      icon: ListCheck,
      description: "Verify detected items and prices",
    },
    {
      id: "split",
      title: "Split Items",
      icon: Calculator,
      description: "Drag people to items they consumed",
    },
    {
      id: "summary",
      title: "Summary",
      icon: Receipt,
      description: "Review final calculations",
    },
  ];

  const currentStepIndex = steps.findIndex((step) => step.id === currentStep);

  const goToStep = (index: number) => {
    if (index < 0 || index >= steps.length) return;
    setCurrentStep(steps[index].id);
    setMaxStepReached((prev) => Math.max(prev, index));
  };

  const handleNext = () => goToStep(currentStepIndex + 1);
  const handlePrevious = () => goToStep(currentStepIndex - 1);

  const handleScanComplete = (scan: ScannedReceipt) => {
    setItems(scannedItemsToReceiptItems(scan.items, () => crypto.randomUUID()));
    setCharges(scannedChargesToCharges(scan, () => crypto.randomUUID()));
    setScannedTotal(scan.total);
  };

  const handleParticipantsChange = (next: Person[]) => {
    const validIds = new Set(next.map((p) => p.id));
    setItems((prev) =>
      prev.map((item) => {
        const kept = item.assignedTo.filter((id) => validIds.has(id));
        return kept.length === item.assignedTo.length
          ? item
          : { ...item, assignedTo: kept, exactSplits: undefined };
      })
    );
    setCharges((prev) =>
      prev.map((charge) => {
        if (!charge.appliesTo) return charge;
        const kept = charge.appliesTo.filter((id) => validIds.has(id));
        const normalized =
          kept.length === 0 || kept.length === next.length ? undefined : kept;
        if (charge.appliesTo.length === kept.length && normalized !== undefined) return charge;
        return { ...charge, appliesTo: normalized };
      })
    );
    setParticipants(next);
  };

  const handleStartFromScratch = () => {
    setStartedFromScratch(true);
    setUploadedImage(null);
    goToStep(1);
  };

  const canProceed = () => {
    switch (currentStep) {
      case "upload":
        return uploadedImage !== null || startedFromScratch;
      case "participants":
        return participants.length >= 2;
      case "items":
        return items.length > 0;
      case "split":
        return items.every((item) => item.assignedTo.length > 0);
      default:
        return true;
    }
  };

  const stepContent = (
    <>
      {currentStep === "upload" && (
        <ImageUpload
          uploadedImage={uploadedImage}
          onImageUpload={setUploadedImage}
          onScanComplete={handleScanComplete}
          onStartFromScratch={handleStartFromScratch}
        />
      )}

      {currentStep === "participants" && (
        <ParticipantManager
          participants={participants}
          onParticipantsChange={handleParticipantsChange}
        />
      )}

      {currentStep === "items" && (
        <ExpenseItemsList
          items={items}
          onItemsChange={setItems}
          charges={charges}
          onChargesChange={setCharges}
          scannedTotal={scannedTotal}
          participants={participants}
        />
      )}

      {currentStep === "split" && (
        <DragDropSplitter
          items={items}
          participants={participants}
          charges={charges}
          onItemsChange={setItems}
        />
      )}

      {currentStep === "summary" && (
        <ExpenseSummary
          items={items}
          participants={participants}
          charges={charges}
        />
      )}
    </>
  );

  return (
    <main className="min-h-screen bg-[radial-gradient(1100px_500px_at_50%_-10%,#2a2320,#171412)] bg-[#171412]">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Link href="/">
            <Button variant="ghost" size="sm" className="text-stone-400 hover:text-white hover:bg-white/10">
              ← Back to Home
            </Button>
          </Link>
        </div>

        <div className="text-center mb-8">
          <h1 className="font-receipt uppercase tracking-[0.2em] text-2xl sm:text-3xl font-bold text-stone-100 mb-2">
            Split the Check
          </h1>
          <p className="text-stone-400">
            Scan a receipt or build one from scratch — split it to the penny
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          {/* Progress Steps */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              {steps.map((step, index) => {
                const StepIcon = step.icon;
                const isActive = step.id === currentStep;
                const isCompleted = index < currentStepIndex;

                return (
                  <div key={step.id} className="flex items-center">
                    <div className="flex flex-col items-center">
                      <motion.button
                        type="button"
                        onClick={() => {
                          if (index <= currentStepIndex) {
                            goToStep(index);
                          } else if (index <= maxStepReached && canProceed()) {
                            goToStep(index);
                          }
                        }}
                        disabled={index > maxStepReached}
                        className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
                          isActive || isCompleted
                            ? "bg-green-600 text-white"
                            : "bg-stone-800 text-stone-500"
                        } ${index <= maxStepReached ? "cursor-pointer" : "cursor-default"}`}
                        whileHover={{ scale: index <= maxStepReached ? 1.05 : 1 }}
                        whileTap={{ scale: index <= maxStepReached ? 0.95 : 1 }}
                      >
                        <StepIcon className="w-6 h-6" />
                      </motion.button>
                      <span
                        className={`text-xs mt-2 font-medium ${
                          isActive ? "text-green-400" : "text-stone-500"
                        }`}
                      >
                        {step.title}
                      </span>
                    </div>

                    {index < steps.length - 1 && (
                      <div
                        className={`flex-1 h-1 mx-4 rounded ${
                          isCompleted
                            ? "bg-green-600"
                            : "bg-stone-800"
                        }`}
                      />
                    )}
                  </div>
                );
              })}
            </div>

            <div className="text-center">
              <h2 className="text-2xl font-bold text-stone-100 mb-2">
                {steps[currentStepIndex].title}
              </h2>
              <p className="text-stone-400">
                {steps[currentStepIndex].description}
              </p>
            </div>
          </div>

          {/* Step Content */}
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.3 }}
            className="mb-8"
          >
            {currentStep === "split" ? (
              stepContent
            ) : (
              <ReceiptSurface>{stepContent}</ReceiptSurface>
            )}
          </motion.div>

          {/* Navigation */}
          <div className="flex justify-between items-center">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStepIndex === 0}
              className="border-stone-700 bg-transparent text-stone-300 hover:bg-white/10 hover:text-white"
            >
              Previous
            </Button>

            <div className="text-sm text-stone-500">
              Step {currentStepIndex + 1} of {steps.length}
            </div>

            {currentStepIndex < steps.length - 1 ? (
              <Button onClick={handleNext} disabled={!canProceed()} className={`bg-green-600 hover:bg-green-500 text-white ${currentStep === "split" && canProceed() ? "animate-pulse" : ""}`}>
                Next
              </Button>
            ) : (
              <div />
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
