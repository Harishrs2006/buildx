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
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {images.map((img) => (
          <div key={img.publicId} className="relative aspect-square overflow-hidden rounded-xl bg-sand-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img.url} alt="" className="h-full w-full object-cover" />
            {img.isPrimary && (
              <span className="absolute left-2 top-2 rounded-full bg-lime px-2.5 py-1 font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-ink">Cover</span>
            )}
            <div className="absolute inset-x-0 bottom-0 flex justify-end gap-1.5 bg-gradient-to-t from-ink/60 to-transparent p-2">
              {!img.isPrimary && (
                <button type="button" onClick={() => makePrimary(img.publicId)} className="grid h-9 w-9 place-items-center rounded-full bg-sand-2 text-ink" aria-label="Use as cover photo">
                  <span className="material-symbols-outlined text-[18px]">star</span>
                </button>
              )}
              <button type="button" onClick={() => remove(img.publicId)} className="grid h-9 w-9 place-items-center rounded-full bg-sand-2 text-error" aria-label="Remove photo">
                <span className="material-symbols-outlined text-[18px]">delete</span>
              </button>
            </div>
          </div>
        ))}
        <button
          type="button"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          className="flex aspect-square flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-sand-4 text-stone transition-colors hover:border-ink hover:text-ink disabled:opacity-50"
        >
          <span className={`material-symbols-outlined text-[28px] ${uploading ? 'animate-spin' : ''}`} aria-hidden="true">{uploading ? 'progress_activity' : 'add_photo_alternate'}</span>
          <span className="text-[14px] font-medium">{uploading ? 'Uploading' : 'Add photos'}</span>
          {!uploading && <span className="text-[12px]">JPG, PNG or WebP</span>}
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
      {error && <p role="alert" className="text-[14px] text-error">{error}</p>}
    </div>
  );
}
