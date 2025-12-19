'use client';

import { useEffect, useRef, useState } from 'react';
import { Pencil } from 'lucide-react';
import { isMe } from '@/lib/auth';

export default function EditableBackground({
  displayName,
  backgroundUrl,
  className = '',
  heightClass = 'h-32 md:h-48',
}: {
  displayName: string;
  backgroundUrl?: string | null;
  className?: string;
  heightClass?: string;
}) {
  const [src, setSrc] = useState<string | null>(backgroundUrl || null);
  const [canEdit, setCanEdit] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Update src when backgroundUrl prop changes
  useEffect(() => {
    if (backgroundUrl) {
      setSrc(backgroundUrl);
    }
  }, [backgroundUrl]);

  useEffect(() => {
    const checkMe = async () => {
      const isMine = await isMe(displayName);
      setCanEdit(isMine);
    };
    checkMe();
  }, [displayName]);

  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please choose an image file.');
      e.target.value = '';
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      alert('Image is larger than 12MB. Please choose a smaller image.');
      e.target.value = '';
      return;
    }

    // Upload the file
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', 'background');

    fetch('/api/profile/upload-image', {
      method: 'POST',
      body: formData,
    })
      .then(res => res.json())
      .then(data => {
        if (data.url) {
          setSrc(data.url);
          // Reload page to show updated background
          window.location.reload();
        } else {
          alert('Upload failed: ' + (data.error || 'Unknown error'));
        }
      })
      .catch(err => {
        console.error('Upload error:', err);
        alert('Upload failed. Please try again.');
      });

    e.target.value = '';
  };

  if (!src && !canEdit) {
    return null; // Don't render anything if no background and can't edit
  }

  return (
    <div className={`relative group ${className}`}>
      <div className={`${heightClass} w-full overflow-hidden bg-gradient-to-r from-gray-800 to-gray-600`}>
        {src && (
          // eslint-disable-next-line @next/next/no-img-element
          <img 
            src={src} 
            alt="Profile background" 
            className="site-image w-full h-full object-cover"
          />
        )}
      </div>

      {canEdit && (
        <>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="absolute top-4 right-4 h-10 w-10 rounded-full bg-white/90 backdrop-blur-sm border border-gray-300 shadow-lg flex items-center justify-center text-gray-700 transition opacity-0 group-hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400 focus:opacity-100 hover:bg-white"
            aria-label="Change background image"
            title="Change background image"
          >
            <Pencil className="h-5 w-5" />
          </button>
          <input 
            ref={inputRef}
            type="file" 
            accept="image/jpeg,image/jpg,image/png,image/webp"
            onChange={onPickFile}
            hidden
          />
        </>
      )}
    </div>
  );
}
