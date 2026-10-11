"use client";

import React, { useState, useRef } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { GalleryAdd, CloseCircle, TickCircle } from "@/lib/icons";
import { FilterDropdown } from "./FilterDropdown";

const PHOTO_SOURCE_OPTIONS = [
  {
    value: "Dari tukang via WA, diunggah admin",
    label: "Dari tukang via WhatsApp, diunggah admin",
  },
  {
    value: "Diunggah tukang",
    label: "Diunggah langsung oleh tukang",
  },
  {
    value: "Diunggah saat inspeksi fisik",
    label: "Diunggah saat inspeksi fisik admin",
  },
];

interface PhotoUploaderProps {
  onUploadSuccess: (photo: {
    storage_path: string;
    source_note: string;
    type: "problem" | "result";
  }) => void;
  defaultType?: "problem" | "result";
  className?: string;
}

export function PhotoUploader({
  onUploadSuccess,
  defaultType = "result",
  className,
}: PhotoUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [sourceNote, setSourceNote] = useState("Dari tukang via WA, diunggah admin");
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    // Validasi format
    const validTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type)) {
      toast.error("Format foto harus JPG, PNG, atau WebP.");
      return;
    }

    // Validasi ukuran 5MB
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Ukuran foto maksimal 5 MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleSave = () => {
    if (!preview) {
      toast.error("Pilih atau tarik foto terlebih dahulu.");
      return;
    }

    setIsProcessing(true);
    setTimeout(() => {
      onUploadSuccess({
        storage_path: preview,
        source_note: sourceNote,
        type: defaultType,
      });
      setIsProcessing(false);
      setPreview(null);
      toast.success("Foto hasil pekerjaan berhasil diunggah!");
    }, 600);
  };

  return (
    <div className={cn("p-4 bg-white rounded-2xl border border-neutral-200/90 shadow-xs", className)}>
      <h4 className="text-sm font-semibold text-neutral-800 mb-2">
        Unggah Foto Hasil Pekerjaan
      </h4>

      {/* Drag & Drop Zone */}
      {!preview ? (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            "border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200",
            isDragging
              ? "border-lavender-500 bg-lavender-50/60 ring-4 ring-lavender-100"
              : "border-neutral-200 hover:border-lavender-300 hover:bg-neutral-50/60"
          )}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleFile(e.target.files[0]);
              }
            }}
          />

          <div className="w-10 h-10 rounded-full bg-lavender-50 flex items-center justify-center text-lavender-600 mb-2">
            <GalleryAdd size={20} />
          </div>
          <span className="text-xs font-semibold text-neutral-700">
            Tarik & lepas foto ke sini, atau <span className="text-lavender-600">pilih berkas</span>
          </span>
          <span className="text-[11px] text-neutral-400 mt-1">
            Format JPEG, PNG, WebP hingga 5MB
          </span>
        </div>
      ) : (
        <div className="relative rounded-xl overflow-hidden border border-neutral-200 bg-neutral-900/5 p-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt="Pratinjau hasil"
            className="w-full h-44 object-cover rounded-lg"
          />
          <button
            type="button"
            onClick={() => setPreview(null)}
            className="absolute top-4 right-4 p-1 bg-white/90 hover:bg-white text-danger-600 rounded-full shadow-sm"
            title="Hapus foto"
          >
            <CloseCircle size={18} />
          </button>
        </div>
      )}

      {/* Sumber Foto */}
      <div className="mt-3">
        <label className="text-[11px] font-medium text-neutral-500 block mb-1">
          Sumber Foto
        </label>
        <FilterDropdown
          value={sourceNote}
          options={PHOTO_SOURCE_OPTIONS}
          onChange={(val) => setSourceNote(val)}
          fullWidth
          size="md"
        />
      </div>

      {/* Action Button */}
      <div className="mt-4 flex items-center justify-end gap-2">
        {preview && (
          <button
            type="button"
            onClick={() => setPreview(null)}
            className="px-3 py-1.5 text-xs text-neutral-500 hover:text-neutral-700"
          >
            Batal
          </button>
        )}
        <button
          type="button"
          disabled={!preview || isProcessing}
          onClick={handleSave}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-lavender-600 hover:bg-lavender-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
        >
          {isProcessing ? (
            <span>Menyimpan...</span>
          ) : (
            <>
              <TickCircle size={14} />
              <span>Simpan Foto Hasil</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
