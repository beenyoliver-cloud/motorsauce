'use client';

import { supabaseBrowser } from './supabase';

const BUCKET_NAME = 'parts-images';
const COMPLIANCE_BUCKET = 'seller-compliance';

// File size constants (in bytes)
export const MAX_FILE_SIZE = 12 * 1024 * 1024; // 12MB per image
export const MAX_TOTAL_SIZE = 60 * 1024 * 1024; // 60MB total (5 images at 12MB each)

export function validateFileSize(file: File): { valid: boolean; error?: string } {
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `Image too large. Max ${Math.round(MAX_FILE_SIZE / 1024 / 1024)}MB per image.`,
    };
  }
  return { valid: true };
}

export function validateTotalSize(files: File[]): { valid: boolean; error?: string } {
  const totalSize = files.reduce((sum, f) => sum + f.size, 0);
  if (totalSize > MAX_TOTAL_SIZE) {
    return {
      valid: false,
      error: `Total size exceeds ${Math.round(MAX_TOTAL_SIZE / 1024 / 1024)}MB. Remove some images or use smaller files.`,
    };
  }
  return { valid: true };
}

export async function uploadImage(file: File): Promise<string> {
  const supabase = supabaseBrowser();
  
  // Validate file size
  const sizeCheck = validateFileSize(file);
  if (!sizeCheck.valid) {
    throw new Error(sizeCheck.error);
  }
  
  // Generate a unique filename
  const ext = file.name.split('.').pop();
  const filename = `${Date.now()}-${Math.random().toString(36).substring(2)}.${ext}`;
  
  // Upload the file
  const { data, error } = await supabase
    .storage
    .from(BUCKET_NAME)
    .upload(filename, file, {
      cacheControl: '3600',
      upsert: false
    });

  if (error) throw error;

  // Get the public URL
  const { data: { publicUrl } } = supabase
    .storage
    .from(BUCKET_NAME)
    .getPublicUrl(data.path);

  return publicUrl;
}

export async function deleteImage(url: string): Promise<void> {
  const supabase = supabaseBrowser();
  
  // Extract the filename from the URL
  const filename = url.split('/').pop();
  if (!filename) throw new Error('Invalid image URL');
  
  const { error } = await supabase
    .storage
    .from(BUCKET_NAME)
    .remove([filename]);

  if (error) throw error;
}

export async function getImageUrl(path: string): Promise<string> {
  const supabase = supabaseBrowser();
  
  const { data: { publicUrl } } = supabase
    .storage
    .from(BUCKET_NAME)
    .getPublicUrl(path);

  return publicUrl;
}

export async function uploadComplianceDocument(file: File): Promise<string> {
  const supabase = supabaseBrowser();
  const ext = file.name.split('.').pop();
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext || "dat"}`;
  const { data, error } = await supabase.storage.from(COMPLIANCE_BUCKET).upload(filename, file, {
    cacheControl: "0",
    upsert: false,
  });
  if (error || !data?.path) throw error || new Error("Upload failed");
  return data.path;
}
