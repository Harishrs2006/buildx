'use client';

import { useRef, useState } from 'react';
import { useApiClient } from '@buildx/web-core';
import { uploadProductImage } from '../lib/upload';

export type ProductImage = { url: string; publicId: string; isPrimary?: boolean; sortOrder?: number };

export function ImageUploader({ images, onChange }: { images: ProductImage[]; onChange: (images: ProductImage[]) => void }) {
  const client = useApiClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    setError(null);
    try {
      const uploaded: ProductImage[] = [];
      for (const file of Array.from(files)) {
        const result = await uploadProductImage(client.baseUrl, file);
        uploaded.push({ url: result.url, publicId: result.publicId });
      }
      const next = [...images, ...uploaded].map((img, i) => ({ ...img, isPrimary: i === 0, sortOrder: i }));
      onChange(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  function remove(publicId: string) {
    const next = images.filter((img) => img.publicId !== publicId).map((img, i) => ({ ...img, isPrimary: i === 0, sortOrder: i }));
    onChange(next);
  }

  function makePrimary(publicId: string) {
    const next = images.map((img) => ({ ...img, isPrimary: img.publicId === publicId }));
    next.sort((a, b) => (b.isPrimary ? 1 : 0) - (a.isPrimary ? 1 : 0));
    onChange(next.map((img, i) => ({ ...img, sortOrder: i })));
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
        {images.map((img) => (
          <div key={img.publicId} className="group relative aspect-square overflow-hidden rounded-lg bg-surface-container-low">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img.url} alt="" className="h-full w-full object-cover" />
            {img.isPrimary && (
              <span className="absolute left-1 top-1 rounded bg-primary px-1.5 py-0.5 font-body text-[10px] font-bold uppercase text-on-primary">
                Primary
              </span>
            )}
            <div className="absolute inset-0 flex items-end justify-end gap-1 bg-black/0 p-1 opacity-0 transition-opacity group-hover:bg-black/30 group-hover:opacity-100">
              {!img.isPrimary && (
                <button type="button" onClick={() => makePrimary(img.publicId)} className="rounded bg-surface-container-lowest p-1" title="Make primary">
                  <span className="material-symbols-outlined text-sm">star</span>
                </button>
              )}
              <button type="button" onClick={() => remove(img.publicId)} className="rounded bg-surface-container-lowest p-1" title="Remove">
                <span className="material-symbols-outlined text-sm">delete</span>
              </button>
            </div>
          </div>
        ))}
        <button
          type="button"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          className="flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-outline-variant text-on-surface-variant disabled:opacity-50"
        >
          <span className="material-symbols-outlined text-2xl">{uploading ? 'progress_activity' : 'add_photo_alternate'}</span>
          <span className="font-body text-xs">{uploading ? 'Uploading…' : 'Add photo'}</span>
        </button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        hidden
        onChange={(e) => handleFiles(e.target.files)}
      />
      {error && <p className="font-body text-sm text-error">{error}</p>}
    </div>
  );
}
