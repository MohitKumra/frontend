import apiClient from './apiClient';

export interface StoredFileResponse {
  fileName: string;
  mimeType: string;
  size: number;
  path: string;
  url: string;
}

export async function readAsDataUrl(file: File): Promise<string> {
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

async function compressImage(file: File): Promise<File> {
  if (!file.type.startsWith('image/')) return file;
  if (typeof document === 'undefined') return file;

  const dataUrl = await readAsDataUrl(file);
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = dataUrl;
  });

  const maxSide = 1920;
  const ratio = Math.min(1, maxSide / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * ratio));
  const height = Math.max(1, Math.round(image.height * ratio));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return file;

  ctx.drawImage(image, 0, 0, width, height);

  const targetType = file.type === 'image/png' ? 'image/png' : 'image/webp';
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, targetType, 0.82);
  });
  if (!blob) return file;

  return new File([blob], file.name.replace(/\.[^.]+$/, targetType === 'image/png' ? '.png' : '.webp'), {
    type: targetType,
    lastModified: Date.now(),
  });
}

export async function uploadMediaFile(
  file: File,
  folder: 'attachments' | 'voice-notes' = 'attachments'
): Promise<StoredFileResponse> {
  const prepared = await compressImage(file);
  const base64Data = await readAsDataUrl(prepared);

  const { data } = await apiClient.post<StoredFileResponse>('/media/upload', {
    fileName: prepared.name,
    mimeType: prepared.type || file.type,
    base64Data,
    folder,
  });

  return data;
}

export async function prepareUploadFile(file: File): Promise<{ file: File; base64DataUrl: string }> {
  const prepared = await compressImage(file);
  const base64DataUrl = await readAsDataUrl(prepared);
  return { file: prepared, base64DataUrl };
}
