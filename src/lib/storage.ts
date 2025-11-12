'use client';

import { supabaseBrowser } from './supabase';

const BUCKET_NAME = 'parts-images';

export async function uploadImage(file: File): Promise<string> {
  const supabase = supabaseBrowser();
  
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