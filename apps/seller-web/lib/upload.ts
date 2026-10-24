import { z } from 'zod';
import { getFirebaseAuth } from './firebase';

const uploadResponseSchema = z.object({ url: z.string(), publicId: z.string() });

// Multipart upload — the shared ApiClient only speaks JSON, so this talks to /upload/image
// directly. Still goes through the same base URL + auth token as everything else.
export async function uploadProductImage(baseUrl: string, file: File, signal?: AbortSignal) {
  const token = await getFirebaseAuth().currentUser?.getIdToken();
  if (!token) throw new Error('Sign in again to upload images');

  const form = new FormData();
  form.append('image', file);

  const res = await fetch(`${baseUrl}/upload/image`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
    signal,
  });

  const json = await res.json().catch(() => null);
  if (!res.ok || json?.success !== true) {
    throw new Error(json?.error?.message ?? 'Image upload failed');
  }
  return uploadResponseSchema.parse(json.data);
}
