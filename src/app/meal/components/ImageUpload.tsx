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
      <div className="inline-flex items-center px-6 py-3 rounded-full border-[1.5px] border-dashed border-amber-600 bg-amber-50 text-amber-800">
        <AlertTriangle className="w-5 h-5 mr-2 text-amber-600" />
        <span className="font-medium">
          {message}
        </span>
      </div>
      <div className="flex justify-center gap-3">
        <Button
          variant="outline"
          onClick={onRetry}
          className="border-stone-300 text-stone-700 hover:bg-stone-100"
        >
          Try another photo
        </Button>
        <Button
          onClick={onStartFromScratch}
          className="bg-green-600 hover:bg-green-500 text-white"
        >
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
  const scanCounterRef = useRef(0);

  const scanFile = useCallback(
    async (file: File) => {
      scanCounterRef.current += 1;
      const token = scanCounterRef.current;
      setScanState({ status: "scanning" });
      try {
        const { dataUrl, base64 } = await downscaleImage(file);
        onImageUpload(dataUrl);
        const scan = await requestScan(base64);
        if (scanCounterRef.current !== token) return;
        onScanComplete(scan);
        setScanState({ status: "done", itemCount: scan.items.length });
      } catch (error) {
        if (scanCounterRef.current !== token) return;
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
    scanCounterRef.current += 1;
    onImageUpload(null);
    setScanState({ status: "idle" });
  };

  const handleStartFromScratch = () => {
    scanCounterRef.current += 1;
    onStartFromScratch();
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
              <div className="inline-flex items-center px-6 py-3 rounded-full bg-stone-100 border border-stone-300 text-stone-700">
                <Zap className="w-5 h-5 mr-2 animate-pulse" />
                <span className="font-medium">
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
              <div className="inline-flex items-center px-6 py-3 rounded-full bg-green-50 border border-green-600 text-green-800">
                <CheckCircle className="w-5 h-5 mr-2" />
                <span className="font-medium">
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
              onStartFromScratch={handleStartFromScratch}
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
            onStartFromScratch={handleStartFromScratch}
          />
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Scan card */}
        <div className="space-y-4">
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all h-full ${
            isDragActive
              ? "border-green-600 bg-green-50"
              : "border-stone-300 hover:border-stone-500"
          }`}
        >
          <input {...getInputProps()} />
          <motion.div animate={{ y: isDragActive ? -10 : 0 }} transition={{ duration: 0.2 }}>
            <Upload
              className={`w-12 h-12 mx-auto mb-4 ${
                isDragActive ? "text-green-600" : "text-stone-400"
              }`}
            />
            <h3 className="text-lg font-semibold text-stone-800 mb-2">
              {isDragActive ? "Drop your receipt here" : "Scan a receipt"}
            </h3>
            <p className="text-sm text-stone-500 mb-4">
              Drag and drop a photo, or click to browse. Items, tax, and gratuity
              are detected automatically — everything stays editable.
            </p>
            <Button
              variant="outline"
              onClick={(event) => {
                event.stopPropagation();
                cameraInputRef.current?.click();
              }}
              className="border-stone-300 text-stone-700 hover:bg-stone-100"
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
        onClick={handleStartFromScratch}
        className="border-2 border-dashed border-stone-300 rounded-lg p-8 text-center cursor-pointer transition-all hover:border-green-600"
      >
        <PencilLine className="w-12 h-12 mx-auto mb-4 text-stone-400" />
        <h3 className="text-lg font-semibold text-stone-800 mb-2">
          Start from scratch
        </h3>
        <p className="text-sm text-stone-500">
          No receipt? Add people and type in items and charges yourself.
        </p>
      </button>
      </div>
    </div>
  );
}
