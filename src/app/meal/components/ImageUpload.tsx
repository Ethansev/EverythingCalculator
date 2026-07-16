"use client";

import { useCallback, useRef, useState } from "react";
import { useDropzone } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, Upload, X, Zap, CheckCircle, AlertTriangle, PencilLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { isRecord, parseScannedReceipt } from "@/utils/meal/receiptScan";
import type { ScannedReceipt } from "@/utils/meal/receiptScan";

interface ImageUploadProps {
  uploadedImage: string | null;
  onImageUpload: (image: string | null) => void;
  onScanComplete: (scan: ScannedReceipt) => void;
  onStartFromScratch: () => void;
}

type ScanState =
  | { status: "idle" }
  | { status: "scanning" }
  | { status: "done"; itemCount: number }
  | { status: "error"; message: string };

const MAX_DIMENSION = 1600;

function ScanErrorNotice({
  message,
  onRetry,
  onStartFromScratch,
}: {
  message: string;
  onRetry: () => void;
  onStartFromScratch: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-center space-y-4"
    >
      <div className="inline-flex items-center px-6 py-3 rounded-full bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
        <AlertTriangle className="w-5 h-5 mr-2 text-red-600 dark:text-red-400" />
        <span className="text-red-800 dark:text-red-200 font-medium">
          {message}
        </span>
      </div>
      <div className="flex justify-center gap-3">
        <Button variant="outline" onClick={onRetry}>
          Try another photo
        </Button>
        <Button onClick={onStartFromScratch}>
          <PencilLine className="w-4 h-4 mr-2" />
          Enter items manually
        </Button>
      </div>
    </motion.div>
  );
}

async function downscaleImage(file: File): Promise<{ dataUrl: string; base64: string }> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas 2D context unavailable");
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
  return { dataUrl, base64: dataUrl.slice(dataUrl.indexOf(",") + 1) };
}

async function requestScan(base64: string): Promise<ScannedReceipt> {
  const response = await fetch("/api/scan-receipt", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ image: base64, mediaType: "image/jpeg" }),
  });
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      isRecord(payload) && typeof payload.error === "string"
        ? payload.error
        : "Couldn't read this receipt.";
    throw new Error(message);
  }
  const scan = parseScannedReceipt(payload);
  if (!scan) throw new Error("Couldn't read this receipt.");
  return scan;
}

export function ImageUpload({
  uploadedImage,
  onImageUpload,
  onScanComplete,
  onStartFromScratch,
}: ImageUploadProps) {
  const [scanState, setScanState] = useState<ScanState>({ status: "idle" });
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const scanFile = useCallback(
    async (file: File) => {
      setScanState({ status: "scanning" });
      try {
        const { dataUrl, base64 } = await downscaleImage(file);
        onImageUpload(dataUrl);
        const scan = await requestScan(base64);
        onScanComplete(scan);
        setScanState({ status: "done", itemCount: scan.items.length });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Couldn't read this receipt.";
        setScanState({ status: "error", message });
      }
    },
    [onImageUpload, onScanComplete]
  );

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (file) void scanFile(file);
    },
    [scanFile]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [".jpeg", ".jpg", ".png", ".webp", ".gif"] },
    maxFiles: 1,
  });

  const clearImage = () => {
    onImageUpload(null);
    setScanState({ status: "idle" });
  };

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
            style={{ objectFit: "contain" }}
            unoptimized
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
          {scanState.status === "scanning" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center"
            >
              <div className="inline-flex items-center px-6 py-3 rounded-full bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                <Zap className="w-5 h-5 mr-2 text-blue-600 dark:text-blue-400 animate-pulse" />
                <span className="text-blue-800 dark:text-blue-200 font-medium">
                  Reading your receipt...
                </span>
              </div>
            </motion.div>
          )}

          {scanState.status === "done" && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center"
            >
              <div className="inline-flex items-center px-6 py-3 rounded-full bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                <CheckCircle className="w-5 h-5 mr-2 text-green-600 dark:text-green-400" />
                <span className="text-green-800 dark:text-green-200 font-medium">
                  Found {scanState.itemCount} item
                  {scanState.itemCount === 1 ? "" : "s"} — you can review and edit
                  everything in the next steps
                </span>
              </div>
            </motion.div>
          )}

          {scanState.status === "error" && (
            <ScanErrorNotice
              message={scanState.message}
              onRetry={clearImage}
              onStartFromScratch={onStartFromScratch}
            />
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AnimatePresence>
        {scanState.status === "error" && (
          <ScanErrorNotice
            message={scanState.message}
            onRetry={() => setScanState({ status: "idle" })}
            onStartFromScratch={onStartFromScratch}
          />
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Scan card */}
        <div className="space-y-4">
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all h-full ${
            isDragActive
              ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
              : "border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500"
          }`}
        >
          <input {...getInputProps()} />
          <motion.div animate={{ y: isDragActive ? -10 : 0 }} transition={{ duration: 0.2 }}>
            <Upload
              className={`w-12 h-12 mx-auto mb-4 ${
                isDragActive ? "text-blue-500" : "text-gray-400"
              }`}
            />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {isDragActive ? "Drop your receipt here" : "Scan a receipt"}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
              Drag and drop a photo, or click to browse. Items, tax, and gratuity
              are detected automatically — everything stays editable.
            </p>
            <Button
              variant="outline"
              onClick={(event) => {
                event.stopPropagation();
                cameraInputRef.current?.click();
              }}
            >
              <Camera className="w-4 h-4 mr-2" />
              Take Photo
            </Button>
          </motion.div>
        </div>
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          hidden
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void scanFile(file);
            event.target.value = "";
          }}
        />
      </div>

      {/* Start-from-scratch card */}
      <button
        type="button"
        onClick={onStartFromScratch}
        className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-2xl p-8 text-center cursor-pointer transition-all hover:border-green-400 dark:hover:border-green-500"
      >
        <PencilLine className="w-12 h-12 mx-auto mb-4 text-gray-400" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Start from scratch
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          No receipt? Add people and type in items and charges yourself.
        </p>
      </button>
      </div>
    </div>
  );
}
