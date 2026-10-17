"use client";

import React, { useState } from "react";
import { Camera, Gallery, InfoCircle } from "@/lib/icons";
import { fileToResizedDataUrl } from "@/lib/image";

interface AvatarCropperProps {
  photoPath: string;
  onPhotoSelected: (dataUrl: string) => void;
}

export function AvatarCropper({ photoPath, onPhotoSelected }: AvatarCropperProps) {
  const [zoom, setZoom] = useState(1);
  const [preview, setPreview] = useState(photoPath);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Hanya format gambar yang diperbolehkan (JPG, PNG, WebP).");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("Ukuran gambar maksimal 5 MB.");
      return;
    }

    fileToResizedDataUrl(file, 512)
      .then((url) => {
        setPreview(url);
        onPhotoSelected(url);
      })
      .catch((err) => alert(err.message));
  };

  return (
    <div className="space-y-4">
      {/* Visual Crop / Circular Preview */}
      <div className="flex flex-col items-center justify-center p-6 bg-lavender-50/40 rounded-2xl border border-dashed border-lavender-200">
        <div className="relative group">
          <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-md bg-neutral-100 flex items-center justify-center relative">
            {preview ? (
              <img
                src={preview}
                alt="Foto Profil Mitra"
                className="w-full h-full object-cover transition-transform duration-150"
                style={{ transform: `scale(${zoom})` }}
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-neutral-400 p-2 text-center">
                <Camera size={32} />
                <span className="text-[10px] mt-1 font-medium">Foto Wajah</span>
              </div>
            )}
          </div>

          {/* Camera Upload Button Overlay */}
          <label className="absolute bottom-0 right-0 w-10 h-10 rounded-full bg-lavender-600 text-white flex items-center justify-center shadow-md cursor-pointer hover:bg-lavender-700 transition-colors">
            <Camera size={18} />
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
        </div>

        {/* Zoom Slider if photo exists */}
        {preview && (
          <div className="w-full max-w-xs mt-5 space-y-1.5">
            <div className="flex justify-between text-[11px] text-neutral-500 font-medium">
              <span>Zoom</span>
              <span>{Math.round(zoom * 100)}%</span>
            </div>
            <input
              type="range"
              min="1"
              max="2.5"
              step="0.05"
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-lavender-600"
            />
          </div>
        )}
      </div>

      {/* Guidelines Box */}
      <div className="p-3.5 rounded-xl bg-neutral-50 border border-neutral-200 text-xs text-neutral-600 flex items-start gap-2.5">
        <InfoCircle size={18} className="text-neutral-500 shrink-0 mt-0.5" />
        <div className="space-y-0.5 leading-relaxed text-[11px]">
          <strong className="text-neutral-800">Panduan foto profesional:</strong>
          <ul className="list-disc list-inside space-y-0.5 text-neutral-500">
            <li>Pastikan wajah terlihat jelas menghadap ke depan.</li>
            <li>Gunakan pencahayaan terang tanpa kacamata hitam/topi.</li>
            <li>Foto ini akan tampil di profilmu dan dilihat pelanggan.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
